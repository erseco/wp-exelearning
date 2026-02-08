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
	$is_dev_install = ( '0.0.0' === EXELEARNING_VERSION );

	if ( $is_dev_install ) {
		$message = sprintf(
			/* translators: %1$s: line break, %2$s/%3$s: link tags, %4$s/%5$s: code tags */
			__( 'eXeLearning editor not found. You appear to have cloned this repository directly. Please either: %1$s1. Download the plugin from %2$sGitHub Releases%3$s, or %1$s2. Build the editor with: %4$smake build-editor%5$s', 'exelearning' ),
			'<br>',
			'<a href="https://github.com/erseco/wp-exelearning/releases">',
			'</a>',
			'<code>',
			'</code>'
		);
	} else {
		$message = __( 'eXeLearning editor files are missing. Please reinstall the plugin from the official release.', 'exelearning' );
	}

	wp_die(
		wp_kses_post( $message ),
		esc_html__( 'Editor Missing', 'exelearning' ),
		array(
			'response'  => 500,
			'back_link' => true,
		)
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

        // ============================================================
        // FIX 1: Set basePath for ResourceFetcher BEFORE app loads
        // ============================================================
        // The ResourceFetcher constructs URLs using window.eXeLearning.config.basePath
        // In WordPress, the auto-detected basePath is wrong (/wp-admin/admin.php)
        // We need to force it to the actual editor location
        window.__EXE_FORCE_BASE_PATH__ = window.__WP_EXE_CONFIG__.editorBaseUrl;

        // Intercept when the app sets eXeLearning.config and fix basePath
        (function() {
            var _eXeLearning = null;
            Object.defineProperty(window, "eXeLearning", {
                configurable: true,
                enumerable: true,
                get: function() { return _eXeLearning; },
                set: function(val) {
                    _eXeLearning = val;
                    // When app sets eXeLearning object, watch for config changes
                    if (val && typeof val === "object") {
                        var _config = val.config;
                        Object.defineProperty(val, "config", {
                            configurable: true,
                            enumerable: true,
                            get: function() { return _config; },
                            set: function(configVal) {
                                _config = configVal;
                                // Fix basePath whenever config is set
                                if (_config && typeof _config === "object") {
                                    var correctBasePath = window.__WP_EXE_CONFIG__.editorBaseUrl;
                                    if (_config.basePath !== correctBasePath) {
                                        console.log("[WP Mode] Fixing basePath:", _config.basePath, "->", correctBasePath);
                                        _config.basePath = correctBasePath;
                                    }
                                }
                            }
                        });
                        // Also fix if config already exists
                        if (_config && typeof _config === "object") {
                            var correctBasePath = window.__WP_EXE_CONFIG__.editorBaseUrl;
                            if (_config.basePath !== correctBasePath) {
                                console.log("[WP Mode] Fixing existing basePath:", _config.basePath, "->", correctBasePath);
                                _config.basePath = correctBasePath;
                            }
                        }
                    }
                }
            });
        })();

        // ============================================================
        // FIX 2: Service Worker handling for Preview Panel
        // ============================================================
        // The preview panel needs a SW to serve generated HTML at /viewer/*.
        // In WordPress, SW registration often fails due to scope restrictions.
        // We provide: (A) a mock SW that stores content in memory and speaks
        // the MessageChannel protocol, and (B) a MutationObserver that
        // intercepts iframe navigations to /viewer/* and serves blob URLs
        // from the mock SW in-memory content store.

        // Shared content store used by mock preview SW.
        var __wpExePreviewContent = new Map();
        var __wpExeContentReady = false;

        if ("serviceWorker" in navigator) {
            // Mock ServiceWorker that handles the preview-sw.js protocol.
            var __wpExeMockSW = {
                scriptURL: window.__WP_EXE_CONFIG__.editorBaseUrl + "/preview-sw.js",
                state: "activated",
                onstatechange: null,
                onerror: null,
                addEventListener: function(type, fn) {
                    if (type === "statechange" && typeof fn === "function") {
                        try { fn({ target: __wpExeMockSW }); } catch(e) {}
                    }
                },
                removeEventListener: function() {},
                dispatchEvent: function() { return false; },
                postMessage: function(message, transferables) {
                    if (!message || !message.type) return;
                    var port = (transferables && transferables[0]) || null;
                    var data = message.data || {};
                    switch (message.type) {
                        case "SET_CONTENT":
                            __wpExePreviewContent.clear();
                            // Real SW uses data.files as an Object { path: buffer }.
                            if (data.files && typeof data.files === "object") {
                                Object.keys(data.files).forEach(function(path) {
                                    __wpExePreviewContent.set(path, data.files[path]);
                                });
                            }
                            __wpExeContentReady = __wpExePreviewContent.size > 0;
                            if (port && typeof port.postMessage === "function") {
                                port.postMessage({ type: "CONTENT_READY", fileCount: __wpExePreviewContent.size });
                            }
                            break;
                        case "VERIFY_READY":
                            if (port && typeof port.postMessage === "function") {
                                port.postMessage({ type: "READY_VERIFIED", ready: __wpExeContentReady && __wpExePreviewContent.size > 0, fileCount: __wpExePreviewContent.size });
                            }
                            break;
                        case "GET_STATUS":
                            if (port && typeof port.postMessage === "function") {
                                port.postMessage({ type: "STATUS", ready: __wpExeContentReady, fileCount: __wpExePreviewContent.size });
                            }
                            break;
                        case "UPDATE_FILES":
                            if (data.files && typeof data.files === "object") {
                                Object.keys(data.files).forEach(function(path) {
                                    if (data.files[path] === null) {
                                        __wpExePreviewContent.delete(path);
                                    } else {
                                        __wpExePreviewContent.set(path, data.files[path]);
                                    }
                                });
                            }
                            if (port && typeof port.postMessage === "function") {
                                port.postMessage({ type: "FILES_UPDATED", fileCount: __wpExePreviewContent.size });
                            }
                            break;
                        case "CLEAR_CONTENT":
                            __wpExePreviewContent.clear();
                            __wpExeContentReady = false;
                            if (port && typeof port.postMessage === "function") {
                                port.postMessage({ type: "CONTENT_CLEARED" });
                            }
                            break;
                    }
                }
            };

            // Store original register function.
            var originalRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);

            // Override to fix the scope for WordPress.
            navigator.serviceWorker.register = function(scriptURL, options) {
                options = options || {};
                var baseUrl = window.__WP_EXE_CONFIG__.editorBaseUrl;
                var fixedScriptURL = scriptURL;

                // If relative path, make it absolute to the editor base.
                if (typeof scriptURL === "string") {
                    if (scriptURL.startsWith("./")) {
                        fixedScriptURL = baseUrl + "/" + scriptURL.substring(2);
                    } else if (scriptURL.startsWith("/") && !scriptURL.startsWith(baseUrl)) {
                        fixedScriptURL = baseUrl + scriptURL;
                    } else if (!scriptURL.startsWith("http") && !scriptURL.startsWith("/")) {
                        fixedScriptURL = baseUrl + "/" + scriptURL;
                    }
                }

                var fixedOptions = Object.assign({}, options, {
                    scope: baseUrl + "/"
                });

                console.log("[WP Mode] SW register:", fixedScriptURL, "scope:", fixedOptions.scope);
                return originalRegister(fixedScriptURL, fixedOptions).catch(function(error) {
                    console.warn("[WP Mode] SW registration failed, using mock preview SW:", error.message);
                    // Return mock registration with active mock SW so
                    // waitForPreviewServiceWorker() resolves instead of throwing.
                    return Promise.resolve({
                        scope: baseUrl + "/",
                        active: __wpExeMockSW,
                        installing: null,
                        waiting: null,
                        navigationPreload: { enable: function(){}, disable: function(){}, setHeaderValue: function(){}, getState: function(){ return Promise.resolve(); } },
                        onupdatefound: null,
                        addEventListener: function() {},
                        removeEventListener: function() {},
                        dispatchEvent: function() { return false; },
                        update: function() { return Promise.resolve(); },
                        unregister: function() { return Promise.resolve(true); },
                        showNotification: function() { return Promise.resolve(); },
                        getNotifications: function() { return Promise.resolve([]); }
                    });
                });
            };

            // Unregister any existing service workers from wrong scopes.
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                registrations.forEach(function(registration) {
                    if (!registration.scope.includes("/dist/static/")) {
                        registration.unregister();
                        console.log("[WP Mode] Unregistered SW from wrong scope:", registration.scope);
                    }
                });
            });

            // Helper: decode content from the mock SW store to string.
            function __wpExeDecodeContent(content) {
                if (typeof content === "string") return content;
                if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
                    return new TextDecoder().decode(content);
                }
                return String(content);
            }

            // Inline CSS/JS resources into HTML so blob URLs are self-contained.
            // Blob origins cannot resolve relative paths, so all sub-resources
            // must be embedded directly in the HTML document.
            function __wpExeInlineResources(html) {
                // Inline link rel=stylesheet as <style> blocks.
                // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedStylesheet -- JS regex pattern, not PHP.
                html = html.replace(
                    /<link\s+[^>]*rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)["\'][^>]*\/?>/gi,
                    function(match, href) {
                        // Normalize path: strip leading ./ or /
                        var cssPath = href.replace(/^\.\//, "").replace(/^\//, "");
                        var cssContent = __wpExePreviewContent.get(cssPath);
                        if (cssContent) {
                            return "<style>" + __wpExeDecodeContent(cssContent) + "</style>";
                        }
                        return match;
                    }
                );
                // Handle link href before rel attribute order.
                // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedStylesheet -- JS regex pattern, not PHP.
                html = html.replace(
                    /<link\s+[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']stylesheet["\'][^>]*\/?>/gi,
                    function(match, href) {
                        var cssPath = href.replace(/^\.\//, "").replace(/^\//, "");
                        var cssContent = __wpExePreviewContent.get(cssPath);
                        if (cssContent) {
                            return "<style>" + __wpExeDecodeContent(cssContent) + "</style>";
                        }
                        return match;
                    }
                );

                // Inline external script tags as inline scripts.
                html = html.replace(
                    /<script\s+[^>]*src=["\']([^"\']+)["\'][^>]*><\/script>/gi,
                    function(match, src) {
                        var jsPath = src.replace(/^\.\//, "").replace(/^\//, "");
                        var jsContent = __wpExePreviewContent.get(jsPath);
                        if (jsContent) {
                            return "<script>" + __wpExeDecodeContent(jsContent) + "<\/script>";
                        }
                        return match;
                    }
                );

                // Inline <img src="..."> for images stored in the preview content map.
                html = html.replace(
                    /(<img\s+[^>]*src=["\'])([^"\']+)(["\'][^>]*\/?>)/gi,
                    function(match, before, src, after) {
                        var imgPath = src.replace(/^\.\//, "").replace(/^\//, "");
                        var imgContent = __wpExePreviewContent.get(imgPath);
                        if (imgContent && imgContent instanceof ArrayBuffer) {
                            var ext = imgPath.split(".").pop().toLowerCase();
                            var mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp" }[ext] || "application/octet-stream";
                            var bytes = new Uint8Array(imgContent);
                            var binary = "";
                            for (var i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }
                            return before + "data:" + mime + ";base64," + btoa(binary) + after;
                        }
                        return match;
                    }
                );

                return html;
            }

            // Intercept iframe navigations to /viewer/* URLs.
            // When the real SW is unavailable, the preview panel sets
            // iframe.src to /viewer/index.html which would 404. We catch
            // that and serve a blob URL from the mock content store,
            // with all CSS/JS/images inlined so the blob is self-contained.
            new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type !== "attributes" || mutation.attributeName !== "src") return;
                    var el = mutation.target;
                    if (el.tagName !== "IFRAME" || !el.src || !el.src.includes("/viewer/")) return;
                    // Skip blob: URLs (our own output).
                    if (el.src.startsWith("blob:")) return;

                    var filePath = el.src.split("/viewer/").pop() || "index.html";
                    filePath = filePath.split("?")[0].split("#")[0] || "index.html";

                    var content = __wpExePreviewContent.get(filePath);
                    if (content) {
                        var text = __wpExeDecodeContent(content);
                        // Inline all sub-resources so the blob URL is self-contained.
                        text = __wpExeInlineResources(text);
                        el.src = URL.createObjectURL(new Blob([text], { type: "text/html" }));
                        console.log("[WP Mode] Preview served via blob URL for:", filePath, "(resources inlined)");
                    }
                });
            }).observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["src"],
                subtree: true
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

        /*
         * Hide the entire File menu in the WordPress embedded editor.
         * File operations (open, save, export...) are handled by WordPress,
         * so the File menu is not needed and would cause confusion.
         */
        li.nav-item:has(> #dropdownFile),
        /* Hide user menu: preferences use WordPress locale, no need for it */
        #head-bottom-user-logged {
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
