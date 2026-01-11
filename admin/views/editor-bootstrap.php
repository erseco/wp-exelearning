<?php
/**
 * eXeLearning Static Editor Bootstrap
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

// Get parameters.
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
$title = get_the_title( $attachment_id );
if ( empty( $title ) ) {
	$title = $elp_filename ? $elp_filename : 'Untitled';
}

// Static editor base URL.
$editor_base_url = EXELEARNING_PLUGIN_URL . 'dist/static';

// Plugin assets URL.
$plugin_assets_url = EXELEARNING_PLUGIN_URL . 'assets';

// REST API for saving.
$rest_url = rest_url( 'exelearning/v1' );
$nonce    = wp_create_nonce( 'wp_rest' );

// Get locale (ensure it's never null).
$locale       = get_locale();
$locale_short = $locale ? substr( $locale, 0, 2 ) : 'en';

// User data (ensure values are never null).
$current_user = wp_get_current_user();
$user_name    = $current_user->display_name ? $current_user->display_name : 'User';
$user_id      = $current_user->ID ? $current_user->ID : 0;

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

// WordPress-specific styles.
$wp_styles = '
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
$template = str_replace( '</head>', $wp_config_script . $wp_styles . '</head>', $template );

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
