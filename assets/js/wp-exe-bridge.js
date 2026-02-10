/**
 * Lightweight bridge for WordPress embedded editor page.
 *
 * The parent modal orchestrates all OPEN_FILE / REQUEST_EXPORT / EXPORT_FILE
 * protocol calls. This script only reports readiness and keyboard shortcuts.
 *
 * @package Exelearning
 */
( function() {
	'use strict';

	const config = window.__WP_EXE_CONFIG__ || {};
	const targetOrigin = window.__EXE_EMBEDDING_CONFIG__?.parentOrigin || '*';

	function notifyParent( type, data ) {
		if ( window.parent && window.parent !== window ) {
			window.parent.postMessage(
				{
					source: 'wp-exe-editor',
					type,
					data: data || {},
				},
				targetOrigin
			);
		}
	}

	async function init() {
		try {
			if ( window.eXeLearning?.ready ) {
				await window.eXeLearning.ready;
			}

			notifyParent( 'editor-ready', {
				attachmentId: config.attachmentId || null,
			} );

			document.addEventListener( 'keydown', ( event ) => {
				if ( ( event.ctrlKey || event.metaKey ) && event.key === 's' ) {
					event.preventDefault();
					notifyParent( 'request-save' );
				}
			} );
		} catch ( error ) {
			console.error( '[WP-EXE Bridge] Initialization failed:', error );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

	window.wpExeBridge = {
		config,
		requestSave() {
			notifyParent( 'request-save' );
		},
	};
} )();
