/**
 * eXeLearning Editor Handler
 *
 * Parent-side controller for the embedded editor modal.
 * Uses EmbeddingBridge protocol only.
 */
( function( $ ) {
	'use strict';

	const FORMAT_OPTIONS = [
		{ value: 'elpx', label: 'ELPX (.elpx)' },
		{ value: 'scorm12', label: 'SCORM 1.2 (.zip)' },
		{ value: 'epub3', label: 'EPUB3 (.epub)' },
	];

	const ExeLearningEditor = {
		modal: null,
		iframe: null,
		saveBtn: null,
		formatSelect: null,
		currentAttachmentId: null,
		isOpen: false,
		isSaving: false,
		editorOrigin: '*',
		requestCounter: 0,
		openRequestId: null,
		exportRequestId: null,
		openSent: false,

		init: function() {
			this.modal = $( '#exelearning-editor-modal' );
			this.iframe = $( '#exelearning-editor-iframe' );
			this.saveBtn = $( '#exelearning-editor-save' );
			this.bindEvents();
		},

		insertFormatSelector: function() {
			if ( this.formatSelect ) {
				return;
			}
			const select = document.createElement( 'select' );
			select.id = 'exelearning-editor-format';
			select.className = 'regular-text';
			select.style.maxWidth = '180px';
			select.style.marginRight = '8px';

			FORMAT_OPTIONS.forEach( ( option ) => {
				const element = document.createElement( 'option' );
				element.value = option.value;
				element.textContent = option.label;
				if ( option.value === 'elpx' ) {
					element.selected = true;
				}
				select.appendChild( element );
			} );

			const closeBtn = document.getElementById( 'exelearning-editor-close' );
			if ( closeBtn && closeBtn.parentNode ) {
				closeBtn.parentNode.insertBefore( select, closeBtn );
			}
			this.formatSelect = $( select );
		},

		nextRequestId: function( prefix ) {
			this.requestCounter += 1;
			return `${ prefix }-${ Date.now() }-${ this.requestCounter }`;
		},

		getFormat: function() {
			return 'elpx';
		},

		getEditorOrigin: function() {
			try {
				return new URL( this.iframe.attr( 'src' ), window.location.href ).origin;
			} catch ( e ) {
				return '*';
			}
		},

		postToEditor: function( message ) {
			const iframeWindow = this.iframe[0]?.contentWindow;
			if ( iframeWindow ) {
				iframeWindow.postMessage( message, this.editorOrigin );
			}
		},

		hasInitialProjectBootstrap: function() {
			const iframeWindow = this.iframe[0]?.contentWindow;
			const initialProjectUrl =
				iframeWindow?.__EXE_EMBEDDING_CONFIG__?.initialProjectUrl || '';
			return Boolean( initialProjectUrl );
		},

		bindEvents: function() {
			const self = this;

			$( '#exelearning-editor-save' ).on( 'click', function() {
				self.requestSave();
			} );

			$( '#exelearning-editor-close' ).on( 'click', function() {
				self.close();
			} );

			window.addEventListener( 'message', function( event ) {
				self.handleMessage( event );
			} );

			$( document ).on( 'keydown', function( e ) {
				if ( e.key === 'Escape' && self.isOpen ) {
					self.close();
				}
			} );
		},

		setSavingState: function( saving ) {
			this.isSaving = saving;
			if ( this.saveBtn.length ) {
				this.saveBtn.prop( 'disabled', saving );
				this.saveBtn.text(
					saving
						? ( exelearningEditorVars.i18n?.saving || 'Saving...' )
						: ( exelearningEditorVars.i18n?.saveToWordPress || 'Save to WordPress' )
				);
			}
		},

		open: function( attachmentId ) {
			if ( ! attachmentId ) {
				console.error( 'No attachment ID provided' );
				return;
			}

			this.currentAttachmentId = attachmentId;
			this.openSent = false;
			this.openRequestId = null;
			this.exportRequestId = null;
			this.editorOrigin = '*';

			const freshUrl =
				exelearningEditorVars.editorPageUrl +
				'&attachment_id=' + attachmentId +
				'&_wpnonce=' + exelearningEditorVars.editorNonce;

			if ( this.modal.length && this.iframe.length ) {
				this.modal.show();
				this.isOpen = true;
				this.iframe.attr( 'src', freshUrl );
				this.editorOrigin = this.getEditorOrigin();
				$( 'body' ).addClass( 'exelearning-editor-open' );
				this.saveBtn.prop( 'disabled', true );
			} else {
				window.open( freshUrl, '_blank', 'width=900,height=700' );
			}
		},

		close: function() {
			if ( ! this.isOpen ) {
				return;
			}

			this.modal.hide();
			this.isOpen = false;
			this.iframe.attr( 'src', 'about:blank' );
			$( 'body' ).removeClass( 'exelearning-editor-open' );
			this.currentAttachmentId = null;
			this.openSent = false;
			this.openRequestId = null;
			this.exportRequestId = null;
			this.setSavingState( false );
			this.refreshMediaLibrary();
		},

		openAttachmentInEditor: async function() {
			if ( this.openSent || ! this.currentAttachmentId ) {
				return;
			}
			this.openSent = true;

			try {
				const metaResponse = await fetch(
					`${ exelearningEditorVars.restUrl }/elp-data/${ this.currentAttachmentId }`,
					{
						headers: { 'X-WP-Nonce': exelearningEditorVars.nonce },
						credentials: 'same-origin',
					}
				);
				if ( ! metaResponse.ok ) {
					throw new Error( `Failed to get file metadata (${ metaResponse.status })` );
				}
				const meta = await metaResponse.json();
				if ( ! meta?.url ) {
					throw new Error( 'Missing file URL for attachment' );
				}

				const fileResponse = await fetch( meta.url, { credentials: 'same-origin' } );
				if ( ! fileResponse.ok ) {
					throw new Error( `Failed to download file (${ fileResponse.status })` );
				}

				const bytes = await fileResponse.arrayBuffer();
				this.openRequestId = this.nextRequestId( 'open' );
				this.postToEditor( {
					type: 'OPEN_FILE',
					requestId: this.openRequestId,
					data: {
						bytes,
						filename: meta.filename || 'project.elpx',
					},
				} );
			} catch ( error ) {
				console.error( 'ExeLearningEditor: Failed to open project', error );
				this.openSent = false;
			}
		},

		requestSave: function() {
			if ( this.isSaving || ! this.iframe.length ) {
				return;
			}

			this.setSavingState( true );
			this.exportRequestId = this.nextRequestId( 'export' );
			this.postToEditor( {
				type: 'REQUEST_EXPORT',
				requestId: this.exportRequestId,
				data: {
					format: 'elpx',
					filename: 'project.elpx',
				},
			} );
		},

		handleMessage: async function( event ) {
			const data = event.data;
			const iframeWindow = this.iframe[0]?.contentWindow;

			if ( ! data || ! data.type || ! iframeWindow || event.source !== iframeWindow ) {
				if ( data?.source === 'wp-exe-editor' && data.type === 'request-save' ) {
					this.requestSave();
				}
				return;
			}

			if ( this.editorOrigin !== '*' && event.origin !== this.editorOrigin ) {
				return;
			}

			switch ( data.type ) {
				case 'EXELEARNING_READY':
					this.postToEditor( {
						type: 'CONFIGURE',
						requestId: this.nextRequestId( 'configure' ),
						data: {
							hideUI: {
								fileMenu: true,
								saveButton: true,
								userMenu: true,
							},
						},
					} );
					if ( this.hasInitialProjectBootstrap() ) {
						console.log(
							'ExeLearningEditor: initialProjectUrl bootstrap detected, skipping OPEN_FILE fallback'
						);
					} else {
						this.openAttachmentInEditor();
					}
					break;

				case 'DOCUMENT_LOADED':
					if ( ! this.isSaving ) {
						this.saveBtn.prop( 'disabled', false );
					}
					break;

				case 'OPEN_FILE_SUCCESS':
					if ( data.requestId === this.openRequestId && ! this.isSaving ) {
						this.saveBtn.prop( 'disabled', false );
					}
					break;

				case 'OPEN_FILE_ERROR':
					if ( data.requestId === this.openRequestId ) {
						console.error( 'ExeLearningEditor: OPEN_FILE_ERROR', data.error );
						this.openSent = false;
					}
					break;

				case 'EXPORT_FILE':
					if ( data.requestId === this.exportRequestId ) {
						await this.handleExportFile( data );
					}
					break;

				case 'REQUEST_EXPORT_ERROR':
					if ( data.requestId === this.exportRequestId ) {
						console.error( 'ExeLearningEditor: REQUEST_EXPORT_ERROR', data.error );
						this.setSavingState( false );
					}
					break;
			}
		},

		handleExportFile: async function( payload ) {
			const format = 'elpx';
			const filename = payload.filename || 'project.elpx';
			const mimeType = payload.mimeType || 'application/zip';
			try {
				const blob = new Blob( [ payload.bytes ], { type: mimeType } );
				const formData = new FormData();
				formData.append( 'file', blob, filename );
				formData.append( 'format', format );

				const endpoint = this.currentAttachmentId
					? `${ exelearningEditorVars.restUrl }/save/${ this.currentAttachmentId }`
					: `${ exelearningEditorVars.restUrl }/create`;

				const response = await fetch( endpoint, {
					method: 'POST',
					headers: { 'X-WP-Nonce': exelearningEditorVars.nonce },
					body: formData,
					credentials: 'same-origin',
				} );

				const result = await response.json();
				if ( ! response.ok || ! result?.success ) {
					throw new Error( result?.message || `Save failed (${ response.status })` );
				}

				this.setSavingState( false );
				this.onSaveComplete( {
					attachmentId: result.attachment_id || result.attachmentId || this.currentAttachmentId,
					previewUrl: result.preview_url || result.previewUrl || null,
				} );
				this.close();
			} catch ( error ) {
				console.error( 'ExeLearningEditor: Save failed', error );
				this.setSavingState( false );
			}
		},

		defaultFilenameForFormat: function( format ) {
			if ( format === 'elpx' ) {
				return 'project.elpx';
			}
			if ( format === 'epub3' || format === 'epub' ) {
				return 'project.epub';
			}
			return 'project.zip';
		},

		mimeForFilename: function( filename ) {
			if ( filename.endsWith( '.epub' ) ) {
				return 'application/epub+zip';
			}
			return 'application/zip';
		},

		downloadExport: function( bytes, filename, mimeType ) {
			const blob = new Blob( [ bytes ], { type: mimeType } );
			const url = URL.createObjectURL( blob );
			const link = document.createElement( 'a' );
			link.href = url;
			link.download = filename;
			document.body.appendChild( link );
			link.click();
			document.body.removeChild( link );
			URL.revokeObjectURL( url );
		},

		onSaveComplete: function( data ) {
			if ( data.attachmentId ) {
				this.refreshAttachment( data.attachmentId, data.previewUrl );
				this.updateBlockPreview( data.attachmentId, data.previewUrl );
			}
			this.refreshMediaLibrary();
		},

		updateBlockPreview: function( attachmentId, previewUrl ) {
			if ( ! attachmentId || ! previewUrl || ! wp.data ) {
				return;
			}

			let updated = false;
			const blocks = wp.data.select( 'core/block-editor' ).getBlocks();
			blocks.forEach( ( block ) => {
				if (
					block.name === 'exelearning/elp-upload' &&
					block.attributes.attachmentId === attachmentId
				) {
					wp.data.dispatch( 'core/block-editor' ).updateBlockAttributes(
						block.clientId,
						{ previewUrl }
					);
					updated = true;
				}
			} );

			if ( updated && wp.data.select( 'core/editor' ) ) {
				wp.data.dispatch( 'core/editor' ).savePost();
			}

			if ( updated && previewUrl ) {
				this.ensurePreviewLoaded( previewUrl );
			}
		},

		ensurePreviewLoaded: function( previewUrl ) {
			setTimeout( function() {
				const iframes = document.querySelectorAll( '.exelearning-block-preview iframe' );
				iframes.forEach( function( iframe ) {
					try {
						const doc = iframe.contentDocument;
						if ( ! doc || ! doc.body || doc.body.innerHTML.length === 0 ) {
							fetch( previewUrl, { credentials: 'same-origin' } )
								.then( function( response ) {
									return response.ok ? response.text() : null;
								} )
								.then( function( html ) {
									if ( html && html.length > 0 ) {
										iframe.srcdoc = html;
									}
								} )
								.catch( function() {} );
						}
					} catch ( e ) {}
				} );
			}, 2000 );
		},

		refreshAttachment: function( attachmentId, previewUrl ) {
			if ( ! wp.media ) {
				return;
			}

			try {
				const attachment = wp.media.attachment( attachmentId );
				if ( attachment && ! attachment.destroyed ) {
					attachment.fetch().done( function() {
						try {
							if ( previewUrl ) {
								const exeData = attachment.get( 'exelearning' ) || {};
								exeData.preview_url = previewUrl;
								attachment.set( 'exelearning', exeData, { silent: true } );
							}

							$( '.attachment-details .thumbnail' )
								.removeClass( 'exelearning-details-preview-added' )
								.removeClass( 'exelearning-details-no-preview' );

							$( '.exelearning-preview-actions, .exelearning-preview-link, .exelearning-metadata, .exelearning-edit-button' ).remove();

							if ( attachment && ! attachment.destroyed ) {
								attachment.trigger( 'change' );
							}
						} catch ( e ) {
							console.warn( 'ExeLearningEditor: Error updating attachment', e );
						}
					} ).fail( function() {
						console.warn( 'ExeLearningEditor: Failed to fetch attachment', attachmentId );
					} );
				}
			} catch ( e ) {
				console.warn( 'ExeLearningEditor: Error refreshing attachment', e );
			}
		},

		refreshMediaLibrary: function() {
			if ( wp.media && wp.media.frame ) {
				try {
					wp.media.frame.content.get().collection.props.set( { ignore: + new Date() } );
				} catch ( e ) {}
			}
		},
	};

	$( document ).ready( function() {
		ExeLearningEditor.init();
		window.ExeLearningEditor = ExeLearningEditor;
	} );
} )( jQuery );
