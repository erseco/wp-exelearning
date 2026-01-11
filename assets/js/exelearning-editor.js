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
         * @param {string} editUrl The editor URL (optional).
         */
        open: function( attachmentId, editUrl ) {
            if ( ! attachmentId ) {
                console.error( 'No attachment ID provided' );
                return;
            }

            this.currentAttachmentId = attachmentId;

            // Build editor URL if not provided.
            if ( ! editUrl ) {
                editUrl = exelearningEditorVars.editorPageUrl +
                    '&attachment_id=' + attachmentId +
                    '&_wpnonce=' + exelearningEditorVars.editorNonce;
            }

            // Try to use modal if available, otherwise open in new window.
            if ( this.modal.length && this.iframe.length ) {
                this.modal.show();
                this.isOpen = true;
                this.iframe.attr( 'src', editUrl );
                $( 'body' ).addClass( 'exelearning-editor-open' );
            } else {
                // Open in new window.
                window.open( editUrl, '_blank', 'width=900,height=700' );
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
                    // Close the editor after successful save
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
            // Refresh media library to show updated content.
            this.refreshMediaLibrary();
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
