/**
 * Mock Parameters Data for eXeLearning WordPress Integration
 *
 * This provides the response for /api/parameter-management/parameters/data/list
 * which is critical for app initialization.
 */

(function() {
    'use strict';

    // Initialize mock data namespace
    window.wpExeMockData = window.wpExeMockData || {};

    // Generate session ID
    const odeSessionId = 'wp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Base path from WordPress config
    const basePath = window.wpExeMockConfig?.basePath || '';

    window.wpExeMockData.parameters = {
        odeSessionId: odeSessionId,
        projectId: window.wpExeMockConfig?.projectId || 'wp-project',

        // Available locales
        locales: [
            { code: 'en', name: 'English', isDefault: true },
            { code: 'es', name: 'Espa\u00f1ol' },
            { code: 'ca', name: 'Catal\u00e0' },
            { code: 'eu', name: 'Euskara' },
            { code: 'gl', name: 'Galego' },
            { code: 'fr', name: 'Fran\u00e7ais' },
            { code: 'de', name: 'Deutsch' },
            { code: 'pt', name: 'Portugu\u00eas' },
            { code: 'it', name: 'Italiano' }
        ],

        // Configuration flags
        config: {
            isOfflineInstallation: true,
            enableCollaborativeEditing: false,
            enableCloudStorage: false,
            enableAutoSave: false,
            autoSaveInterval: 60000,
            maxUploadSize: 104857600,
            supportedExportFormats: ['elp', 'html5', 'scorm12', 'scorm2004', 'epub3', 'ims']
        },

        // iDevice info fields configuration
        ideviceInfoFieldsConfig: {
            showIcon: true,
            showTitle: true,
            showDescription: false
        },

        // Theme info fields configuration (for style manager)
        themeInfoFieldsConfig: {
            title: {
                title: 'Title',
                tag: 'text'
            },
            description: {
                title: 'Description',
                tag: 'textarea'
            },
            version: {
                title: 'Version',
                tag: 'text'
            },
            author: {
                title: 'Authorship',
                tag: 'text'
            },
            authorUrl: {
                title: 'Author URL',
                tag: 'text'
            },
            license: {
                title: 'License',
                tag: 'textarea'
            },
            licenseUrl: {
                title: 'License URL',
                tag: 'textarea'
            }
        },

        // Theme edition fields configuration
        themeEditionFieldsConfig: {
            title: {
                title: 'Title',
                tag: 'text',
                config: 'title',
                category: 'Information'
            },
            description: {
                title: 'Description',
                tag: 'textarea',
                config: 'description',
                category: 'Information'
            },
            version: {
                title: 'Version',
                tag: 'text',
                config: 'version',
                category: 'Information'
            },
            author: {
                title: 'Authorship',
                tag: 'text',
                config: 'author',
                category: 'Information'
            },
            authorUrl: {
                title: 'Author URL',
                tag: 'text',
                config: 'authorUrl',
                category: 'Information'
            },
            license: {
                title: 'License',
                tag: 'textarea',
                config: 'license',
                category: 'Information'
            },
            licenseUrl: {
                title: 'License URL',
                tag: 'text',
                config: 'licenseUrl',
                category: 'Information'
            }
        },

        // Can install themes flag
        canInstallThemes: true,

        // Can install iDevices flag
        canInstallIdevices: true,

        // User preferences configuration
        userPreferencesConfig: {
            advancedMode: {
                title: 'Advanced Mode',
                category: 'interface',
                heritable: false,
                value: 'false',
                type: 'checkbox',
                hide: false
            },
            versionControl: {
                title: 'Version Control',
                category: 'interface',
                heritable: false,
                value: 'inactive',
                type: 'select',
                hide: true
            },
            locale: {
                title: 'Language',
                category: 'interface',
                heritable: false,
                value: 'en',
                type: 'select',
                hide: false
            },
            theme: {
                title: 'Theme',
                category: 'appearance',
                heritable: false,
                value: 'base',
                type: 'select',
                hide: false
            },
            autoSave: {
                title: 'Auto Save',
                category: 'editor',
                heritable: false,
                value: 'false',
                type: 'checkbox',
                hide: true
            }
        },

        // ODE components sync properties configuration
        odeComponentsSyncPropertiesConfig: {
            visibility: { type: 'boolean', default: true },
            teacherOnly: { type: 'boolean', default: false },
            identifier: { type: 'string', default: '' },
            cssClass: { type: 'string', default: '' }
        },

        // ODE project sync properties configuration
        odeProjectSyncPropertiesConfig: {
            properties: {
                pp_title: {
                    title: 'Title',
                    help: 'The name given to the resource.',
                    alwaysVisible: true,
                    type: 'text',
                    category: 'properties',
                    groups: { properties_package: 'Package' },
                    value: ''
                },
                pp_subtitle: {
                    title: 'Subtitle',
                    help: 'Adds additional information to the main title.',
                    alwaysVisible: true,
                    type: 'text',
                    category: 'properties',
                    groups: { properties_package: 'Package' },
                    value: ''
                },
                pp_lang: {
                    title: 'Language',
                    help: 'Select a language.',
                    value: 'en',
                    alwaysVisible: true,
                    type: 'select',
                    options: [
                        { value: 'en', label: 'English' },
                        { value: 'es', label: 'Español' },
                        { value: 'ca', label: 'Català' },
                        { value: 'eu', label: 'Euskara' },
                        { value: 'gl', label: 'Galego' },
                        { value: 'fr', label: 'Français' },
                        { value: 'de', label: 'Deutsch' },
                        { value: 'pt', label: 'Português' },
                        { value: 'it', label: 'Italiano' }
                    ],
                    category: 'properties',
                    groups: { properties_package: 'Package' }
                },
                pp_author: {
                    title: 'Authorship',
                    help: 'Primary author/s of the resource.',
                    alwaysVisible: true,
                    type: 'text',
                    category: 'properties',
                    groups: { properties_package: 'Package' },
                    value: ''
                },
                pp_license: {
                    title: 'License',
                    value: 'creative commons: attribution - share alike 4.0',
                    alwaysVisible: true,
                    type: 'select',
                    options: [
                        { value: 'creative commons: attribution - share alike 4.0', label: 'CC BY-SA 4.0' },
                        { value: 'creative commons: attribution 4.0', label: 'CC BY 4.0' },
                        { value: 'creative commons: attribution - non commercial - share alike 4.0', label: 'CC BY-NC-SA 4.0' },
                        { value: 'creative commons: attribution - non commercial 4.0', label: 'CC BY-NC 4.0' },
                        { value: 'creative commons: attribution - non derivative 4.0', label: 'CC BY-ND 4.0' },
                        { value: 'creative commons: attribution - non commercial - non derivative 4.0', label: 'CC BY-NC-ND 4.0' },
                        { value: 'public domain', label: 'Public Domain' },
                        { value: 'all rights reserved', label: 'All Rights Reserved' },
                        { value: 'other', label: 'Other' }
                    ],
                    category: 'properties',
                    groups: { properties_package: 'Package' }
                },
                pp_description: {
                    title: 'Description',
                    alwaysVisible: true,
                    type: 'textarea',
                    category: 'properties',
                    groups: { properties_package: 'Package' },
                    value: ''
                }
            },
            export: {
                exportSource: {
                    title: 'Editable export',
                    value: 'true',
                    help: 'The exported content will be editable with eXeLearning.',
                    type: 'checkbox',
                    category: 'properties',
                    groups: { export: 'Export' }
                },
                pp_addExeLink: {
                    title: '"Made with eXeLearning" link',
                    value: 'true',
                    help: 'Help us spreading eXeLearning. Checking this option, a "Made with eXeLearning" link will be displayed in your pages.',
                    type: 'checkbox',
                    category: 'properties',
                    groups: { export: 'Export' }
                },
                pp_addPagination: {
                    title: 'Page counter',
                    value: 'false',
                    help: 'A text with the page number will be added on each page.',
                    type: 'checkbox',
                    category: 'properties',
                    groups: { export: 'Export' }
                },
                pp_addSearchBox: {
                    title: 'Search bar (Website export only)',
                    value: 'false',
                    help: 'A search box will be added to every page of the website.',
                    type: 'checkbox',
                    category: 'properties',
                    groups: { export: 'Export' }
                },
                pp_addAccessibilityToolbar: {
                    title: 'Accessibility toolbar',
                    value: 'false',
                    help: 'The accessibility toolbar allows visitors to manipulate some aspects of your site, such as font and text size.',
                    type: 'checkbox',
                    category: 'properties',
                    groups: { export: 'Export' }
                }
            },
            custom_code: {
                pp_extraHeadContent: {
                    title: 'HEAD',
                    help: 'HTML to be included at the end of HEAD: LINK, META, SCRIPT, STYLE...',
                    alwaysVisible: true,
                    type: 'textarea',
                    category: 'properties',
                    groups: { custom_code: 'Custom Code' },
                    value: ''
                },
                footer: {
                    title: 'Page footer',
                    help: 'Type any HTML. It will be placed after every page content. No JavaScript code will be executed inside eXe.',
                    alwaysVisible: true,
                    type: 'textarea',
                    category: 'properties',
                    groups: { custom_code: 'Custom Code' },
                    value: ''
                }
            }
        },

        // ODE project sync cataloguing configuration (empty for WordPress mode)
        odeProjectSyncCataloguingConfig: {},

        // ODE nav structure sync properties configuration
        odeNavStructureSyncPropertiesConfig: {
            titleNode: {
                title: 'Title',
                type: 'text',
                category: 'General',
                heritable: false,
                value: ''
            },
            hidePageTitle: {
                title: 'Hide page title',
                type: 'checkbox',
                category: 'General',
                value: 'false',
                heritable: false
            },
            titleHtml: {
                title: 'Title HTML',
                type: 'text',
                category: 'Advanced (SEO)',
                heritable: false,
                value: ''
            },
            editableInPage: {
                title: 'Different title on the page',
                type: 'checkbox',
                category: 'General',
                value: 'false',
                alwaysVisible: true
            },
            titlePage: {
                title: 'Title in page',
                type: 'text',
                category: 'General',
                heritable: false,
                value: ''
            },
            visibility: {
                title: 'Visible in export',
                value: 'true',
                type: 'checkbox',
                category: 'General',
                heritable: true
            },
            highlight: {
                title: 'Highlight this page in the website navigation menu',
                value: 'false',
                type: 'checkbox',
                category: 'General',
                heritable: false
            },
            description: {
                title: 'Description',
                type: 'textarea',
                category: 'Advanced (SEO)',
                heritable: false,
                value: ''
            }
        },

        // API routes (even if not used, frontend expects them)
        routes: {
            // Parameter management
            api_parameters_list: {
                path: '/api/parameter-management/parameters/data/list',
                methods: ['GET']
            },

            // Translations
            api_translations_lists: {
                path: '/api/translations/list',
                methods: ['GET']
            },
            api_translations_list_by_locale: {
                path: '/api/translations/{locale}/list',
                methods: ['GET']
            },

            // iDevices
            api_idevices_installed: {
                path: '/api/idevice/installed',
                methods: ['GET']
            },
            api_idevices_upload: {
                path: '/api/idevice/upload',
                methods: ['POST']
            },
            api_idevices_installed_delete: {
                path: '/api/idevice/delete',
                methods: ['DELETE']
            },
            api_idevices_installed_download: {
                path: '/api/idevice/{odeSessionId}/{ideviceDirName}/download',
                methods: ['GET']
            },
            api_idevices_list_by_page: {
                path: '/api/idevice-management/idevices/page/{odeNavStructureSyncId}',
                methods: ['GET']
            },
            api_idevices_download_file_resources: {
                // Path for resource downloads - will be prepended with basePath by the app
                path: '/files/perm/idevices/base',
                methods: ['GET']
            },
            api_idevices_html_template_get: {
                path: '/api/idevice-management/idevices/{odeComponentsSyncId}/html-template',
                methods: ['GET']
            },
            api_idevices_html_view_get: {
                path: '/api/idevice-management/idevices/{odeComponentsSyncId}/html-view',
                methods: ['GET']
            },
            api_idevices_html_view_save: {
                path: '/api/idevice-management/idevices/html-view/save',
                methods: ['PUT']
            },
            api_idevices_idevice_data_save: {
                path: '/api/idevice-management/idevices/data/save',
                methods: ['PUT']
            },
            api_idevices_idevice_properties_save: {
                path: '/api/idevice-management/idevices/properties/save',
                methods: ['PUT']
            },
            api_idevices_idevice_reorder: {
                path: '/api/idevice-management/idevices/reorder',
                methods: ['PUT']
            },
            api_idevices_idevice_duplicate: {
                path: '/api/idevice-management/idevices/duplicate',
                methods: ['POST']
            },
            api_idevices_idevice_delete: {
                path: '/api/idevice-management/idevices/{odeComponentsSyncId}/delete',
                methods: ['DELETE']
            },
            api_idevices_upload_file_resources: {
                path: '/api/idevice-management/idevices/upload-file',
                methods: ['POST']
            },
            api_idevices_upload_large_file_resources: {
                path: '/api/idevice-management/idevices/upload-large-file',
                methods: ['POST']
            },
            api_idevices_force_download_file_resources: {
                // Use same path as api_idevices_download_file_resources for consistency
                path: '/files/perm/idevices/base',
                methods: ['GET']
            },
            api_idevices_download_ode_components: {
                path: '/api/idevice-management/idevices/{odeSessionId}/{odeBlockId}/{odeIdeviceId}/download',
                methods: ['GET']
            },

            // Themes
            api_themes_installed: {
                path: '/api/theme/installed',
                methods: ['GET']
            },
            api_themes_upload: {
                path: '/api/theme/upload',
                methods: ['POST']
            },
            api_themes_installed_delete: {
                path: '/api/theme/delete',
                methods: ['DELETE']
            },
            api_themes_download: {
                path: '/api/theme/{odeSessionId}/{themeDirName}/download',
                methods: ['GET']
            },
            api_themes_new: {
                path: '/api/theme/new',
                methods: ['POST']
            },
            api_themes_edit: {
                path: '/api/theme/{themeDirName}/edit',
                methods: ['PUT']
            },
            api_ode_theme_import: {
                path: '/api/theme/ode/import',
                methods: ['POST']
            },

            // User
            api_user_set_lopd_accepted: {
                path: '/api/user/lopd-accepted',
                methods: ['POST']
            },
            api_user_preferences_get: {
                path: '/api/user/preferences',
                methods: ['GET']
            },
            api_user_preferences_save: {
                path: '/api/user/preferences',
                methods: ['PUT']
            },

            // ODE management
            api_odes_ode_elp_open: {
                path: '/api/ode-management/odes/open',
                methods: ['POST']
            },
            api_odes_ode_local_elp_open: {
                path: '/api/ode-management/odes/local/open',
                methods: ['POST']
            },
            api_odes_ode_local_large_elp_open: {
                path: '/api/ode-management/odes/local/large/open',
                methods: ['POST']
            },
            api_odes_ode_local_xml_properties_open: {
                path: '/api/ode-management/odes/local/xml-properties/open',
                methods: ['POST']
            },
            api_odes_ode_local_elp_import_root: {
                path: '/api/ode-management/odes/import/root',
                methods: ['POST']
            },
            api_odes_ode_local_idevices_open: {
                path: '/api/ode-management/odes/local/idevices/open',
                methods: ['POST']
            },
            api_odes_ode_multiple_local_elp_open: {
                path: '/api/ode-management/odes/local/multiple/open',
                methods: ['POST']
            },
            api_odes_remove_ode_file: {
                path: '/api/ode-management/odes/remove',
                methods: ['POST']
            },
            api_odes_remove_date_ode_files: {
                path: '/api/ode-management/odes/remove-by-date',
                methods: ['POST']
            },
            api_odes_check_before_leave_ode_session: {
                path: '/api/ode-management/odes/check-before-leave',
                methods: ['POST']
            },
            api_odes_clean_init_autosave_elp: {
                path: '/api/ode-management/odes/clean-autosaves',
                methods: ['POST']
            },
            api_odes_ode_session_close: {
                path: '/api/ode-management/odes/session/close',
                methods: ['POST']
            },
            api_odes_ode_save_manual: {
                path: '/api/ode-management/odes/save/manual',
                methods: ['POST']
            },
            api_odes_ode_save_auto: {
                path: '/api/ode-management/odes/save/auto',
                methods: ['POST']
            },
            api_odes_ode_save_as: {
                path: '/api/ode-management/odes/save-as',
                methods: ['POST']
            },
            api_odes_last_updated: {
                path: '/api/ode-management/odes/{odeId}/last-updated',
                methods: ['GET']
            },
            api_odes_current_users: {
                path: '/api/ode-management/odes/{odeId}/{odeVersionId}/{odeSessionId}/current-users',
                methods: ['GET']
            },
            api_odes_properties_get: {
                path: '/api/ode-management/odes/{odeSessionId}/properties',
                methods: ['GET']
            },
            api_odes_properties_save: {
                path: '/api/ode-management/odes/properties/save',
                methods: ['PUT']
            },
            api_odes_session_get_broken_links: {
                path: '/api/ode-management/odes/session/broken-links',
                methods: ['POST']
            },
            api_odes_pag_get_broken_links: {
                path: '/api/ode-management/odes/page/{odePageId}/broken-links',
                methods: ['GET']
            },
            api_odes_block_get_broken_links: {
                path: '/api/ode-management/odes/block/{odeBlockId}/broken-links',
                methods: ['GET']
            },
            api_odes_idevice_get_broken_links: {
                path: '/api/ode-management/odes/idevice/{odeIdeviceId}/broken-links',
                methods: ['GET']
            },
            api_odes_session_get_used_files: {
                path: '/api/ode-management/odes/session/used-files',
                methods: ['POST']
            },

            // Export
            api_ode_export_download: {
                path: '/api/export/{odeSessionId}/{exportType}/download',
                methods: ['GET', 'POST']
            },
            api_ode_export_preview: {
                path: '/api/export/{odeSessionId}/preview',
                methods: ['GET']
            },

            // Nav structure (pages)
            api_nav_structures_nav_structure_get: {
                path: '/api/nav-structure-management/nav-structures/{odeVersionId}/{odeSessionId}',
                methods: ['GET']
            },
            api_nav_structures_nav_structure_data_save: {
                path: '/api/nav-structure-management/nav-structures/data/save',
                methods: ['PUT']
            },
            api_nav_structures_nav_structure_properties_save: {
                path: '/api/nav-structure-management/nav-structures/properties/save',
                methods: ['PUT']
            },
            api_nav_structures_nav_structure_reorder: {
                path: '/api/nav-structure-management/nav-structures/reorder',
                methods: ['PUT']
            },
            api_nav_structures_nav_structure_duplicate: {
                path: '/api/nav-structure-management/nav-structures/duplicate',
                methods: ['POST']
            },
            api_nav_structures_nav_structure_delete: {
                path: '/api/nav-structure-management/nav-structures/{odeNavStructureSyncId}/delete',
                methods: ['DELETE']
            },
            api_nav_structures_import_elp_child: {
                path: '/api/nav-structure-management/nav-structures/{odeNavStructureSyncId}/import-elp',
                methods: ['POST']
            },

            // Pag structure (blocks)
            api_pag_structures_pag_structure_data_save: {
                path: '/api/pag-structure-management/pag-structures/data/save',
                methods: ['PUT']
            },
            api_pag_structures_pag_structure_properties_save: {
                path: '/api/pag-structure-management/pag-structures/properties/save',
                methods: ['PUT']
            },
            api_pag_structures_pag_structure_reorder: {
                path: '/api/pag-structure-management/pag-structures/reorder',
                methods: ['PUT']
            },
            api_pag_structures_pag_structure_duplicate: {
                path: '/api/pag-structure-management/pag-structures/duplicate',
                methods: ['POST']
            },
            api_pag_structures_pag_structure_delete: {
                path: '/api/pag-structure-management/pag-structures/{odePagStructureSyncId}/delete',
                methods: ['DELETE']
            },

            // Current ODE users (deprecated stubs)
            check_current_users_ode_session_id: {
                path: '/api/current-ode-users/check-session',
                methods: ['POST']
            },
            get_current_block_update: {
                path: '/api/current-ode-users/block-update',
                methods: ['POST']
            },

            // Resource lock
            api_resource_lock_timeout: {
                path: '/api/resource-lock/timeout',
                methods: ['GET']
            },

            // Games
            api_games_session_idevices: {
                path: '/api/games/session/{odeSessionId}/idevices',
                methods: ['GET']
            },

            // Cloud storage (not available in WordPress mode)
            api_google_oauth_login_url_get: {
                path: '/api/google/oauth/login-url',
                methods: ['GET']
            },
            api_google_drive_folders_list: {
                path: '/api/google/drive/folders',
                methods: ['GET']
            },
            api_google_drive_file_upload: {
                path: '/api/google/drive/upload',
                methods: ['POST']
            },
            api_dropbox_oauth_login_url_get: {
                path: '/api/dropbox/oauth/login-url',
                methods: ['GET']
            },
            api_dropbox_folders_list: {
                path: '/api/dropbox/folders',
                methods: ['GET']
            },
            api_dropbox_file_upload: {
                path: '/api/dropbox/upload',
                methods: ['POST']
            },

            // Platform integration
            set_platform_new_ode: {
                path: '/api/platform/new-ode',
                methods: ['POST']
            },
            open_platform_elp: {
                path: '/api/platform/open-elp',
                methods: ['POST']
            }
        }
    };

    console.log('[WP-EXE Mock] Parameters data initialized');
})();
