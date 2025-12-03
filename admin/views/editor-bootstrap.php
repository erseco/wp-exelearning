<?php
/**
 * eXeLearning Editor Bootstrap Page
 *
 * This page loads the eXeLearning editor with API mocking for WordPress integration.
 * All API calls are intercepted and mocked in the browser.
 *
 * @package Exelearning
 */

// Security check - this file should only be loaded by WordPress.
if ( ! defined( 'ABSPATH' ) ) {
    die( 'Security check failed' );
}

// Get parameters.
$attachment_id = isset( $_GET['attachment_id'] ) ? absint( $_GET['attachment_id'] ) : 0;

// Get the ELP file URL and info.
$elp_url      = '';
$elp_filename = '';
if ( $attachment_id ) {
    $elp_url      = wp_get_attachment_url( $attachment_id );
    $elp_filename = basename( get_attached_file( $attachment_id ) );
}

// Get attachment title.
$title = get_the_title( $attachment_id );
if ( empty( $title ) ) {
    $title = $elp_filename;
}

// Editor base URL (for eXeLearning static files).
$editor_base_url = EXELEARNING_PLUGIN_URL . 'exelearning/public';

// Plugin assets URL.
$plugin_assets_url = EXELEARNING_PLUGIN_URL . 'assets';

// REST API for saving.
$rest_url = rest_url( 'exelearning/v1' );
$nonce    = wp_create_nonce( 'wp_rest' );

// Get locale (must be defined before symfony_data).
$locale       = get_locale();
$locale_short = substr( $locale, 0, 2 );

// User data for eXeLearning.
$current_user = wp_get_current_user();
$user_data    = array(
    'id'       => $current_user->ID,
    'username' => $current_user->user_login,
    'email'    => $current_user->user_email,
    'name'     => $current_user->display_name,
    'roles'    => array( 'ROLE_USER' ),
);

// Symfony-like config for eXeLearning.
$symfony_data = array(
    'basePath'                      => $editor_base_url,
    'baseURL'                       => '',
    'fullURL'                       => $editor_base_url, // Used by idevicesManager for icon URLs.
    'changelogURL'                  => $editor_base_url . '/CHANGELOG.md',
    'locale'                        => $locale_short,
    'environment'                   => 'prod',
    // Theme types.
    'themeBaseType'                 => 'base',
    'themeTypeBase'                 => 'base',
    'themeTypeUser'                 => 'user',
    // iDevice types.
    'ideviceTypeBase'               => 'base',
    'ideviceTypeUser'               => 'user',
    'ideviceVisibilityPreferencePre' => 'idevice_visibility_',
    // File permissions check (skip in WordPress mode).
    'filesDirPermission'            => array(
        'checked' => true,
        'info'    => array(),
    ),
);

// App config.
$config_data = array(
    'isOfflineInstallation'       => true,
    'enableCollaborativeEditing'  => false,
    'userStyles'                  => false,
    'userIdevices'                => false,
    'defaultTheme'                => 'base',
    'clientCallWaitingTime'       => 30000,
    'clientIntervalUpdate'        => 60000,
    'clientIntervalGetLastEdition' => 60000,
    'sessionCheckInterval'        => 300000,
    'platformUrlSet'              => '',
    'platformUrlGet'              => '',
);
?>
<!DOCTYPE html>
<html lang="<?php echo esc_attr( $locale ); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php esc_html_e( 'Edit eXeLearning File', 'exelearning' ); ?> - <?php echo esc_html( $title ); ?></title>

    <!-- eXeLearning CSS -->
    <link rel="stylesheet" href="<?php echo esc_url( $editor_base_url ); ?>/libs/bootstrap/bootstrap.min.css">
    <link rel="stylesheet" href="<?php echo esc_url( $editor_base_url ); ?>/style/workarea/main.css">
    <link rel="stylesheet" href="<?php echo esc_url( $editor_base_url ); ?>/style/workarea/base.css">
    <link rel="stylesheet" href="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_effects/exe_effects.css">
    <link rel="stylesheet" href="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_games/exe_games.css">
    <link rel="stylesheet" href="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_highlighter/exe_highlighter.css">
    <link rel="stylesheet" href="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_lightbox/exe_lightbox.css">
    <link rel="stylesheet" href="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_media/exe_media.css">
    <link rel="stylesheet" href="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_wikipedia/exe_wikipedia.css">

    <!-- WordPress specific styles -->
    <style>
        /* Ensure full height */
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }

        /* Loading screen */
        #load-screen-main {
            display: flex !important;
            z-index: 9999;
        }
        #load-screen-main.hide {
            display: none !important;
        }

        /* WordPress save button */
        .wp-save-button {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1060;
            background: #2271b1;
            border-color: #2271b1;
        }
        .wp-save-button:hover {
            background: #135e96;
            border-color: #135e96;
        }

        /* Hide elements not needed in WordPress mode */
        .menu-file-open,
        .menu-file-save-as,
        .menu-cloud-storage,
        [data-action="openUserOdeFiles"],
        [data-action="saveAs"] {
            display: none !important;
        }
    </style>
