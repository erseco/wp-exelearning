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

            // Reemplazar el contenido del thumbnail con un iframe
            $thumbnail.html(
                '<iframe src="' + metadata.preview_url + '" ' +
                'style="width: 100%; height: 100%; border: none; pointer-events: none;" ' +
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
            return;
        }

        // Marcar como procesado
        $detailsThumbnail.addClass( 'exelearning-details-preview-added' );

        // Reemplazar la imagen con un iframe
        $detailsThumbnail.html(
            '<iframe src="' + metadata.preview_url + '" ' +
            'style="width: 100%; height: 300px; border: 1px solid #ddd; border-radius: 4px;"></iframe>' +
            '<div class="exelearning-preview-actions" style="margin-top: 10px;">' +
            '<a href="' + metadata.preview_url + '" target="_blank" class="button">' +
            'Open in new tab</a></div>'
        );

        // Añadir metadatos
        if ( metaHtml ) {
            $detailsThumbnail.after( metaHtml );
        }
    }

    // Observar cambios en el DOM para detectar cuando se abren modales
    var observer = new MutationObserver( function( mutations ) {
        replaceElpThumbnail();
        addElpPreviewToDetails();
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
            }, 100 );
        });
    }
});
