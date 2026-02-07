/**
 * eXeLearning Editor Handler
 *
 * Opens the editor page in a modal or new window for editing .elp files.
 */
( function( $ ) {
    'use strict';

    var ExeLearningEditor = {
        modal: null,
        iframe: null,
        saveBtn: null,
        currentAttachmentId: null,
        isOpen: false,
        isSaving: false,

        /**
         * Initialize the editor.
         */
        init: function() {
            this.modal = $( '#exelearning-editor-modal' );
            this.iframe = $( '#exelearning-editor-iframe' );
            this.saveBtn = $( '#exelearning-editor-save' );
            this.bindEvents();
        },

        /**
         * Bind event handlers.
         */
        bindEvents: function() {
            var self = this;

            // Save button in modal header.
            $( '#exelearning-editor-save' ).on( 'click', function() {
                self.requestSave();
            });

            // Close button in modal.
            $( '#exelearning-editor-close' ).on( 'click', function() {
                self.close();
            });

            // Listen for messages from iframe/popup.
            window.addEventListener( 'message', function( event ) {
                self.handleMessage( event );
            });

            // Escape key to close.
            $( document ).on( 'keydown', function( e ) {
                if ( e.key === 'Escape' && self.isOpen ) {
                    self.close();
                }
            });
        },

        /**
         * Request save from the iframe.
         */
        requestSave: function() {
            if ( this.isSaving || ! this.iframe.length ) {
                return;
            }

            var iframeWindow = this.iframe[0].contentWindow;
            if ( iframeWindow ) {
                // Disable beforeunload to prevent "leave site?" dialog when closing after save.
                try {
                    iframeWindow.onbeforeunload = null;
                    iframeWindow.addEventListener( 'beforeunload', function( e ) {
                        e.stopImmediatePropagation();
                        delete e.returnValue;
                    }, true );
                } catch ( e ) {
                    // Cross-origin access may fail, ignore.
                }

                iframeWindow.postMessage( { type: 'exelearning-request-save' }, '*' );
            }
        },

        /**
         * Set saving state and update button.
         *
         * @param {boolean} saving Whether save is in progress.
         */
        setSavingState: function( saving ) {
            this.isSaving = saving;
            if ( this.saveBtn.length ) {
                this.saveBtn.prop( 'disabled', saving );
                this.saveBtn.text( saving
                    ? ( exelearningEditorVars.i18n?.saving || 'Saving...' )
                    : ( exelearningEditorVars.i18n?.saveToWordPress || 'Save to WordPress' )
                );
            }
        },

        /**
         * Open the editor page.
         *
         * @param {number} attachmentId The attachment ID.
         * @param {string} editUrl The editor URL (optional, ignored - always use fresh nonce).
         */
        open: function( attachmentId, editUrl ) {
            if ( ! attachmentId ) {
                console.error( 'No attachment ID provided' );
                return;
            }

            this.currentAttachmentId = attachmentId;

            // Always build a fresh URL with the current nonce to avoid stale nonce issues.
            // The editUrl parameter is ignored to ensure we use the nonce from page load.
            var freshUrl = exelearningEditorVars.editorPageUrl +
                '&attachment_id=' + attachmentId +
                '&_wpnonce=' + exelearningEditorVars.editorNonce;

            // Try to use modal if available, otherwise open in new window.
            if ( this.modal.length && this.iframe.length ) {
                this.modal.show();
                this.isOpen = true;
                this.iframe.attr( 'src', freshUrl );
                $( 'body' ).addClass( 'exelearning-editor-open' );
            } else {
                // Open in new window.
                window.open( freshUrl, '_blank', 'width=900,height=700' );
            }
        },

        /**
         * Close the editor modal.
         */
        close: function() {
            if ( ! this.isOpen ) {
                return;
            }

            // Hide modal.
            this.modal.hide();
            this.isOpen = false;

            // Clear iframe.
            this.iframe.attr( 'src', 'about:blank' );

            // Remove body class.
            $( 'body' ).removeClass( 'exelearning-editor-open' );

            // Reset state.
            this.currentAttachmentId = null;

            // Refresh media library if open.
            this.refreshMediaLibrary();
        },

        /**
         * Handle messages from iframe/popup.
         *
         * @param {MessageEvent} event The message event.
         */
        handleMessage: function( event ) {
            var data = event.data;

            if ( ! data || ! data.type ) {
                return;
            }

            switch ( data.type ) {
                case 'exelearning-bridge-ready':
                    // Bridge is ready, can enable save button if needed.
                    break;

                case 'exelearning-save-start':
                    this.setSavingState( true );
                    break;

                case 'exelearning-save-complete':
                    this.setSavingState( false );
                    this.onSaveComplete( data );
                    this.close();
                    break;

                case 'exelearning-save-error':
                    this.setSavingState( false );
                    break;

                case 'exelearning-close':
                    this.close();
                    break;
            }
        },

        /**
         * Handle save complete message.
         *
         * @param {object} data The message data.
         */
        onSaveComplete: function( data ) {
            // Refresh the specific attachment to get updated metadata.
            if ( data.attachmentId ) {
                this.refreshAttachment( data.attachmentId, data.previewUrl );
                this.updateBlockPreview( data.attachmentId, data.previewUrl );
            }
            // Refresh media library to show updated content.
            this.refreshMediaLibrary();
        },

        /**
         * Update Gutenberg block preview URL after saving.
         *
         * @param {number} attachmentId The attachment ID.
         * @param {string} previewUrl   The new preview URL.
         */
        updateBlockPreview: function( attachmentId, previewUrl ) {
            if ( ! attachmentId || ! previewUrl || ! wp.data ) {
                return;
            }

            var updated = false;
            var blocks = wp.data.select( 'core/block-editor' ).getBlocks();
            blocks.forEach( function( block ) {
                if (
                    block.name === 'exelearning/elp-upload' &&
                    block.attributes.attachmentId === attachmentId
                ) {
                    wp.data.dispatch( 'core/block-editor' ).updateBlockAttributes(
                        block.clientId,
                        { previewUrl: previewUrl }
                    );
                    updated = true;
                }
            });

            // Auto-save the post so the new previewUrl is persisted.
            // Without this, reloading the page would load the old hash and cause a 404.
            if ( updated && wp.data.select( 'core/editor' ) ) {
                wp.data.dispatch( 'core/editor' ).savePost();
            }

            // Fallback for environments where iframe src navigation fails (e.g. Playground).
            if ( updated && previewUrl ) {
                this.ensurePreviewLoaded( previewUrl );
            }
        },

        /**
         * Ensure preview iframe loaded content after src update.
         *
         * In some environments (e.g. WordPress Playground), iframe navigation via
         * Service Worker may fail silently, resulting in an empty iframe even though
         * fetch() of the same URL works. This detects empty iframes and injects
         * content via srcdoc as a fallback.
         *
         * @param {string} previewUrl The preview URL to load.
         */
        ensurePreviewLoaded: function( previewUrl ) {
            setTimeout( function() {
                var iframes = document.querySelectorAll( '.exelearning-block-preview iframe' );
                iframes.forEach( function( iframe ) {
                    try {
                        var doc = iframe.contentDocument;
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
                    } catch ( e ) {
                        // Cross-origin or other error, ignore.
                    }
                } );
            }, 2000 );
        },

        /**
         * Refresh a specific attachment's data.
         *
         * @param {number} attachmentId The attachment ID.
         * @param {string} previewUrl The new preview URL (optional).
         */
        refreshAttachment: function( attachmentId, previewUrl ) {
            if ( ! wp.media ) {
                return;
            }

            try {
                var attachment = wp.media.attachment( attachmentId );
                if ( attachment && ! attachment.destroyed ) {
                    // Force fetch fresh data from server.
                    attachment.fetch().done( function() {
                        try {
                            // Update preview URL in exelearning metadata if provided.
                            if ( previewUrl ) {
                                var exeData = attachment.get( 'exelearning' ) || {};
                                exeData.preview_url = previewUrl;
                                attachment.set( 'exelearning', exeData, { silent: true } );
                            }

                            // Remove the processed class so preview gets re-rendered.
                            $( '.attachment-details .thumbnail' )
                                .removeClass( 'exelearning-details-preview-added' )
                                .removeClass( 'exelearning-details-no-preview' );

                            // Remove existing preview elements.
                            $( '.exelearning-preview-actions, .exelearning-preview-link, .exelearning-metadata, .exelearning-edit-button' ).remove();

                            // Trigger change event to refresh views (only if not destroyed).
                            if ( attachment && ! attachment.destroyed ) {
                                attachment.trigger( 'change' );
                            }
                        } catch ( e ) {
                            console.warn( 'ExeLearningEditor: Error updating attachment', e );
                        }
                    }).fail( function() {
                        console.warn( 'ExeLearningEditor: Failed to fetch attachment', attachmentId );
                    });
                }
            } catch ( e ) {
                console.warn( 'ExeLearningEditor: Error refreshing attachment', e );
            }
        },

        /**
         * Refresh the media library.
         */
        refreshMediaLibrary: function() {
            if ( wp.media && wp.media.frame ) {
                try {
                    wp.media.frame.content.get().collection.props.set( { ignore: ( + new Date() ) } );
                } catch ( e ) {
                    // Ignore errors if media library structure is different.
                }
            }
        }
    };

    // Initialize on document ready.
    $( document ).ready( function() {
        ExeLearningEditor.init();

        // Expose globally for other scripts to use.
        window.ExeLearningEditor = ExeLearningEditor;
    });

})( jQuery );
