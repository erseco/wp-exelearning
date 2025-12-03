<?php
/**
 * eXeLearning Editor Bootstrap Page
 *
 * This page loads the eXeLearning editor with API mocking for WordPress integration.
 * Uses pre-compiled Nunjucks templates from dist/workarea.html.
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

// Get locale.
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
	'basePath'                       => $editor_base_url,
	'baseURL'                        => '',
	'fullURL'                        => $editor_base_url,
	'changelogURL'                   => $editor_base_url . '/CHANGELOG.md',
	'locale'                         => $locale_short,
	'environment'                    => 'prod',
	'themeBaseType'                  => 'base',
	'themeTypeBase'                  => 'base',
	'themeTypeUser'                  => 'user',
	'ideviceTypeBase'                => 'base',
	'ideviceTypeUser'                => 'user',
	'ideviceVisibilityPreferencePre' => 'idevice_visibility_',
	'filesDirPermission'             => array(
		'checked' => true,
		'info'    => array(),
	),
);

// App config.
$config_data = array(
	'isOfflineInstallation'        => true,
	'enableCollaborativeEditing'   => false,
	'userStyles'                   => false,
	'userIdevices'                 => false,
	'defaultTheme'                 => 'base',
	'clientCallWaitingTime'        => 30000,
	'clientIntervalUpdate'         => 60000,
	'clientIntervalGetLastEdition' => 60000,
	'sessionCheckInterval'         => 300000,
	'platformUrlSet'               => '',
	'platformUrlGet'               => '',
);

// Version string.
$version = '.';

// Load compiled template.
$template_path = EXELEARNING_PLUGIN_DIR . 'dist/workarea.html';
if ( ! file_exists( $template_path ) ) {
	wp_die(
		esc_html__( 'eXeLearning editor template not found. Please run "npm run build" in the plugin directory.', 'exelearning' ),
		esc_html__( 'Template Missing', 'exelearning' ),
		array( 'response' => 500 )
	);
}

// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
$template = file_get_contents( $template_path );

// Replace placeholders.
$template = str_replace( '{{ASSET_BASE_URL}}', esc_url( $editor_base_url ), $template );
$template = str_replace( '{{VERSION}}', esc_attr( $version ), $template );

// Find and replace the entire script block containing window.eXeLearning.
$wp_exe_script = sprintf(
	'<script class="exe">
        window.eXeLearning = {
            version: %s,
            expires: "",
            extension: "elp",
            user: %s,
            config: %s,
            symfony: %s,
            mercure: null,
            projectId: %s
        }
    </script>',
	wp_json_encode( $version ),
	wp_json_encode( wp_json_encode( $user_data ) ),
	wp_json_encode( wp_json_encode( $config_data ) ),
	wp_json_encode( wp_json_encode( $symfony_data ) ),
	wp_json_encode( 'wp-attachment-' . $attachment_id )
);

// Replace the entire script block containing window.eXeLearning.
// Match from <script> containing window.eXeLearning to the closing </script>.
$template = preg_replace(
	'/<script[^>]*>\s*window\.eXeLearning\s*=\s*\{[^<]*\}\s*<\/script>/s',
	$wp_exe_script,
	$template
);

// Inject WordPress configuration and mock scripts before app.js.
$wp_scripts = '
    <!-- WordPress Mock Configuration -->
    <script>
        window.wpExeMockConfig = {
            baseUrl: ' . wp_json_encode( $editor_base_url ) . ',
            basePath: ' . wp_json_encode( $editor_base_url ) . ',
            attachmentId: ' . absint( $attachment_id ) . ',
            elpUrl: ' . wp_json_encode( $elp_url ) . ',
            projectId: ' . wp_json_encode( 'wp-attachment-' . $attachment_id ) . ',
            restUrl: ' . wp_json_encode( $rest_url ) . ',
            nonce: ' . wp_json_encode( $nonce ) . ',
            locale: ' . wp_json_encode( $locale_short ) . '
        };
    </script>

    <!-- Mock Data Files -->
    <script src="' . esc_url( $plugin_assets_url ) . '/js/api-mock/mock-parameters.js"></script>
    <script src="' . esc_url( $plugin_assets_url ) . '/js/api-mock/mock-idevices.js"></script>
    <script src="' . esc_url( $plugin_assets_url ) . '/js/api-mock/mock-themes.js"></script>
    <script src="' . esc_url( $plugin_assets_url ) . '/js/api-mock/mock-translations.js"></script>
    <script src="' . esc_url( $plugin_assets_url ) . '/js/api-mock/mock-interceptor.js"></script>

    <!-- Initialize jQuery AJAX interceptor after jQuery loads -->
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            if (typeof window.wpExeMockSetupJQuery === "function") {
                window.wpExeMockSetupJQuery();
            }
        });
    </script>
';

// Insert mock scripts before the app.js script tag.
$template = preg_replace(
	'/(<script[^>]*src="[^"]*\/app\/app\.js"[^>]*>)/i',
	$wp_scripts . "\n    $1",
	$template
);

// Add WordPress-specific styles.
$wp_styles = '
    <style>
        /* WordPress specific styles */
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
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
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .wp-save-button:hover {
            background: #135e96;
            border-color: #135e96;
        }
        /* Hide elements not needed in WordPress mode */
        .menu-file-open, .menu-file-save-as, .menu-cloud-storage,
        [data-action="openUserOdeFiles"], [data-action="saveAs"] {
            display: none !important;
        }
    </style>
