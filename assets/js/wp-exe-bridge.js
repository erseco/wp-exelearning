/**
 * WordPress-eXeLearning Bridge
 *
 * Connects the static eXeLearning editor with WordPress for:
 * - Loading ELP files from WordPress Media Library
 * - Saving edited ELP files back to WordPress
 * - Communication between iframe and parent window
 *
 * @package Exelearning
 */
( function() {
	'use strict';

	const config = window.__WP_EXE_CONFIG__;
	if ( ! config ) {
		console.error( '[WP-EXE Bridge] Configuration not found' );
		return;
	}

	console.log( '[WP-EXE Bridge] Initializing with config:', config );

	/**
	 * Wait for the eXeLearning app to be ready (legacy fallback)
	 *
	 * @param {number} maxAttempts Maximum attempts before giving up
	 * @return {Promise} Resolves with the app instance
	 */
	function waitForAppLegacy( maxAttempts = 100 ) {
		return new Promise( ( resolve, reject ) => {
			let attempts = 0;
			const check = () => {
				attempts++;
				if ( window.eXeLearning && window.eXeLearning.app ) {
					resolve( window.eXeLearning.app );
				} else if ( attempts < maxAttempts ) {
					setTimeout( check, 100 );
				} else {
					reject( new Error( 'App did not initialize' ) );
				}
			};
			check();
		} );
	}

	/**
	 * Show or update the loading screen
	 *
	 * @param {string} message Message to display
	 * @param {boolean} show Whether to show or hide
	 */
	function updateLoadScreen( message, show = true ) {
		const loadScreen = document.getElementById( 'load-screen-main' );
		const loadMessage = loadScreen?.querySelector( '.loading-message, p' );

		if ( loadScreen ) {
			if ( show ) {
				loadScreen.classList.remove( 'hide' );
			} else {
				loadScreen.classList.add( 'hide' );
			}
		}

		if ( loadMessage && message ) {
			loadMessage.textContent = message;
		}
	}

	/**
	 * Import ELP file from WordPress
	 */
	async function importElpFromWordPress() {
		const elpUrl = config.elpUrl;
		if ( ! elpUrl ) {
			console.log( '[WP-EXE Bridge] No ELP URL provided, starting with empty project' );
			return;
		}

		console.log( '[WP-EXE Bridge] Starting import from:', elpUrl );

		try {
			updateLoadScreen( 'Loading project from WordPress...' );

			// Fetch the ELP file
			updateLoadScreen( 'Downloading file...' );
			const response = await fetch( elpUrl );
			if ( ! response.ok ) {
				throw new Error( `HTTP ${ response.status }: ${ response.statusText }` );
			}

			// Convert to File object
			const blob = await response.blob();
			console.log( '[WP-EXE Bridge] File downloaded, size:', blob.size );
			const filename = elpUrl.split( '/' ).pop().split( '?' )[ 0 ] || 'project.elp';
			const file = new File( [ blob ], filename, { type: 'application/zip' } );

			// Import using the new API (importElpxFile) or legacy bridge
			updateLoadScreen( 'Importing content...' );
			const app = window.eXeLearning?.app;
			if ( app?.project?.importElpxFile ) {
				console.log( '[WP-EXE Bridge] Using app.project.importElpxFile...' );
				await app.project.importElpxFile( file );
			} else {
				// Legacy fallback: use YjsProjectBridge directly
				console.log( '[WP-EXE Bridge] Using legacy bridge.importFromElpx...' );
				const bridge = window.YjsModules?.getBridge?.()
					|| app?.project?.bridge;
				if ( ! bridge ) {
					throw new Error( 'Project bridge not available' );
				}
				await bridge.importFromElpx( file, {
					clearExisting: true,
					onProgress: ( progress ) => {
						updateLoadScreen( progress.message || `Importing... ${ progress.percent }%` );
					},
				} );
			}

			console.log( '[WP-EXE Bridge] ELP imported successfully' );
		} catch ( error ) {
			console.error( '[WP-EXE Bridge] Import failed:', error );
			updateLoadScreen( 'Error loading project' );
			// eslint-disable-next-line no-alert
			alert( 'Error loading project: ' + error.message );
		} finally {
			setTimeout( () => {
				updateLoadScreen( '', false );
			}, 500 );
		}
	}

	/**
	 * Save project to WordPress
	 */
	async function saveToWordPress() {
		// Notify parent window that save is starting
		if ( window.parent !== window ) {
			window.parent.postMessage( { type: 'exelearning-save-start' }, '*' );
		}

		try {
			console.log( '[WP-EXE Bridge] Starting save...' );

			// Export using new API (quickExport) or legacy SharedExporters
			let blob;
			if ( window.SharedExporters?.quickExport ) {
				console.log( '[WP-EXE Bridge] Using SharedExporters.quickExport...' );
				const result = await window.SharedExporters.quickExport( 'elpx' );
				if ( ! result.success || ! result.data ) {
					throw new Error( 'Export failed' );
				}
				blob = new Blob( [ result.data ], { type: 'application/zip' } );
			} else if ( window.SharedExporters?.createExporter ) {
				// Legacy fallback: use createExporter
				console.log( '[WP-EXE Bridge] Using SharedExporters.createExporter...' );
				const bridge = window.YjsModules?.getBridge?.()
					|| window.eXeLearning?.app?.project?.bridge;
				if ( ! bridge ) {
					throw new Error( 'Project bridge not available' );
				}
				const exporter = window.SharedExporters.createExporter(
					'elpx',
					bridge.documentManager,
					bridge.assetCache,
					bridge.resourceFetcher,
					bridge.assetManager
				);
				const result = await exporter.export();
				if ( ! result.success || ! result.data ) {
					throw new Error( 'Export failed' );
				}
				blob = new Blob( [ result.data ], { type: 'application/zip' } );
			} else {
				throw new Error( 'No exporter available' );
			}

			console.log( '[WP-EXE Bridge] Export complete, size:', blob.size );

			// Upload to WordPress
			const formData = new FormData();
			formData.append( 'file', blob, 'project.elpx' );

			const endpoint = config.attachmentId
				? config.restUrl + '/save/' + config.attachmentId
				: config.restUrl + '/create';

			console.log( '[WP-EXE Bridge] Uploading to:', endpoint );

			const response = await fetch( endpoint, {
				method: 'POST',
				headers: { 'X-WP-Nonce': config.nonce },
				body: formData,
			} );

			const result = await response.json();

			if ( result.success ) {
				console.log( '[WP-EXE Bridge] Save successful' );
				showNotification( 'success', 'Saved successfully!' );

				// Update attachment ID if this was a new file
				if ( result.attachmentId && ! config.attachmentId ) {
					config.attachmentId = result.attachmentId;
				}

				// Notify parent window to refresh the preview
				if ( window.parent !== window ) {
					window.parent.postMessage(
						{
							type: 'exelearning-save-complete',
							attachmentId: config.attachmentId,
							previewUrl: result.preview_url,
						},
						'*'
					);
				}
			} else {
				throw new Error( result.message || 'Save failed' );
			}
		} catch ( error ) {
			console.error( '[WP-EXE Bridge] Save failed:', error );
			showNotification( 'error', 'Error saving: ' + error.message );

			// Notify parent window that save failed
			if ( window.parent !== window ) {
				window.parent.postMessage( { type: 'exelearning-save-error', message: error.message }, '*' );
			}
		}
	}

	/**
	 * Show notification to user
	 *
	 * @param {string} type Type of notification (success, error)
	 * @param {string} message Message to display
	 */
	function showNotification( type, message ) {
		const existing = document.getElementById( 'wp-exe-notification' );
		if ( existing ) {
			existing.remove();
		}

		const notification = document.createElement( 'div' );
		notification.id = 'wp-exe-notification';
		notification.className = `wp-exe-notification wp-exe-notification--${ type }`;
		notification.textContent = message;
		document.body.appendChild( notification );

		setTimeout( () => {
			notification.classList.add( 'wp-exe-notification--fade' );
			setTimeout( () => notification.remove(), 300 );
		}, 3000 );
	}

	/**
	 * Initialize the bridge
	 */
	async function init() {
		try {
			console.log( '[WP-EXE Bridge] Starting initialization...' );

			// Wait for app initialization using the new ready promise or legacy polling
			if ( window.eXeLearning?.ready ) {
				await window.eXeLearning.ready;
			} else {
				await waitForAppLegacy();
			}
			console.log( '[WP-EXE Bridge] App initialized' );

			// Import ELP if URL provided
			if ( config.elpUrl ) {
				await importElpFromWordPress();
			} else {
				console.log( '[WP-EXE Bridge] No elpUrl in config, skipping import' );
			}

			// Notify parent window that bridge is ready
			if ( window.parent !== window ) {
				window.parent.postMessage( { type: 'exelearning-bridge-ready' }, '*' );
			}

			// Listen for save shortcuts (Ctrl+S / Cmd+S)
			document.addEventListener( 'keydown', ( e ) => {
				if ( ( e.ctrlKey || e.metaKey ) && e.key === 's' ) {
					e.preventDefault();
					saveToWordPress();
				}
			} );

			// Listen for messages from parent window
			window.addEventListener( 'message', ( event ) => {
				if ( event.data?.type === 'exelearning-request-save' ) {
					saveToWordPress();
				}
			} );

			console.log( '[WP-EXE Bridge] Initialization complete' );
		} catch ( error ) {
			console.error( '[WP-EXE Bridge] Initialization failed:', error );
		}
	}

	// Initialize when DOM is ready
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

	// Expose for debugging
	window.wpExeBridge = {
		config,
		save: saveToWordPress,
		import: importElpFromWordPress,
	};
} )();
