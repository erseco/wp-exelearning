<?php
/**
 * EXeLearning Static Editor Bootstrap
 *
 * Loads the static PWA version of eXeLearning editor with WordPress integration.
 * The static editor is built with `make build-editor` and placed in dist/static/.
 *
 * @package Exelearning
 */

// Security check - this file should only be loaded by WordPress.
if ( ! defined( 'ABSPATH' ) ) {
	die( 'Security check failed' );
}

// Ensure clean output - discard any previous output/warnings.
while ( ob_get_level() > 0 ) {
	ob_end_clean();
}

// Get parameters - nonce verification is done in ExeLearning_Editor class before loading this template.
// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Nonce verified in class-exelearning-editor.php
$attachment_id = isset( $_GET['attachment_id'] ) ? absint( $_GET['attachment_id'] ) : 0;

// Get the ELP file URL and info.
$elp_url      = '';
$elp_filename = '';
if ( $attachment_id ) {
	$url = wp_get_attachment_url( $attachment_id );
	if ( $url ) {
		$elp_url = $url;
	}
	$file = get_attached_file( $attachment_id );
	if ( $file ) {
		$elp_filename = basename( $file );
	}
}

// Get attachment title (ensure it's never null).
$page_title = get_the_title( $attachment_id );
if ( empty( $page_title ) ) {
	$page_title = $elp_filename ? $elp_filename : 'Untitled';
}

// Static editor base URL.
$editor_base_url = EXELEARNING_PLUGIN_URL . 'dist/static';

// Plugin assets URL.
$plugin_assets_url = EXELEARNING_PLUGIN_URL . 'assets';

// REST API for saving.
$rest_url = rest_url( 'exelearning/v1' );
$nonce    = wp_create_nonce( 'wp_rest' );

// Get locale (ensure it's never null).
$site_locale  = get_locale();
$locale_short = $site_locale ? substr( $site_locale, 0, 2 ) : 'en';

// User data (ensure values are never null).
$user_data = wp_get_current_user();
$user_name = $user_data->display_name ? $user_data->display_name : 'User';
$user_id   = $user_data->ID ? $user_data->ID : 0;

// Check if static editor exists.
$static_index = EXELEARNING_PLUGIN_DIR . 'dist/static/index.html';
if ( ! file_exists( $static_index ) ) {
	wp_die(
		esc_html__( 'eXeLearning static editor not found. Please run "make build-editor" in the plugin directory.', 'exelearning' ),
		esc_html__( 'Editor Missing', 'exelearning' ),
		array( 'response' => 500 )
	);
}

// Load the static index.html.
// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
$template = file_get_contents( $static_index );

if ( false === $template || empty( $template ) ) {
	wp_die(
		esc_html__( 'Failed to load eXeLearning editor template.', 'exelearning' ),
		esc_html__( 'Template Error', 'exelearning' ),
		array( 'response' => 500 )
	);
}

// Translations for JavaScript.
$i18n = array(
	'saving'     => __( 'Saving...', 'exelearning' ),
	'saved'      => __( 'Saved to WordPress successfully', 'exelearning' ),
	'saveButton' => __( 'Save to WordPress', 'exelearning' ),
	'loading'    => __( 'Loading project...', 'exelearning' ),
	'error'      => __( 'Error', 'exelearning' ),
);

