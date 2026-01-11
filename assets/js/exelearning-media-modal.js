jQuery( document ).ready( function( $ ) {

    // Función para reemplazar el thumbnail con un iframe de previsualización
    function replaceElpThumbnail() {
        $( '.attachment-preview.type-application' ).each( function() {
            var $preview = $( this );
            var $thumbnail = $preview.find( '.thumbnail' );

            // Verificar si ya fue procesado
            if ( $thumbnail.hasClass( 'exelearning-preview-added' ) || $thumbnail.hasClass( 'exelearning-no-preview' ) ) {
                return;
            }

            // Buscar el modelo del attachment
            var attachmentId = $preview.closest( '.attachment' ).data( 'id' );
            if ( ! attachmentId ) {
                return;
            }

            var attachment = wp.media.attachment( attachmentId );
            if ( ! attachment || ! attachment.get( 'exelearning' ) ) {
                return;
            }

            var metadata = attachment.get( 'exelearning' );

            // Check if this file has a preview (version 3 files with index.html)
            if ( ! metadata.has_preview || ! metadata.preview_url ) {
                // Mark as processed but show version info instead
                $thumbnail.addClass( 'exelearning-no-preview' );
                var versionText = metadata.version === 2 ? 'v2 (source)' : 'v' + metadata.version;
                $thumbnail.find( '.centered' ).after(
                    '<div class="exelearning-version-badge" style="position: absolute; bottom: 5px; left: 5px; background: #0073aa; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 10px;">' +
                    'eXe ' + versionText +
                    '</div>'
                );
                return;
            }

            // Marcar como procesado
            $thumbnail.addClass( 'exelearning-preview-added' );

            // Reemplazar el contenido del thumbnail con un iframe escalado (zoom out)
            // 4:3 aspect ratio screenshot-like thumbnail
            var thumbW = 120;
            var thumbH = 90;
            var iframeW = 1200;
            var iframeH = 900;
            var thumbScale = thumbW / iframeW;

            $thumbnail.css({
                'overflow': 'hidden',
                'position': 'relative',
                'width': thumbW + 'px',
                'height': thumbH + 'px',
                'max-width': thumbW + 'px',
                'max-height': thumbH + 'px'
            }).html(
                '<iframe src="' + metadata.preview_url + '" ' +
                'style="' +
                    'width: ' + iframeW + 'px; ' +
                    'height: ' + iframeH + 'px; ' +
                    'border: none; ' +
                    'pointer-events: none; ' +
                    'transform: scale(' + thumbScale + '); ' +
                    'transform-origin: 0 0;" ' +
                'scrolling="no"></iframe>'
            );
        });
    }

    // Función para añadir previsualización en el panel de detalles del attachment
    function addElpPreviewToDetails() {
        var $detailsThumbnail = $( '.attachment-details .thumbnail' );

        if ( $detailsThumbnail.length === 0 ) {
            return;
        }

        // Verificar si ya fue procesado
        if ( $detailsThumbnail.hasClass( 'exelearning-details-preview-added' ) || $detailsThumbnail.hasClass( 'exelearning-details-no-preview' ) ) {
            return;
        }

        // Obtener el attachment actual
        var selection = wp.media.frame && wp.media.frame.state() && wp.media.frame.state().get( 'selection' );
        if ( ! selection ) {
            return;
        }

        var attachment = selection.first();
        if ( ! attachment || ! attachment.get( 'exelearning' ) ) {
            return;
        }

        var metadata = attachment.get( 'exelearning' );

        // Build metadata HTML
        var metaHtml = '';
        if ( metadata.license || metadata.language || metadata.resource_type || metadata.version ) {
            metaHtml = '<div class="exelearning-metadata" style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">';
            metaHtml += '<strong style="display: block; margin-bottom: 5px;">eXeLearning Info</strong>';
            if ( metadata.version ) {
                metaHtml += '<div><small>Version: ' + metadata.version + ( metadata.version === 2 ? ' (source file)' : ' (exported)' ) + '</small></div>';
            }
            if ( metadata.license ) {
                metaHtml += '<div><small>License: ' + metadata.license + '</small></div>';
            }
            if ( metadata.language ) {
                metaHtml += '<div><small>Language: ' + metadata.language + '</small></div>';
            }
            if ( metadata.resource_type ) {
                metaHtml += '<div><small>Type: ' + metadata.resource_type + '</small></div>';
            }
            metaHtml += '</div>';
        }

        // Check if this file has a preview
        if ( ! metadata.has_preview || ! metadata.preview_url ) {
            // Mark as processed but show info message instead
            $detailsThumbnail.addClass( 'exelearning-details-no-preview' );
            $detailsThumbnail.after(
                '<div class="exelearning-no-preview-notice" style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; font-size: 12px;">' +
                '<strong>No preview available</strong><br>' +
                'This is an eXeLearning v2 source file (.elp). To view the content, open it in eXeLearning and export it as HTML.' +
                '</div>' + metaHtml
            );

            // Still add the edit button for v2 files
            addEditButton( attachment, $detailsThumbnail );
            return;
        }

        // Marcar como procesado
        $detailsThumbnail.addClass( 'exelearning-details-preview-added' );

        // Reemplazar la imagen con un iframe escalado (zoom out)
        // Container holds the scaled iframe - shows a 1200px wide page scaled to fit
        var containerWidth = 280;
        var containerHeight = 200;
        var iframeWidth = 1200;
        var iframeHeight = 800;
        var scale = containerWidth / iframeWidth;

        // Set fixed height on thumbnail container to prevent overflow
        $detailsThumbnail.css({
            'height': containerHeight + 'px',
            'max-height': containerHeight + 'px',
            'overflow': 'hidden',
            'margin-bottom': '15px'
        });

        $detailsThumbnail.html(
            '<div class="exelearning-preview-container" style="' +
                'width: ' + containerWidth + 'px; ' +
                'height: ' + containerHeight + 'px; ' +
                'overflow: hidden; ' +
                'border: 1px solid #ddd; ' +
                'border-radius: 4px; ' +
                'background: #f5f5f5; ' +
                'position: relative;">' +
                '<iframe src="' + metadata.preview_url + '" ' +
                    'style="' +
                        'width: ' + iframeWidth + 'px; ' +
                        'height: ' + iframeHeight + 'px; ' +
                        'border: none; ' +
                        'transform: scale(' + scale + '); ' +
                        'transform-origin: 0 0; ' +
                        'pointer-events: none;" ' +
                    'scrolling="no"></iframe>' +
            '</div>'
        );

        // Build and insert elements in correct order after thumbnail
        // Order: Preview → Edit button → Preview in new tab → Metadata
        var $insertPoint = $detailsThumbnail;

        // Add "Edit in eXeLearning" button if user can edit
        addEditButton( attachment, $insertPoint );

        // Add "Preview in new tab" link after the edit button
        var $previewLink = $(
            '<div class="exelearning-preview-link" style="margin-top: 10px;">' +
                '<a href="' + metadata.preview_url + '" target="_blank" class="button" style="width: 100%; text-align: center;">' +
                'Preview in new tab</a>' +
            '</div>'
        );
        // Find the edit button in the parent container and insert after it
        var $editBtn = $detailsThumbnail.parent().find( '.exelearning-edit-button' );
        if ( $editBtn.length > 0 ) {
            $editBtn.after( $previewLink );
            $insertPoint = $previewLink;
        } else {
            $insertPoint.after( $previewLink );
            $insertPoint = $previewLink;
        }

        // Añadir metadatos at the end (after buttons)
        if ( metaHtml ) {
            var $meta = $( metaHtml );
            $insertPoint.after( $meta );
        }
    }

    // Function to add "Edit in eXeLearning" button
    function addEditButton( attachment, $container ) {
        // Check if editing is available
        if ( ! attachment.get( 'exelearningCanEdit' ) ) {
            return;
        }

        // Check if button already exists
        if ( $container.siblings( '.exelearning-edit-button' ).length > 0 ) {
            return;
        }

        var editUrl = attachment.get( 'exelearningEditUrl' );
        var attachmentId = attachment.get( 'id' );

        var $editButton = $( '<button type="button" class="button button-primary exelearning-edit-button" style="margin-top: 10px; width: 100%;">' +
            '<span class="dashicons dashicons-edit" style="vertical-align: middle; margin-right: 5px;"></span>' +
            'Edit in eXeLearning</button>' );

        $editButton.on( 'click', function( e ) {
            e.preventDefault();

            // Use the ExeLearningEditor modal if available
            if ( window.ExeLearningEditor && typeof window.ExeLearningEditor.open === 'function' ) {
                window.ExeLearningEditor.open( attachmentId, editUrl );
            } else {
                // Fallback: open in new window
                window.open( editUrl, '_blank', 'width=1200,height=800' );
            }
        });

        // Insert after the container passed to this function
        $container.after( $editButton );
    }

    // Function to add "Edit in eXeLearning" button to the two-column attachment details view
    function addEditButtonToAttachmentInfo() {
        var $attachmentInfo = $( '.attachment-info' );

        if ( $attachmentInfo.length === 0 ) {
            return;
        }

        // Check if button already exists
        if ( $attachmentInfo.find( '.exelearning-edit-button-actions' ).length > 0 ) {
            return;
        }

        // Get the attachment ID from multiple sources
        var attachmentId = null;

        // Try to get from the attachment details wrapper
        var $wrapper = $attachmentInfo.closest( '.attachment-details' );
        if ( $wrapper.length > 0 && $wrapper.data( 'id' ) ) {
            attachmentId = $wrapper.data( 'id' );
        }

        // Try to get from URL parameter 'item' (grid view selection)
        if ( ! attachmentId ) {
            var urlParams = new URLSearchParams( window.location.search );
            attachmentId = urlParams.get( 'item' );
        }

        // Try to get from URL parameter 'post' (edit attachment page)
        if ( ! attachmentId ) {
            var urlParams = new URLSearchParams( window.location.search );
            attachmentId = urlParams.get( 'post' );
        }

        // Try to get from the "edit more details" link href
        if ( ! attachmentId ) {
            var $editLink = $attachmentInfo.find( 'a[href*="post.php?post="]' );
            if ( $editLink.length > 0 ) {
                var match = $editLink.attr( 'href' ).match( /post=(\d+)/ );
                if ( match ) {
                    attachmentId = match[1];
                }
            }
        }

        // Try to get from the "view attachment" link href
        if ( ! attachmentId ) {
            var $viewLink = $attachmentInfo.find( 'a[href*="attachment_id="]' );
            if ( $viewLink.length > 0 ) {
                var match = $viewLink.attr( 'href' ).match( /attachment_id=(\d+)/ );
                if ( match ) {
                    attachmentId = match[1];
                }
            }
        }

        // Try to get from the media frame selection
        if ( ! attachmentId && wp.media && wp.media.frame ) {
            var state = wp.media.frame.state();
            if ( state ) {
                var selection = state.get( 'selection' );
                if ( selection && selection.first() ) {
                    attachmentId = selection.first().get( 'id' );
                }
            }
        }

        if ( ! attachmentId ) {
            return;
        }

        // Convert to integer
        attachmentId = parseInt( attachmentId, 10 );

        // Fetch attachment data
        var attachment = wp.media.attachment( attachmentId );

        // Wait for the attachment to be fetched if needed
        if ( ! attachment.get( 'id' ) ) {
            attachment.fetch().done( function() {
                insertEditButtonInActions( attachment, $attachmentInfo );
            });
        } else {
            insertEditButtonInActions( attachment, $attachmentInfo );
        }
    }

    // Helper function to insert the edit button into the actions div
    function insertEditButtonInActions( attachment, $attachmentInfo ) {
        // Check if this is an eXeLearning file
        if ( ! attachment.get( 'exelearningCanEdit' ) ) {
            return;
        }

        // Check if button already exists
        if ( $attachmentInfo.find( '.exelearning-edit-button-actions' ).length > 0 ) {
            return;
        }

        var editUrl = attachment.get( 'exelearningEditUrl' );
        var attachmentId = attachment.get( 'id' );

        // Find the actions div
        var $actions = $attachmentInfo.find( '.actions' );
        if ( $actions.length === 0 ) {
            return;
        }

        // Create the edit button - styled prominently
        var $editButton = $(
            '<a href="' + editUrl + '" class="button button-primary exelearning-edit-button-actions" ' +
            'style="display: inline-block; margin-bottom: 10px; padding: 6px 12px; font-size: 13px;">' +
            '<span class="dashicons dashicons-edit" style="vertical-align: text-top; margin-right: 4px; font-size: 16px;"></span>' +
            'Edit in eXeLearning</a>' +
            '<br>'
        );

        $editButton.on( 'click', function( e ) {
            e.preventDefault();

            // Use the ExeLearningEditor modal if available
            if ( window.ExeLearningEditor && typeof window.ExeLearningEditor.open === 'function' ) {
                window.ExeLearningEditor.open( attachmentId, editUrl );
            } else {
                // Fallback: open in new window
                window.open( editUrl, '_blank', 'width=1200,height=800' );
            }
        });

        // Insert at the beginning of the actions div
        $actions.prepend( $editButton );
    }

    // Observar cambios en el DOM para detectar cuando se abren modales
    var observer = new MutationObserver( function( mutations ) {
        replaceElpThumbnail();
        addElpPreviewToDetails();
        addEditButtonToAttachmentInfo();
    });

    observer.observe( document.body, {
        childList: true,
        subtree: true
    });

    // Ejecutar también cuando el modal se abre
    if ( wp.media ) {
        wp.media.view.Modal.prototype.on( 'open', function() {
            setTimeout( function() {
                replaceElpThumbnail();
                addElpPreviewToDetails();
                addEditButtonToAttachmentInfo();
            }, 100 );
        });
    }

    // Run on page load for the attachment edit page (upload.php with item parameter)
    setTimeout( function() {
        addEditButtonToAttachmentInfo();
    }, 500 );
});