';

// Insert styles before </head>.
$template = str_replace( '</head>', $wp_styles . "\n</head>", $template );

// Add WordPress save button after body tag.
$wp_save_button = '
    <!-- WordPress Save Button -->
    <button type="button" class="btn btn-primary wp-save-button" id="wp-save-btn" style="display: none;">
        ' . esc_html__( 'Save to WordPress', 'exelearning' ) . '
    </button>
';

$template = preg_replace(
	'/(<body[^>]*>)/i',
	"$1\n" . $wp_save_button,
	$template
);

// Add WordPress integration bridge script before </body>.
$wp_bridge_script = '
    <!-- WordPress Integration Bridge -->
    <script>
        (function() {
            "use strict";

            function waitForApp(callback, maxAttempts) {
                maxAttempts = maxAttempts || 50;
                var attempts = 0;
                var check = function() {
                    attempts++;
                    if (window.eXeLearning && window.eXeLearning.app) {
                        callback();
                    } else if (attempts < maxAttempts) {
                        setTimeout(check, 200);
                    } else {
                        console.error("[WP-EXE] App did not initialize in time");
                    }
                };
                check();
            }

            var wpSaveBtn = document.getElementById("wp-save-btn");

            wpSaveBtn.addEventListener("click", async function() {
                try {
                    wpSaveBtn.disabled = true;
                    wpSaveBtn.textContent = ' . wp_json_encode( __( 'Saving...', 'exelearning' ) ) . ';

                    var app = window.eXeLearning.app;
                    if (!app || !app.project) {
                        throw new Error("eXeLearning app not ready");
                    }

                    // Use ElpxExporter to generate blob
                    var ElpxExporter = (await import(window.wpExeMockConfig.baseUrl + "/app/workarea/project/elpxExporter.js")).ElpxExporter;
                    var exporter = new ElpxExporter(app);
                    var blob = await exporter.exportToBlob();

                    // Upload to WordPress
                    var formData = new FormData();
                    formData.append("file", blob, "project.elp");

                    var response = await fetch(
                        window.wpExeMockConfig.restUrl + "/save/" + window.wpExeMockConfig.attachmentId,
                        {
                            method: "POST",
                            headers: { "X-WP-Nonce": window.wpExeMockConfig.nonce },
                            body: formData
                        }
                    );

                    var result = await response.json();

                    if (result.success) {
                        if (window.parent !== window) {
                            window.parent.postMessage({
                                type: "exelearning-save-complete",
                                attachmentId: window.wpExeMockConfig.attachmentId
                            }, "*");
                        }
                        alert(' . wp_json_encode( __( 'File saved successfully!', 'exelearning' ) ) . ');
                    } else {
                        throw new Error(result.message || "Save failed");
                    }
                } catch (error) {
                    console.error("[WP-EXE] Save error:", error);
                    alert(' . wp_json_encode( __( 'Error saving file:', 'exelearning' ) ) . ' + " " + error.message);
                } finally {
                    wpSaveBtn.disabled = false;
                    wpSaveBtn.textContent = ' . wp_json_encode( __( 'Save to WordPress', 'exelearning' ) ) . ';
                }
            });

            waitForApp(async function() {
                console.log("[WP-EXE] App initialized");
                wpSaveBtn.style.display = "block";

                var elpUrl = window.wpExeMockConfig.elpUrl;
                if (elpUrl) {
                    console.log("[WP-EXE] Auto-importing ELP from:", elpUrl);
                    await importElpFromUrl(elpUrl);
                }
            });

            /**
             * Import ELP file from a URL
             * @param {string} url - URL to the ELP file
             */
            async function importElpFromUrl(url) {
                // Show loading indicator
                var loadScreen = document.getElementById("load-screen-main");
                var loadMessage = loadScreen ? loadScreen.querySelector(".loading-message, .load-screen-text, p") : null;
                if (loadScreen) {
                    loadScreen.classList.remove("hide");
                    if (loadMessage) {
                        loadMessage.textContent = ' . wp_json_encode( __( 'Loading project...', 'exelearning' ) ) . ';
                    }
                }

                try {
                    // Wait for YjsModules bridge to be ready
                    var bridge = await waitForBridge(30);
                    if (!bridge) {
                        throw new Error("YjsProjectBridge not available");
                    }

                    // Check if project already has content in IndexedDB (avoid re-import)
                    var nav = bridge.structureBinding ? bridge.structureBinding.getNavigationArray() : null;
                    var hasExistingContent = nav && nav.length > 0;

                    if (hasExistingContent) {
                        console.log("[WP-EXE] Project already has", nav.length, "pages in IndexedDB, skipping import");
                        if (loadMessage) {
                            loadMessage.textContent = ' . wp_json_encode( __( 'Loading cached project...', 'exelearning' ) ) . ';
                        }
                    } else {
                        console.log("[WP-EXE] Fetching ELP file...");
                        if (loadMessage) {
                            loadMessage.textContent = ' . wp_json_encode( __( 'Downloading file...', 'exelearning' ) ) . ';
                        }

                        // Fetch the ELP file
                        var response = await fetch(url);
                        if (!response.ok) {
                            throw new Error("Failed to fetch ELP file: " + response.status + " " + response.statusText);
                        }

                        // Get filename from URL
                        var urlParts = url.split("/");
                        var filename = urlParts[urlParts.length - 1] || "project.elp";
                        // Remove query string if present
                        filename = filename.split("?")[0];

                        // Convert to File object
                        var blob = await response.blob();
                        var file = new File([blob], filename, { type: blob.type || "application/zip" });

                        console.log("[WP-EXE] ELP file loaded:", filename, "size:", file.size);
                        if (loadMessage) {
                            loadMessage.textContent = ' . wp_json_encode( __( 'Importing content...', 'exelearning' ) ) . ';
                        }

                        // Import the ELP file with progress callback
                        var stats = await bridge.importFromElpx(file, {
                            clearExisting: true,
                            onProgress: function(progress) {
                                console.log("[WP-EXE] Import progress:", progress.phase, progress.percent + "%", progress.message);
                                if (loadMessage) {
                                    loadMessage.textContent = progress.message || ' . wp_json_encode( __( 'Importing...', 'exelearning' ) ) . ';
                                }
                            }
                        });

                        console.log("[WP-EXE] ELP imported successfully:", stats);
                    }

                    if (loadMessage) {
                        loadMessage.textContent = ' . wp_json_encode( __( 'Project loaded!', 'exelearning' ) ) . ';
                    }

                    // Trigger a structure refresh to update the UI
                    if (window.eXeLearning && window.eXeLearning.app) {
                        // Trigger structure tree update
                        if (window.eXeLearning.app.structureTreeBuilder) {
                            window.eXeLearning.app.structureTreeBuilder.refresh();
                        }
                        // Navigate to first page if available
                        var nav = bridge.structureBinding ? bridge.structureBinding.getNavigationArray() : null;
                        if (nav && nav.length > 0) {
                            var firstPage = nav.get(0);
                            if (firstPage) {
                                var pageId = firstPage.get("id") || firstPage.get("pageId");
                                if (pageId && window.eXeLearning.app.navigation) {
                                    console.log("[WP-EXE] Navigating to first page:", pageId);
                                    setTimeout(function() {
                                        window.eXeLearning.app.navigation.goTo(pageId);
                                    }, 500);
                                }
                            }
                        }
                    }

                } catch (error) {
                    console.error("[WP-EXE] Failed to import ELP:", error);
                    if (loadMessage) {
                        loadMessage.textContent = ' . wp_json_encode( __( 'Error loading project', 'exelearning' ) ) . ';
                    }
                    alert(' . wp_json_encode( __( 'Error loading project:', 'exelearning' ) ) . ' + " " + error.message);
                } finally {
                    // Hide loading screen after a short delay
                    setTimeout(function() {
                        if (loadScreen) {
                            loadScreen.classList.add("hide");
                        }
                    }, 500);
                }
            }

            /**
             * Wait for YjsProjectBridge to be ready
             * @param {number} maxAttempts - Maximum attempts (default 30)
             * @returns {Promise<Object|null>} The bridge instance or null
             */
            function waitForBridge(maxAttempts) {
                maxAttempts = maxAttempts || 30;
                return new Promise(function(resolve) {
                    var attempts = 0;
                    var check = function() {
                        attempts++;
                        // Check for bridge via YjsModules
                        var bridge = window.YjsModules && window.YjsModules.getBridge ? window.YjsModules.getBridge() : null;
                        if (bridge && bridge.initialized) {
                            resolve(bridge);
                        } else if (attempts < maxAttempts) {
                            setTimeout(check, 200);
                        } else {
                            console.error("[WP-EXE] YjsProjectBridge did not initialize in time");
                            resolve(null);
                        }
                    };
                    check();
                });
            }
        })();
    </script>
';

$template = str_replace( '</body>', $wp_bridge_script . "\n</body>", $template );

// Output the processed template.
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
echo $template;
