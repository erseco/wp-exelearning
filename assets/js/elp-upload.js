// blocks/elp-block.js
( function( wp ) {
    var el = wp.element.createElement;
    var Fragment = wp.element.Fragment;
    var registerBlockType = wp.blocks.registerBlockType;
    var MediaUpload = wp.blockEditor.MediaUpload;
    var MediaUploadCheck = wp.blockEditor.MediaUploadCheck;
    var BlockControls = wp.blockEditor.BlockControls;
    var Button = wp.components.Button;
    var Placeholder = wp.components.Placeholder;
    var ToolbarGroup = wp.components.ToolbarGroup;
    var ToolbarButton = wp.components.ToolbarButton;
    var ResizableBox = wp.components.ResizableBox;
    var useState = wp.element.useState;

    registerBlockType( 'exelearning/elp-upload', {
        title: 'eXeLearning',
        icon: 'media-default',
        category: 'media',
        attributes: {
            attachmentId: {
                type: 'number',
            },
            url: {
                type: 'string',
            },
            previewUrl: {
                type: 'string',
            },
            title: {
                type: 'string',
            },
            hasPreview: {
                type: 'boolean',
                default: false,
            },
            height: {
                type: 'number',
                default: 600,
            },
        },

        edit: function( props ) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;
            var isSelected = props.isSelected;

            function onSelectFile( media ) {
                if ( media && media.type === 'application/x-exe-learning' && ( media.filename.endsWith( '.elp' ) || media.filename.endsWith( '.elpx' ) ) ) {
                    var exeData = media.exelearning || {};
                    setAttributes({
                        attachmentId: media.id,
                        url: media.url,
                        previewUrl: exeData.preview_url || '',
                        title: media.title || media.filename,
                        hasPreview: exeData.has_preview || false,
                    });
                }
            }

            function onRemoveFile() {
                setAttributes({
                    attachmentId: undefined,
                    url: undefined,
                    previewUrl: undefined,
                    title: undefined,
                    hasPreview: false,
                });
            }

            // If no file selected, show placeholder
            if ( ! attributes.attachmentId ) {
                return el( MediaUploadCheck, null,
                    el( MediaUpload, {
                        onSelect: onSelectFile,
                        allowedTypes: [ 'application/x-exe-learning' ],
                        value: attributes.attachmentId,
                        render: function( obj ) {
                            return el( Placeholder, {
                                    icon: 'media-default',
                                    label: 'eXeLearning Content',
                                    instructions: 'Upload or select a .elp/.elpx file from your media library',
                                    className: 'exelearning-upload-placeholder'
                                },
                                el( 'div', { className: 'components-placeholder__controls' },
                                    el( Button, {
                                        isPrimary: true,
                                        onClick: obj.open
                                    }, 'Upload .elp/.elpx File' ),
                                    el( Button, {
                                        isSecondary: true,
                                        onClick: obj.open,
                                        style: { marginLeft: '10px' }
                                    }, 'Media Library' )
                                )
                            );
                        }
                    })
                );
            }

            // File is selected - show preview or info
            return el( Fragment, null,
                el( BlockControls, null,
                    el( ToolbarGroup, null,
                        el( MediaUpload, {
                            onSelect: onSelectFile,
                            allowedTypes: [ 'application/x-exe-learning' ],
                            value: attributes.attachmentId,
                            render: function( obj ) {
                                return el( ToolbarButton, {
                                    icon: 'edit',
                                    label: 'Change file',
                                    onClick: obj.open
                                });
                            }
                        }),
                        el( ToolbarButton, {
                            icon: 'trash',
                            label: 'Remove',
                            onClick: onRemoveFile
                        })
                    )
                ),
                el( 'div', { className: 'exelearning-block-preview' },
                    // Header bar
                    el( 'div', {
                        className: 'exelearning-block-header',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 15px',
                            background: '#1e1e1e',
                            color: '#fff',
                            borderRadius: '4px 4px 0 0',
                        }
                    },
                        el( 'div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                            el( 'span', {
                                className: 'dashicons dashicons-media-default',
                                style: { fontSize: '20px' }
                            }),
                            el( 'span', { style: { fontWeight: '600' } }, attributes.title || 'eXeLearning Content' )
                        ),
                        el( 'div', { style: { display: 'flex', gap: '5px' } },
                            el( MediaUpload, {
                                onSelect: onSelectFile,
                                allowedTypes: [ 'application/x-exe-learning' ],
                                value: attributes.attachmentId,
                                render: function( obj ) {
                                    return el( Button, {
                                        isSmall: true,
                                        onClick: obj.open,
                                        style: { color: '#fff' }
                                    }, 'Change' );
                                }
                            }),
                            el( Button, {
                                isSmall: true,
                                isDestructive: true,
                                onClick: onRemoveFile,
                            }, 'Remove' )
                        )
                    ),
                    // Content area
                    attributes.hasPreview && attributes.previewUrl
                        ? el( ResizableBox, {
                            size: { height: attributes.height },
                            minHeight: 200,
                            enable: {
                                top: false,
                                right: false,
                                bottom: true,
                                left: false,
                            },
                            onResizeStop: function( event, direction, elt, delta ) {
                                setAttributes({ height: attributes.height + delta.height });
                            },
                            style: {
                                margin: '0 auto',
                            }
                        },
                            el( 'iframe', {
                                src: attributes.previewUrl,
                                style: {
                                    width: '100%',
                                    height: '100%',
                                    border: '1px solid #ddd',
                                    borderTop: 'none',
                                    borderRadius: '0 0 4px 4px',
                                    background: '#fff',
                                },
                                title: attributes.title || 'eXeLearning Content',
                            })
                        )
                        : el( 'div', {
                            style: {
                                padding: '40px 20px',
                                background: '#fff3cd',
                                border: '1px solid #ffc107',
                                borderTop: 'none',
                                borderRadius: '0 0 4px 4px',
                                textAlign: 'center',
                            }
                        },
                            el( 'p', { style: { margin: '0 0 10px', fontWeight: '600' } }, 'No preview available' ),
                            el( 'p', { style: { margin: '0', fontSize: '13px', color: '#666' } },
                                'This is an eXeLearning v2 source file. The content will be displayed on the frontend if exported HTML is available.'
                            )
                        )
                )
            );
        },

        save: function() {
            // Rendering is handled dynamically on the server.
            return null;
        }
    } );
} )( window.wp );