</head>
<body id="main">
    <!-- Loading Screen -->
    <div id="load-screen-main" class="load-screen loading position-fixed top-0 start-0 w-100 h-100 align-items-center justify-content-center bg-white" style="z-index: 1050;" data-testid="loading-main" data-visible="true">
        <span>eXeLearning - WordPress</span>
    </div>

    <!-- WordPress Save Button -->
    <button type="button" class="btn btn-primary wp-save-button" id="wp-save-btn" style="display: none;">
        <?php esc_html_e( 'Save to WordPress', 'exelearning' ); ?>
    </button>

    <!-- Main Workarea -->
    <div id="workarea" class="container-fluid d-flex flex-nowrap">
        <aside class="asideleft col-md-4 col-lg-3 bg-light vh-100">
            <div class="content-info">
                <div id="exe-title" class="title-not-editing">
                    <h2 class="exe-title content" id="change_title"><?php echo esc_html( $title ); ?></h2>
                    <button class="btn button-square button-tertiary tertiary-green title-menu-button exe-app-tooltip" data-bs-toggle="tooltip" data-bs-placement="bottom" title="<?php esc_attr_e( 'Change title', 'exelearning' ); ?>" aria-label="<?php esc_attr_e( 'Change title', 'exelearning' ); ?>">
                        <span class="exe-icon small-icon edit-icon-green"></span>
                    </button>
                </div>
            </div>
            <div class="accordion" id="menus_content">
                <!-- Structure Menu -->
                <div id="menu_nav" class="menu long accordion-item" size="long" pos="left" iddrag="menu">
                    <div class="accordion-header" id="menu_nav_header">
                        <div class="accordion-button">
                            <div class="content_action_buttons buttons_action_container_right">
                                <button class="btn button-secondary secondary-green button-narrow button-combo combo-left button_nav_action action_move_prev" title="<?php esc_attr_e( 'Move up', 'exelearning' ); ?>" data-testid="nav-move-up">
                                    <i class="small-icon arrow-up-icon-green" aria-hidden="true"></i>
                                </button>
                                <button class="btn button-secondary secondary-green button-narrow button-combo combo-center button_nav_action action_move_next" title="<?php esc_attr_e( 'Move down', 'exelearning' ); ?>" data-testid="nav-move-down">
                                    <i class="small-icon arrow-down-icon-green" aria-hidden="true"></i>
                                </button>
                                <button class="btn button-secondary secondary-green button-narrow button-combo combo-center button_nav_action action_move_up" title="<?php esc_attr_e( 'Move left', 'exelearning' ); ?>" data-testid="nav-move-left">
                                    <i class="small-icon arrow-left-icon-green" aria-hidden="true"></i>
                                </button>
                                <button class="btn button-secondary secondary-green button-narrow button-combo combo-right button_nav_action action_move_down" title="<?php esc_attr_e( 'Move right', 'exelearning' ); ?>" data-testid="nav-move-right">
                                    <i class="small-icon arrow-right-icon-green" aria-hidden="true"></i>
                                </button>
                            </div>
                            <div class="content_action_buttons buttons_action_container_left" id="nav_actions">
                                <button class="button_nav_action action_properties d-none" title="<?php esc_attr_e( 'Page properties', 'exelearning' ); ?>" data-testid="nav-properties">
                                    <i class="exe-icon" aria-hidden="true">settings</i>
                                    <span class="visually-hidden"><?php esc_html_e( 'Page properties', 'exelearning' ); ?></span>
                                </button>
                                <button class="btn button-secondary secondary-green button-square button-combo combo-left button_nav_action action_delete" title="<?php esc_attr_e( 'Delete page', 'exelearning' ); ?>" data-testid="nav-delete">
                                    <i class="small-icon delete-icon-green" aria-hidden="true"></i>
                                </button>
                                <button class="btn button-secondary secondary-green button-square button-combo combo-center button_nav_action action_clone" title="<?php esc_attr_e( 'Clone page', 'exelearning' ); ?>" data-testid="nav-clone">
                                    <i class="small-icon duplicate-icon-green" aria-hidden="true"></i>
                                </button>
                                <button class="btn button-secondary secondary-green button-square button-combo combo-right button_nav_action action_import_idevices" title="<?php esc_attr_e( 'Import iDevices', 'exelearning' ); ?>" data-testid="nav-import-idevices">
                                    <i class="small-icon import-icon-green" aria-hidden="true"></i>
                                </button>
                            </div>
                            <div class="content_action_buttons add-page">
                                <button class="button_nav_action action_add" title="<?php esc_attr_e( 'New page', 'exelearning' ); ?>" aria-label="<?php esc_attr_e( 'New page', 'exelearning' ); ?>" data-testid="nav-add-page">
                                    <span class="exe-icon" aria-hidden="true">add</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div id="menu_nav_content" class="menu_content accordion-collapse collapse show" aria-labelledby="menu_nav_header">
                        <div id="nav_list" role="tree">
                            <div id="nav_document_root_node"></div>
                        </div>
                    </div>
                </div>

                <!-- iDevices Menu -->
                <div id="menu_idevices" class="menu long accordion-item" size="long" pos="left" drag="menu">
                    <h2 class="accordion-header" id="menu_idevices_header">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#menu_idevices_content" aria-expanded="true" aria-controls="menu_idevices_content">
                            iDevices
                        </button>
                    </h2>
                    <div id="menu_idevices_content" class="menu_content accordion-collapse collapse show" aria-labelledby="menu_idevices_header" data-testid="idevices-menu">
                        <div id="list_menu_idevices" class="list"></div>
                    </div>
                </div>
            </div>
        </aside>

        <main>
            <header id="head">
                <!-- Top Menu Bar (menuHeadTop.njk) -->
                <div class="top" id="eXeLearningNavbar">
                    <div class="main-menu">
                        <div class="main-menu-left">
                            <!-- Navbar Menu (menuNavbar.njk) -->
                            <nav class="navbar navbar-expand-md navbar-light">
                                <div class="collapse navbar-collapse show">
                                    <button id="exe-panels-toggler" class="btn me-2 nav-link" title="<?php esc_attr_e( 'Toggle panels', 'exelearning' ); ?>">
                                        <div class="medium-icon menu-icon"></div>
                                    </button>
                                    <ul class="navbar-nav mr-auto">
                                        <!-- File Menu -->
                                        <li class="nav-item btn button-tertiary button-dropdown dropdown">
                                            <a class="nav-link dropdown-toggle" href="#" id="dropdownFile" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                <?php esc_html_e( 'File', 'exelearning' ); ?>
                                            </a>
                                            <ul class="dropdown-menu" aria-labelledby="dropdownFile">
                                                <li><a class="dropdown-item" id="navbar-button-new" href="#" data-shortcut="Mod+Alt+N"><span class="small-icon new-icon-green"></span> <?php esc_html_e( 'New', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item" id="navbar-button-new-from-template" href="#"><span class="small-icon template-icon-green"></span> <?php esc_html_e( 'New from Template', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item" id="navbar-button-open-offline" href="#" data-shortcut="Mod+O"><span class="small-icon open-icon"></span> <?php esc_html_e( 'Open', 'exelearning' ); ?></a></li>
                                                <li><a id="navbar-button-import-elp" class="dropdown-item" href="#"><span class="small-icon import-icon-green"></span> <?php esc_html_e( 'Import (.elpx…)', 'exelearning' ); ?></a></li>
                                                <li class="dropdown-divider"></li>
                                                <li><a class="dropdown-item" id="navbar-button-save" href="#" data-shortcut="Mod+S"><span class="small-icon save-icon-green"></span> <?php esc_html_e( 'Save', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item" id="navbar-button-save-offline" href="#"><span class="small-icon save-icon-green"></span> <?php esc_html_e( 'Save (offline)', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item" id="navbar-button-save-as" href="#" data-shortcut="Mod+Shift+S"><span class="small-icon save-icon"></span> <?php esc_html_e( 'Save as', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item" id="navbar-button-save-as-offline" href="#"><span class="small-icon save-icon"></span> <?php esc_html_e( 'Save as (offline)', 'exelearning' ); ?></a></li>
                                                <li class="dropdown dropend">
                                                    <a class="dropdown-item dropdown-toggle" href="#" id="dropdownExportAsOffline" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="small-icon download-icon-green"></span> <?php esc_html_e( 'Export as...', 'exelearning' ); ?></a>
                                                    <ul class="dropdown-menu" aria-labelledby="dropdownExportAsOffline">
                                                        <li><a id="navbar-button-exportas-html5" class="dropdown-item" href="#"><?php esc_html_e( 'Website', 'exelearning' ); ?></a></li>
                                                        <li><a id="navbar-button-exportas-html5-folder" class="dropdown-item" href="#"><?php esc_html_e( 'Export to Folder', 'exelearning' ); ?></a></li>
                                                        <li><a id="navbar-button-exportas-html5-sp" class="dropdown-item" href="#"><?php esc_html_e( 'Single page', 'exelearning' ); ?></a></li>
                                                        <li><a id="navbar-button-exportas-scorm12" class="dropdown-item" href="#">SCORM 1.2</a></li>
                                                        <li><a id="navbar-button-exportas-ims" class="dropdown-item exe-advanced" href="#">IMS CP</a></li>
                                                        <li><a id="navbar-button-exportas-epub3" class="dropdown-item" href="#">ePub3</a></li>
                                                    </ul>
                                                </li>
                                                <li class="dropdown-divider"></li>
                                                <li><a id="navbar-button-export-print" class="dropdown-item" href="#"><span class="small-icon print-icon-green"></span> <?php esc_html_e( 'Print', 'exelearning' ); ?></a></li>
                                            </ul>
                                        </li>
                                        <!-- Utilities Menu -->
                                        <li class="nav-item btn button-tertiary button-dropdown dropdown">
                                            <a class="nav-link dropdown-toggle" href="#" id="dropdownUtilities" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                <?php esc_html_e( 'Utilities', 'exelearning' ); ?>
                                            </a>
                                            <ul class="dropdown-menu" aria-labelledby="dropdownUtilities">
                                                <li><a class="dropdown-item" id="navbar-button-preview" href="#"><?php esc_html_e( 'Preview', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item exe-advanced" id="navbar-button-idevice-manager" href="#"><?php esc_html_e( 'iDevice manager', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item exe-advanced" id="navbar-button-odeusedfiles" href="#"><span class="small-icon report-icon-green"></span> <?php esc_html_e( 'Resources report', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item exe-advanced" id="navbar-button-odebrokenlinks" href="#"><span class="small-icon link-icon"></span> <?php esc_html_e( 'Link validation', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item exe-advanced" id="navbar-button-filemanager" href="#"><span class="small-icon image-icon-green"></span> <?php esc_html_e( 'File manager', 'exelearning' ); ?></a></li>
                                            </ul>
                                        </li>
                                        <!-- Help Menu -->
                                        <li class="nav-item btn button-tertiary button-dropdown dropdown" id="dropdownHelpItem">
                                            <a class="nav-link dropdown-toggle" href="#" id="dropdownHelp" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                <?php esc_html_e( 'Help', 'exelearning' ); ?>
                                            </a>
                                            <ul class="dropdown-menu" aria-labelledby="dropdownHelp">
                                                <li><a class="dropdown-item" id="navbar-button-assistant" href="#"><?php esc_html_e( 'Assistant', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item" id="navbar-button-exe-tutorial" href="#"><?php esc_html_e( 'User manual', 'exelearning' ); ?></a></li>
                                                <li class="dropdown-divider"></li>
                                                <li><a class="dropdown-item" id="navbar-button-about-exe" href="#"><?php esc_html_e( 'About eXeLearning', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item" id="navbar-button-release-notes" href="#"><?php esc_html_e( 'Release notes', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item" id="navbar-button-legal-notes" href="#"><?php esc_html_e( 'Legal notes', 'exelearning' ); ?></a></li>
                                                <li class="dropdown-divider"></li>
                                                <li><a class="dropdown-item" id="navbar-button-exe-web" href="#"><?php esc_html_e( 'eXeLearning website', 'exelearning' ); ?></a></li>
                                                <li><a class="dropdown-item" id="navbar-button-report-bug" href="#"><?php esc_html_e( 'Report a bug', 'exelearning' ); ?></a></li>
                                            </ul>
                                        </li>
                                    </ul>
                                </div>
                            </nav>
                        </div>
                        <div class="main-menu-right">
                            <button id="head-top-download-button" class="btn" title="<?php esc_attr_e( 'Download', 'exelearning' ); ?>" data-testid="download-button">
                                <span class="auto-icon" aria-hidden="true">download</span>
                                <span class="btn-label"><?php esc_html_e( 'Download', 'exelearning' ); ?></span>
                            </button>
                            <button id="head-top-save-button" class="btn button-display d-flex justify-content-center align-items-center" title="<?php esc_attr_e( 'Save', 'exelearning' ); ?>" data-testid="save-button">
                                <div class="small-icon save-icon-white"></div>
                                <span><?php esc_html_e( 'Save', 'exelearning' ); ?></span>
                            </button>
                            <button id="head-bottom-preview" class="btn button-display display-outline button-square d-flex justify-content-center align-items-center" title="<?php esc_attr_e( 'Preview', 'exelearning' ); ?>">
                                <div class="small-icon preview-icon-green"></div>
                            </button>
                            <button id="dropdownStyles" class="btn button-tertiary button-square d-flex justify-content-center align-items-center" title="<?php esc_attr_e( 'Styles', 'exelearning' ); ?>">
                                <span class="medium-icon styles-icon"></span>
                            </button>
                            <button id="head-top-settings-button" class="btn button-tertiary button-square d-flex justify-content-center align-items-center" title="<?php esc_attr_e( 'Settings', 'exelearning' ); ?>" data-testid="settings-button">
                                <span class="medium-icon settings-icon"></span>
                            </button>
                            <div id="exe-last-edition" class="btn" data-bs-toggle="tooltip" data-bs-placement="bottom" title="">
                                <span class="content"></span>
                            </div>
                            <div id="head-bottom-user-logged" class="dropdown" title="<?php echo esc_attr( $current_user->user_login ); ?>" data-testid="user-menu" data-user-email="<?php echo esc_attr( $current_user->user_email ); ?>">
                                <button class="btn btn-link" type="button" id="exeUserMenuToggler" data-bs-toggle="dropdown" aria-expanded="false" title="<?php esc_attr_e( 'User menu', 'exelearning' ); ?>">
                                    <span class="exe-avatar" title="<?php echo esc_attr( $current_user->display_name ); ?>" data-testid="user-avatar-initial"><?php echo esc_html( strtoupper( substr( $current_user->display_name, 0, 1 ) ) ); ?></span>
                                </button>
                                <ul class="dropdown-menu" aria-labelledby="exeUserMenuToggler">
                                    <li><a class="dropdown-item" id="navbar-button-preferences" href="#"><?php esc_html_e( 'Preferences', 'exelearning' ); ?></a></li>
                                    <li class="dropdown-divider"></li>
                                    <li><a class="dropdown-item" id="head-bottom-logout-button" href="#"><?php esc_html_e( 'Exit', 'exelearning' ); ?></a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Bottom Menu Bar (menuHeadBottom.njk) -->
                <div class="bottom">
                    <button id="button_menu_nav" class="btn btn-light" title="<?php esc_attr_e( 'Structure panel', 'exelearning' ); ?>">
                        <span class="auto-icon" aria-hidden="true">vertical_split</span>
                        <span class="visually-hidden"><?php esc_html_e( 'Structure panel', 'exelearning' ); ?></span>
                    </button>
                    <button id="button_menu_idevices" class="btn btn-light" title="<?php esc_attr_e( 'iDevices panel', 'exelearning' ); ?>">
                        <span class="auto-icon" aria-hidden="true">dashboard_customize</span>
                        <span class="visually-hidden"><?php esc_html_e( 'iDevices panel', 'exelearning' ); ?></span>
                    </button>
                </div>
            </header>
            <section id="node-content-container" class="exe-content js flex-grow-1 d-flex flex-column">
                <div id="load-screen-node-content" class="load-screen hide" data-testid="loading-content" data-visible="false"></div>
                <div id="node-content" class="content" drop='["idevice","box"]' data-testid="node-content" data-ready="false">
                    <div>
                        <div id="header-node-content" class="header"></div>
                        <h1 id="page-title-node-content" class="page-title" data-testid="page-title"></h1>
                    </div>
                </div>
                <div id="idevices-bottom" class="idevices-bottom-menu" data-testid="idevices-quickbar"></div>
            </section>
        </main>
    </div>

    <!-- Styles Sidebar -->
    <div id="stylessidenav-content" class="relative z-50 navbar-menu">
        <div id="sidenav-overlay" class="sidenav-overlay"></div>
        <aside id="stylessidenav" class="sidenav" role="complementary">
            <div class="content-styles-header">
                <h1 class="styles-title"><?php esc_html_e( 'Styles', 'exelearning' ); ?></h1>
                <div id="stylessidenavclose" class="navbar-close">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 5L5 15M5 5L15 15" stroke="black" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
            <div class="content-tabs">
                <ul class="nav nav-tabs" id="styleslist" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="exestylescontent-tab" data-bs-toggle="tab" data-bs-target="#exestylescontent" type="button" role="tab" aria-controls="exestylescontent" aria-selected="true">
                            <?php esc_html_e( 'System', 'exelearning' ); ?>
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="importedstylescontent-tab" data-bs-toggle="tab" data-bs-target="#importedstylescontent" type="button" role="tab" aria-controls="importedstylescontent" aria-selected="false">
                            <?php esc_html_e( 'Imported', 'exelearning' ); ?>
                        </button>
                    </li>
                </ul>
            </div>
            <div class="tab-content mt-3" id="styleslistContent">
                <div class="tab-pane fade show active" id="exestylescontent" role="tabpanel"></div>
                <div class="tab-pane fade" id="importedstylescontent" role="tabpanel"></div>
            </div>
        </aside>
    </div>

    <!-- Modals Container -->
    <div class="modals-container">
        <!-- Alert Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalAlert" role="alertdialog" data-testid="modal-alert" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-alert" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button type="button" class="close btn btn-secondary" data-dismiss="modal"><?php esc_html_e( 'Close', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Info Modal -->
        <div class="modal exe-modal-fade" id="modalInfo" tabindex="-1" role="dialog" aria-hidden="true" data-testid="modal-info" data-open="false">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        </div>

        <!-- Confirm Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalConfirm" role="dialog" aria-hidden="true" data-testid="modal-confirm" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button type="button" class="confirm btn button-primary" data-testid="confirm-action"><?php esc_html_e( 'Confirm', 'exelearning' ); ?></button>
                        <button type="button" class="cancel btn button-tertiary" data-testid="cancel-action" data-dismiss="modal"><?php esc_html_e( 'Cancel', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Properties Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalProperties" role="dialog" aria-hidden="true" data-testid="modal-properties" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Properties', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="properties-content"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="save btn button-primary"><?php esc_html_e( 'Save', 'exelearning' ); ?></button>
                        <button type="button" class="cancel btn button-tertiary" data-dismiss="modal"><?php esc_html_e( 'Cancel', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Session Logout Modal (stub) -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalSessionLogout" role="dialog" aria-hidden="true" data-open="false">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Session', 'exelearning' ); ?></div>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        </div>

        <!-- File Manager Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalFileManager" role="dialog" aria-hidden="true" data-testid="modal-filemanager" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-xl modal-confirm" role="document">
                <div class="modal-content" id="modalFileManagerContent">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Media Library', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body media-library-body">
                        <div class="media-library-toolbar">
                            <button type="button" class="btn btn-primary media-library-upload-btn">
                                <span class="exe-icon">add</span> <?php esc_html_e( 'Add file', 'exelearning' ); ?>
                            </button>
                            <input type="file" class="media-library-upload-input" accept="image/*,video/*,audio/*,.pdf" multiple style="display:none;">
                            <div class="media-library-view-controls">
                                <button type="button" class="media-library-view-btn active" data-view="grid" title="<?php esc_attr_e( 'Grid view', 'exelearning' ); ?>">
                                    <span class="exe-icon">grid_view</span>
                                </button>
                                <button type="button" class="media-library-view-btn" data-view="list" title="<?php esc_attr_e( 'List view', 'exelearning' ); ?>">
                                    <span class="exe-icon">view_list</span>
                                </button>
                            </div>
                            <input type="text" class="form-control media-library-search" placeholder="<?php esc_attr_e( 'Search...', 'exelearning' ); ?>">
                        </div>
                        <div class="media-library-container">
                            <div class="media-library-main">
                                <div class="media-library-grid">
                                    <div class="media-library-loading"><?php esc_html_e( 'Loading assets...', 'exelearning' ); ?></div>
                                </div>
                                <div class="media-library-empty" style="display:none;"><?php esc_html_e( 'No media files yet. Click "Add file" to upload.', 'exelearning' ); ?></div>
                            </div>
                            <div class="media-library-sidebar">
                                <div class="media-library-sidebar-empty">
                                    <p><?php esc_html_e( 'Select an item to view details', 'exelearning' ); ?></p>
                                </div>
                                <div class="media-library-sidebar-content" style="display:none;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Style Manager Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalStyleManager" role="dialog" aria-hidden="true" data-testid="modal-stylemanager" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content" id="modalStyleManagerContent">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Styles', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-danger alert-dismissible fade" role="alert">
                            <div class="text"></div>
                            <button type="button" class="close-alert" data-dismiss="alert" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body-content"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="confirm btn btn-primary"><?php esc_html_e( 'Save', 'exelearning' ); ?></button>
                        <button type="button" class="close btn btn-secondary" data-dismiss="modal"><?php esc_html_e( 'Close', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- iDevice Manager Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalIdeviceManager" role="dialog" aria-hidden="true" data-testid="modal-idevicemanager" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content" id="modalIdeviceManagerContent">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'iDevice Manager', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-danger alert-dismissible fade" role="alert">
                            <div class="text"></div>
                            <button type="button" class="close-alert" data-dismiss="alert" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body-content"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="confirm btn btn-primary"><?php esc_html_e( 'Save', 'exelearning' ); ?></button>
                        <button type="button" class="close btn btn-secondary" data-dismiss="modal"><?php esc_html_e( 'Close', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- About Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalAbout" role="dialog" aria-hidden="true" data-testid="modal-about" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'About eXeLearning', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body help-modal help-modal-with-logo">
                        <div class="help-modal-top">
                            <img src="<?php echo esc_url( $editor_base_url ); ?>/style/workarea/images/exelearning.svg" class="exe-logo content" alt="Logo eXeLearning">
                        </div>
                        <div class="help-modal-content">
                            <h1 class="lead mb-4">eXeLearning - WordPress</h1>
                            <p><?php esc_html_e( 'eXeLearning is a free software tool under the GNU Affero GPL that can be used to create educational interactive web contents.', 'exelearning' ); ?></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- LOPD Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalLopd" role="dialog" aria-hidden="true" data-testid="modal-lopd" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content static">
                    <div class="modal-header">
                        <div class="modal-title"></div>
                    </div>
                    <div class="modal-body text-start">
                        <h1 class="text-start"><?php esc_html_e( 'Privacy and Terms', 'exelearning' ); ?></h1>
                        <div class="lopdgdd-body text-start"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="confirm btn btn-primary" type="button"><?php esc_html_e( 'Accept', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Open User Ode Files Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalOpenUserOdeFiles" role="dialog" aria-hidden="true" data-testid="modal-open-user-ode-files" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content" id="modalOpenUserOdeFilesContent">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Open', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-body-content"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="confirm btn btn-primary"><?php esc_html_e( 'Open', 'exelearning' ); ?></button>
                        <button type="button" class="close btn btn-secondary" data-dismiss="modal"><?php esc_html_e( 'Cancel', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Template Selection Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalTemplateSelection" role="dialog" aria-hidden="true" data-testid="modal-template-selection" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content" id="modalTemplateSelectionContent">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'New from Template', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-body-content">
                            <p><?php esc_html_e( 'Select a template to create a new project:', 'exelearning' ); ?></p>
                            <div id="template-list" class="list-group"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="confirm btn btn-primary" disabled><?php esc_html_e( 'Create', 'exelearning' ); ?></button>
                        <button type="button" class="close btn btn-secondary" data-dismiss="modal"><?php esc_html_e( 'Cancel', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Upload to Google Drive Modal (stub) -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalUploadToDrive" role="dialog" aria-hidden="true" data-open="false">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Upload to Google Drive', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary"><?php esc_html_e( 'Upload', 'exelearning' ); ?></button>
                        <button type="button" class="close btn btn-secondary" data-dismiss="modal"><?php esc_html_e( 'Cancel', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Upload to Dropbox Modal (stub) -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalUploadToDropbox" role="dialog" aria-hidden="true" data-open="false">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Upload to Dropbox', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary"><?php esc_html_e( 'Upload', 'exelearning' ); ?></button>
                        <button type="button" class="close btn btn-secondary" data-dismiss="modal"><?php esc_html_e( 'Cancel', 'exelearning' ); ?></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Assistant Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalAssistant" role="dialog" aria-hidden="true" data-testid="modal-assistant" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Assistant', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body help-modal">
                        <div class="top-menu">
                            <icon class="exe-icon show-tabs">menu</icon>
                        </div>
                        <div class="body-content show-tabs">
                            <ul class="exe-form-tabs">
                                <li><a href="#modalAssistant-tab-1" class="exe-tab exe-form-active-tab">1. <?php esc_html_e( 'What is eXeLearning', 'exelearning' ); ?></a></li>
                                <li><a href="#modalAssistant-tab-2" class="exe-tab">2. <?php esc_html_e( 'Create a project', 'exelearning' ); ?></a></li>
                                <li><a href="#modalAssistant-tab-3" class="exe-tab">3. <?php esc_html_e( 'Adding pages', 'exelearning' ); ?></a></li>
                                <li><a href="#modalAssistant-tab-4" class="exe-tab">4. <?php esc_html_e( 'Adding content', 'exelearning' ); ?></a></li>
                                <li><a href="#modalAssistant-tab-5" class="exe-tab">5. <?php esc_html_e( 'Exporting a project', 'exelearning' ); ?></a></li>
                            </ul>
                            <div id="modalAssistant-tab-1" class="exe-form-content exe-form-active-content">
                                <p><?php esc_html_e( 'eXeLearning is an open source authoring tool for creating educational content.', 'exelearning' ); ?></p>
                            </div>
                            <div id="modalAssistant-tab-2" class="exe-form-content">
                                <p><?php esc_html_e( 'Create a new project or open an existing one from the File menu.', 'exelearning' ); ?></p>
                            </div>
                            <div id="modalAssistant-tab-3" class="exe-form-content">
                                <p><?php esc_html_e( 'Use the structure panel on the left to add and organize pages.', 'exelearning' ); ?></p>
                            </div>
                            <div id="modalAssistant-tab-4" class="exe-form-content">
                                <p><?php esc_html_e( 'Add iDevices from the panel to create interactive content.', 'exelearning' ); ?></p>
                            </div>
                            <div id="modalAssistant-tab-5" class="exe-form-content">
                                <p><?php esc_html_e( 'Export your project to HTML5, SCORM, or other formats.', 'exelearning' ); ?></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Legal Notes Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalLegalNotes" role="dialog" aria-hidden="true" data-testid="modal-legalnotes" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Legal notes', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body help-modal help-modal-with-logo">
                        <div class="help-modal-top">
                            <img src="<?php echo esc_url( $editor_base_url ); ?>/style/workarea/images/exelearning.svg" class="exe-logo content" alt="Logo eXeLearning">
                        </div>
                        <div class="help-modal-content">
                            <ul class="exe-form-tabs">
                                <li><a href="#modalLegalNotes-tab-1" class="exe-tab exe-form-active-tab"><?php esc_html_e( 'Credits', 'exelearning' ); ?></a></li>
                                <li><a href="#modalLegalNotes-tab-2" class="exe-tab"><?php esc_html_e( 'Third Libraries', 'exelearning' ); ?></a></li>
                                <li><a href="#modalLegalNotes-tab-3" class="exe-tab"><?php esc_html_e( 'Licenses', 'exelearning' ); ?></a></li>
                            </ul>
                            <div id="modalLegalNotes-tab-1" class="exe-form-content exe-form-active-content">
                                <h3 class="visually-hidden"><?php esc_html_e( 'Credits', 'exelearning' ); ?></h3>
                                <h4 class="lead mb-4">eXeLearning 3+</h4>
                                <ul class="main-desc">
                                    <li>Copyright (2024): INTEF, Junta de Andalucía, Junta de Extremadura</li>
                                    <li>2025-present <a href="https://exelearning.net/" target="_blank" rel="noopener">eXeLearning.net</a></li>
                                </ul>
                                <p>License: GNU Affero GPL 3</p>
                            </div>
                            <div id="modalLegalNotes-tab-2" class="exe-form-content">
                                <h3 class="visually-hidden"><?php esc_html_e( 'Third Libraries', 'exelearning' ); ?></h3>
                                <div class="third-party-content md-converted-content"></div>
                            </div>
                            <div id="modalLegalNotes-tab-3" class="exe-form-content">
                                <h3 class="visually-hidden"><?php esc_html_e( 'Licenses', 'exelearning' ); ?></h3>
                                <div class="licenses-list md-converted-content"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Release Notes Modal -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalReleaseNotes" role="dialog" aria-hidden="true" data-testid="modal-releasenotes" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-confirm" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Release notes', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body help-modal help-modal-with-logo">
                        <div class="help-modal-top">
                            <img src="<?php echo esc_url( $editor_base_url ); ?>/style/workarea/images/exelearning.svg" class="exe-logo content" alt="Logo eXeLearning">
                        </div>
                        <div class="help-modal-content">
                            <h1 class="lead mb-4"><?php esc_html_e( 'Changelog', 'exelearning' ); ?></h1>
                            <div class="body-release">
                                <div class="changelog-content md-converted-content"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ODE Broken Links Modal (stub) -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalOdeBrokenLinks" role="dialog" aria-hidden="true" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Broken Links', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        </div>

        <!-- ODE Used Files Modal (stub) -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalOdeUsedFiles" role="dialog" aria-hidden="true" data-open="false">
            <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Used Files', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        </div>

        <!-- Share Modal (stub) -->
        <div class="modal exe-modal-fade" tabindex="-1" id="modalShare" role="dialog" aria-hidden="true" data-open="false">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title"><?php esc_html_e( 'Share', 'exelearning' ); ?></div>
                        <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Toasts Container -->
    <div class="toasts-container">
        <div id="toastDefault" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-testid="toast-default">
            <div class="toast-header">
                <strong class="me-auto toast-title"></strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="<?php esc_attr_e( 'Close', 'exelearning' ); ?>"></button>
            </div>
            <div class="toast-body"></div>
        </div>
    </div>

    <!-- WordPress Mock Configuration -->
    <script>
        // Configuration for mock system
        window.wpExeMockConfig = {
            baseUrl: '<?php echo esc_js( $editor_base_url ); ?>',
            basePath: '<?php echo esc_js( $editor_base_url ); ?>',
            attachmentId: <?php echo absint( $attachment_id ); ?>,
            elpUrl: '<?php echo esc_js( $elp_url ); ?>',
            projectId: 'wp-attachment-<?php echo absint( $attachment_id ); ?>',
            restUrl: '<?php echo esc_js( $rest_url ); ?>',
            nonce: '<?php echo esc_js( $nonce ); ?>',
            locale: '<?php echo esc_js( $locale_short ); ?>'
        };

        // eXeLearning configuration (expected by app.js)
        // Note: version is "." to avoid path prefix in asset loading (./libs = /libs)
        window.eXeLearning = {
            version: ".",
            expires: "",
            extension: "elp",
            user: <?php echo wp_json_encode( wp_json_encode( $user_data ) ); ?>,
            config: <?php echo wp_json_encode( wp_json_encode( $config_data ) ); ?>,
            symfony: <?php echo wp_json_encode( wp_json_encode( $symfony_data ) ); ?>,
            mercure: null,
            projectId: "wp-attachment-<?php echo absint( $attachment_id ); ?>"
        };
    </script>

    <!-- Load Mock Data Files (BEFORE app.js) -->
    <script src="<?php echo esc_url( $plugin_assets_url ); ?>/js/api-mock/mock-parameters.js"></script>
    <script src="<?php echo esc_url( $plugin_assets_url ); ?>/js/api-mock/mock-idevices.js"></script>
    <script src="<?php echo esc_url( $plugin_assets_url ); ?>/js/api-mock/mock-themes.js"></script>
    <script src="<?php echo esc_url( $plugin_assets_url ); ?>/js/api-mock/mock-translations.js"></script>
    <script src="<?php echo esc_url( $plugin_assets_url ); ?>/js/api-mock/mock-interceptor.js"></script>

    <!-- jQuery (required by eXeLearning) -->
    <script src="<?php echo esc_url( $editor_base_url ); ?>/libs/jquery/jquery.min.js"></script>
    <script>
        // Ensure jQuery is available globally
        window.$ = window.jQuery = jQuery;
        // Initialize jQuery AJAX mock interceptor
        if (typeof window.wpExeMockSetupJQuery === 'function') {
            window.wpExeMockSetupJQuery();
        }
    </script>

    <!-- External Libraries -->
    <script src="<?php echo esc_url( $editor_base_url ); ?>/libs/jquery-ui/jquery-ui.min.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/libs/bootstrap/bootstrap.bundle.min.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/libs/multi-dropdown.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/libs/interact/interact.min.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/libs/showdown/showdown.min.js"></script>

    <!-- eXeLearning Common Legacy Objects -->
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/common_i18n.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/common_edition.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/common.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_effects/exe_effects.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_games/exe_games.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_highlighter/exe_highlighter.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_lightbox/exe_lightbox.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_media/exe_media.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/exe_math/tex-mml-svg.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/common/fix_webm_duration/fix_webm_duration.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/libs/abcjs/exe_abc_music.js"></script>

    <!-- TinyMCE -->
    <script src="<?php echo esc_url( $editor_base_url ); ?>/libs/tinymce_5/js/tinymce/tinymce.min.js"></script>
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/editor/tinymce_5_settings.js"></script>

    <!-- Yjs Collaborative Editing Loader -->
    <script src="<?php echo esc_url( $editor_base_url ); ?>/app/yjs/yjs-loader.js"></script>

    <!-- eXeLearning Common App Module -->
    <script type="module" src="<?php echo esc_url( $editor_base_url ); ?>/app/common/app_common.js"></script>

    <!-- eXeLearning Main App -->
    <script type="module" src="<?php echo esc_url( $editor_base_url ); ?>/app/app.js"></script>

    <!-- WordPress Integration Bridge -->
    <script>
        (function() {
            'use strict';

            // Wait for eXeLearning app to initialize
            function waitForApp(callback, maxAttempts = 50) {
                let attempts = 0;
                const check = () => {
                    attempts++;
                    if (window.eXeLearning && window.eXeLearning.app) {
                        callback();
                    } else if (attempts < maxAttempts) {
                        setTimeout(check, 200);
                    } else {
                        console.error('[WP-EXE] App did not initialize in time');
                    }
                };
                check();
            }

            // WordPress save functionality
            const wpSaveBtn = document.getElementById('wp-save-btn');

            wpSaveBtn.addEventListener('click', async function() {
                try {
                    wpSaveBtn.disabled = true;
                    wpSaveBtn.textContent = '<?php echo esc_js( __( 'Saving...', 'exelearning' ) ); ?>';

                    // Get the export blob from eXeLearning
                    const app = window.eXeLearning.app;
                    if (!app || !app.project) {
                        throw new Error('eXeLearning app not ready');
                    }

                    // Use ElpxExporter to generate blob
                    const { ElpxExporter } = await import('<?php echo esc_js( $editor_base_url ); ?>/app/workarea/project/elpxExporter.js');
                    const exporter = new ElpxExporter(app);
                    const blob = await exporter.exportToBlob();

                    // Upload to WordPress
                    const formData = new FormData();
                    formData.append('file', blob, 'project.elp');

                    const response = await fetch(
                        window.wpExeMockConfig.restUrl + '/save/' + window.wpExeMockConfig.attachmentId,
                        {
                            method: 'POST',
                            headers: {
                                'X-WP-Nonce': window.wpExeMockConfig.nonce
                            },
                            body: formData
                        }
                    );

                    const result = await response.json();

                    if (result.success) {
                        // Notify parent window
                        if (window.parent !== window) {
                            window.parent.postMessage({
                                type: 'exelearning-save-complete',
                                attachmentId: window.wpExeMockConfig.attachmentId
                            }, '*');
                        }
                        alert('<?php echo esc_js( __( 'File saved successfully!', 'exelearning' ) ); ?>');
                    } else {
                        throw new Error(result.message || 'Save failed');
                    }
                } catch (error) {
                    console.error('[WP-EXE] Save error:', error);
                    alert('<?php echo esc_js( __( 'Error saving file:', 'exelearning' ) ); ?> ' + error.message);
                } finally {
                    wpSaveBtn.disabled = false;
                    wpSaveBtn.textContent = '<?php echo esc_js( __( 'Save to WordPress', 'exelearning' ) ); ?>';
                }
            });

            // Initialize when app is ready
            waitForApp(function() {
                console.log('[WP-EXE] App initialized');
                wpSaveBtn.style.display = 'block';

                // Auto-import ELP file if URL is provided
                const elpUrl = window.wpExeMockConfig.elpUrl;
                if (elpUrl) {
                    console.log('[WP-EXE] Auto-importing ELP from:', elpUrl);
                    // Import will be handled by the Yjs/project initialization
                }
            });
        })();
    </script>
</body>
</html>
