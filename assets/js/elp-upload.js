// blocks/elp-block.js
( function( wp ) {
    var el = wp.element.createElement;
    var Fragment = wp.element.Fragment;
    var __ = wp.i18n.__;
    var registerBlockType = wp.blocks.registerBlockType;
    var MediaUpload = wp.blockEditor.MediaUpload;
    var MediaUploadCheck = wp.blockEditor.MediaUploadCheck;
    var BlockControls = wp.blockEditor.BlockControls;
    var InspectorControls = wp.blockEditor.InspectorControls;
    var Button = wp.components.Button;
    var Placeholder = wp.components.Placeholder;
    var ToolbarGroup = wp.components.ToolbarGroup;
    var ToolbarButton = wp.components.ToolbarButton;
    var ResizableBox = wp.components.ResizableBox;
    var PanelBody = wp.components.PanelBody;
    var RangeControl = wp.components.RangeControl;
    var useState = wp.element.useState;

    registerBlockType( 'exelearning/elp-upload', {
        title: 'eXeLearning',
        icon: 'welcome-learn-more',
        category: 'embed',
        keywords: [ 'exe', 'learning', 'elp', 'elpx', 'scorm' ],
        supports: {
            align: [ 'left', 'center', 'right', 'wide', 'full' ],
            html: false,
        },
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
            align: {
                type: 'string',
                default: 'none',
            },
        },

        edit: function( props ) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;
            var isSelected = props.isSelected;

            function onSelectFile( media ) {
                console.log( '[eXeLearning Block] Media selected:', media );

                if ( ! media || ! media.id ) {
                    console.log( '[eXeLearning Block] No valid media selected' );
                    return;
                }

                // Check if it's an ELPX file by extension or mime type
                var filename = media.filename || media.url || '';
                var isElpFile = filename.toLowerCase().endsWith( '.elpx' ) ||
                                media.mime === 'application/zip' ||
                                media.subtype === 'zip' ||
                                ( media.exelearning && media.exelearning.version );

                console.log( '[eXeLearning Block] Is ELP file:', isElpFile, 'filename:', filename );

                if ( isElpFile ) {
                    var exeData = media.exelearning || {};
                    console.log( '[eXeLearning Block] Setting attributes with exeData:', exeData );
                    setAttributes({
                        attachmentId: media.id,
                        url: media.url,
                        previewUrl: exeData.preview_url || '',
                        title: media.title || media.filename || __( 'eXeLearning Content', 'exelearning' ),
                        hasPreview: exeData.has_preview || false,
                    });
                } else {
                    console.log( '[eXeLearning Block] File is not an ELP file. mime:', media.mime, 'type:', media.type );
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

            function onEditInExeLearning() {
                if ( attributes.attachmentId && window.ExeLearningEditor ) {
                    window.ExeLearningEditor.open( attributes.attachmentId );
                }
            }

            // If no file selected, show placeholder
            if ( ! attributes.attachmentId ) {
                return el( MediaUploadCheck, null,
                    el( MediaUpload, {
                        onSelect: onSelectFile,
                        allowedTypes: [ 'application/zip', 'application/x-exe-learning' ],
                        value: attributes.attachmentId,
                        render: function( obj ) {
                            return el( Placeholder, {
                                    icon: 'media-default',
                                    label: __( 'eXeLearning Content', 'exelearning' ),
                                    instructions: __( 'Upload or select a .elpx file from your media library', 'exelearning' ),
                                    className: 'exelearning-upload-placeholder'
                                },
                                el( 'div', { className: 'components-placeholder__controls' },
                                    el( Button, {
                                        isPrimary: true,
                                        onClick: obj.open
                                    }, __( 'Upload .elpx File', 'exelearning' ) ),
                                    el( Button, {
                                        isSecondary: true,
                                        onClick: obj.open,
                                        style: { marginLeft: '10px' }
                                    }, __( 'Media Library', 'exelearning' ) )
                                )
                            );
                        }
                    })
                );
            }

            // File is selected - show preview or info
            return el( Fragment, null,
                // Inspector Controls (sidebar)
                el( InspectorControls, null,
                    el( PanelBody, { title: __( 'Settings', 'exelearning' ), initialOpen: true },
                        el( RangeControl, {
                            label: __( 'Height (px)', 'exelearning' ),
                            value: attributes.height,
                            onChange: function( value ) {
                                setAttributes( { height: value } );
                            },
                            min: 200,
                            max: 1200,
                            step: 10,
                        }),
                        el( Button, {
                            isPrimary: true,
                            onClick: onEditInExeLearning,
                            style: { marginTop: '10px', width: '100%', justifyContent: 'center' }
                        }, __( 'Edit in eXeLearning', 'exelearning' ) )
                    )
                ),
                // Block Controls (toolbar)
                el( BlockControls, null,
                    el( ToolbarGroup, null,
                        el( ToolbarButton, {
                            icon: 'edit',
                            label: __( 'Edit in eXeLearning', 'exelearning' ),
                            onClick: onEditInExeLearning
                        }),
                        el( MediaUpload, {
                            onSelect: onSelectFile,
                            allowedTypes: [ 'application/zip', 'application/x-exe-learning' ],
                            value: attributes.attachmentId,
                            render: function( obj ) {
                                return el( ToolbarButton, {
                                    icon: 'update',
                                    label: __( 'Change file', 'exelearning' ),
                                    onClick: obj.open
                                });
                            }
                        }),
                        el( ToolbarButton, {
                            icon: 'trash',
                            label: __( 'Remove', 'exelearning' ),
                            onClick: onRemoveFile
                        })
                    )
                ),
                el( 'div', { className: 'exelearning-block-preview' },
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
                            el( 'div', { style: { position: 'relative', width: '100%', height: '100%' } },
                                el( 'iframe', {
                                    src: attributes.previewUrl,
                                    style: {
                                        width: '100%',
                                        height: '100%',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        background: '#fff',
                                    },
                                    title: attributes.title || __( 'eXeLearning Content', 'exelearning' ),
                                }),
                                ! isSelected && el( 'div', {
                                    style: {
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        cursor: 'pointer',
                                    },
                                })
                            )
                        )
                        : el( 'div', {
                            style: {
                                padding: '40px 20px',
                                background: '#fff3cd',
                                border: '1px solid #ffc107',
                                borderRadius: '4px',
                                textAlign: 'center',
                            }
                        },
                            el( 'p', { style: { margin: '0 0 10px', fontWeight: '600' } }, __( 'No preview available', 'exelearning' ) ),
                            el( 'p', { style: { margin: '0', fontSize: '13px', color: '#666' } },
                                __( 'This is an eXeLearning v2 source file. The content will be displayed on the frontend if exported HTML is available.', 'exelearning' )
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