// Inject WordPress configuration BEFORE the closing </head> tag.
// phpcs:disable WordPress.WP.EnqueuedResources.NonEnqueuedScript -- Standalone HTML page output, not a WordPress template.
$wp_config_script = sprintf(
	'
    <!-- WordPress Integration Configuration -->
    <script>
        // WordPress Integration Configuration
        window.__WP_EXE_CONFIG__ = {
            mode: "WordPress",
            attachmentId: %d,
            elpUrl: %s,
            projectId: %s,
            restUrl: %s,
            nonce: %s,
            locale: %s,
            userName: %s,
            userId: %d,
            editorBaseUrl: %s,
            i18n: %s
        };

        // Override static mode detection for WordPress
        window.__EXE_STATIC_MODE__ = true;
        window.__EXE_WP_MODE__ = true;

        // Disable Service Worker in WordPress mode to prevent path conflicts
        // and caching issues (especially in WordPress Playground)
        if ("serviceWorker" in navigator) {
            // Prevent new service worker registrations
            navigator.serviceWorker.register = function() {
                console.log("[WP Mode] Service worker registration disabled");
                return Promise.resolve({ scope: "" });
            };
            // Unregister any existing service workers
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                registrations.forEach(function(registration) {
                    registration.unregister();
                    console.log("[WP Mode] Service worker unregistered");
                });
            });
        }

        // Workaround for WordPress Playground: Handle 404 errors for CSS/JS files gracefully
        // Playground sometimes fails to serve deeply nested static files from plugins
        (function() {
            // Patch jQuery.ajax to handle CSS/JS 404s without breaking
            var patchJQuery = function() {
                if (typeof jQuery === "undefined" || !jQuery.ajax) return;

                var originalAjax = jQuery.ajax;
                jQuery.ajax = function(url, settings) {
                    // Normalize arguments
                    if (typeof url === "object") {
                        settings = url;
                        url = settings.url;
                    }
                    settings = settings || {};
                    var requestUrl = url || settings.url || "";

                    // For CSS files, intercept and return resolved promise on 404
                    if (requestUrl.includes(".css") || (requestUrl.includes("idevices") && requestUrl.includes("export"))) {
                        // Create a deferred that we control
                        var deferred = jQuery.Deferred();
                        var promise = deferred.promise();

                        // Add jqXHR-like methods to the promise
                        promise.done = function(fn) { deferred.done(fn); return this; };
                        promise.fail = function(fn) { deferred.fail(fn); return this; };
                        promise.always = function(fn) { deferred.always(fn); return this; };

                        // Make the real request
                        originalAjax.call(this, url, settings)
                            .done(function(data, textStatus, jqXHR) {
                                deferred.resolve(data, textStatus, jqXHR);
                            })
                            .fail(function(jqXHR, textStatus, errorThrown) {
                                // On 404, resolve with empty content instead of rejecting
                                console.warn("[WP Mode] CSS 404 intercepted, returning empty:", requestUrl);
                                deferred.resolve("/* empty - file not found */", "success", jqXHR);
                            });

                        return promise;
                    }

                    return originalAjax.call(this, url, settings);
                };
                console.log("[WP Mode] jQuery.ajax patched for CSS fallback");
            };

            // Patch immediately if jQuery is available, or wait for it
            if (typeof jQuery !== "undefined") {
                patchJQuery();
            } else {
                document.addEventListener("DOMContentLoaded", patchJQuery);
            }

            // Also patch fetch for any fetch-based CSS loading
            var originalFetch = window.fetch;
            window.fetch = function(input, init) {
                var url = typeof input === "string" ? input : (input && input.url) || "";
                return originalFetch.apply(this, arguments).then(function(response) {
                    // If CSS file returned 404, return empty response instead
                    if (!response.ok && (url.includes(".css") || url.includes("idevices"))) {
                        console.warn("[WP Mode] Fetch 404 fallback:", url);
                        return new Response("/* empty fallback */", {
                            status: 200,
                            headers: { "Content-Type": "text/css" }
                        });
                    }
                    return response;
                }).catch(function(error) {
                    if (url.includes(".css") || url.includes("idevices")) {
                        console.warn("[WP Mode] Fetch error fallback:", url);
                        return new Response("/* empty fallback */", {
                            status: 200,
                            headers: { "Content-Type": "text/css" }
                        });
                    }
                    throw error;
                });
            };
        })();
    </script>
    <script src="%s/js/wp-exe-bridge.js"></script>
',
	$attachment_id,
	wp_json_encode( $elp_url ),
	wp_json_encode( 'wp-attachment-' . $attachment_id ),
	wp_json_encode( $rest_url ),
	wp_json_encode( $nonce ),
	wp_json_encode( $locale_short ),
	wp_json_encode( $user_name ),
	$user_id,
	wp_json_encode( $editor_base_url ),
	wp_json_encode( $i18n ),
	esc_url( $plugin_assets_url )
);
// phpcs:enable WordPress.WP.EnqueuedResources.NonEnqueuedScript

// WordPress-specific styles.
$page_styles = '
    <!-- WordPress-specific styles -->
    <style>
        /* WordPress-specific overrides */
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }

        /* WordPress notification */
        .wp-exe-notification {
            position: fixed;
            top: 60px;
            right: 10px;
            z-index: 10001;
            padding: 12px 20px;
            border-radius: 4px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: opacity 0.3s ease;
        }
        .wp-exe-notification--success {
            background: #00a32a;
            color: white;
        }
        .wp-exe-notification--error {
            background: #d63638;
            color: white;
        }
        .wp-exe-notification--fade {
            opacity: 0;
        }

        /* Hide menu items not needed in WordPress */
        .menu-file-new,
        .menu-file-open,
        .menu-file-save,
        .menu-file-save-as,
        .menu-cloud-storage,
        [data-action="newProject"],
        [data-action="openUserOdeFiles"],
        [data-action="save"],
        [data-action="saveAs"],
        [data-action="uploadToDrive"],
        [data-action="uploadToDropbox"] {
            display: none !important;
        }

        /* Hide eXeLearning built-in Save button in the header */
        #head-top-save-button {
            display: none !important;
        }
    </style>
';

// Insert config script and styles before </head>.
$template = str_replace( '</head>', $wp_config_script . $page_styles . '</head>', $template );

// Add <base> tag to set the base URL for all relative paths.
// This ensures paths like "files/perm/..." resolve to the static editor directory.
$base_tag = sprintf( '<base href="%s/">', esc_url( $editor_base_url ) );
$template = preg_replace( '/(<head[^>]*>)/i', '$1' . $base_tag, $template );

// Fix asset paths: Replace relative paths with absolute plugin paths.
// The static build uses relative paths like "./app/", we need absolute paths.
// Note: The <base> tag handles most paths, but explicit "./" paths in attributes need fixing.
$template = preg_replace(
	'/(?<=["\'])\.\//',
	esc_url( $editor_base_url ) . '/',
	$template
);

// Send proper headers.
if ( ! headers_sent() ) {
	header( 'Content-Type: text/html; charset=utf-8' );
	header( 'X-Content-Type-Options: nosniff' );
}

// Output the processed template.
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
echo $template;
