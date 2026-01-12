<?php
/**
 * Secure content proxy for eXeLearning files.
 *
 * Serves extracted eXeLearning content with security headers to prevent:
 * - XSS attacks via malicious content
 * - Clickjacking
 * - Directory traversal attacks
 * - Data exfiltration
 *
 * @package Exelearning
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Class ExeLearning_Content_Proxy.
 *
 * Securely serves extracted eXeLearning content through a REST API endpoint.
 */
class ExeLearning_Content_Proxy {

	/**
	 * MIME types for common file extensions.
	 *
	 * @var array
	 */
	private $mime_types = array(
		'html'  => 'text/html',
		'htm'   => 'text/html',
		'css'   => 'text/css',
		'js'    => 'application/javascript',
		'json'  => 'application/json',
		'xml'   => 'application/xml',
		'png'   => 'image/png',
		'jpg'   => 'image/jpeg',
		'jpeg'  => 'image/jpeg',
		'gif'   => 'image/gif',
		'svg'   => 'image/svg+xml',
		'webp'  => 'image/webp',
		'ico'   => 'image/x-icon',
		'woff'  => 'font/woff',
		'woff2' => 'font/woff2',
		'ttf'   => 'font/ttf',
		'eot'   => 'application/vnd.ms-fontobject',
		'otf'   => 'font/otf',
		'mp3'   => 'audio/mpeg',
		'mp4'   => 'video/mp4',
		'webm'  => 'video/webm',
		'ogg'   => 'audio/ogg',
		'ogv'   => 'video/ogg',
		'wav'   => 'audio/wav',
		'pdf'   => 'application/pdf',
		'zip'   => 'application/zip',
		'txt'   => 'text/plain',
	);

	/**
	 * Base path for extracted eXeLearning content.
	 *
	 * @var string
	 */
	private $base_path;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$upload_dir      = wp_upload_dir();
		$this->base_path = trailingslashit( $upload_dir['basedir'] ) . 'exelearning';
	}

	/**
	 * Serve content from extracted eXeLearning files.
	 *
	 * @param WP_REST_Request $request REST request object.
	 * @return WP_REST_Response|WP_Error Response or error.
	 */
	public function serve_content( $request ) {
		$hash = $request->get_param( 'hash' );
		$file = $request->get_param( 'file' );

		// Validate hash format (SHA1 = 40 hex characters).
		if ( ! $hash || ! preg_match( '/^[a-f0-9]{40}$/i', $hash ) ) {
			return new WP_Error(
				'invalid_hash',
				__( 'Invalid content identifier.', 'exelearning' ),
				array( 'status' => 404 )
			);
		}

		// Default to index.html if no file specified.
		if ( empty( $file ) ) {
			$file = 'index.html';
		}

		// Sanitize and validate file path.
		$file = $this->sanitize_path( $file );
		if ( null === $file ) {
			return new WP_Error(
				'invalid_path',
				__( 'Invalid file path.', 'exelearning' ),
				array( 'status' => 404 )
			);
		}

		// Build full file path.
		$full_path = $this->base_path . '/' . $hash . '/' . $file;

		// Check file exists and is a file.
		if ( ! file_exists( $full_path ) || ! is_file( $full_path ) ) {
			return new WP_Error(
				'file_not_found',
				__( 'File not found.', 'exelearning' ),
				array( 'status' => 404 )
			);
		}

		// Verify file is within the expected directory (protection against symlink attacks).
		$real_path      = realpath( $full_path );
		$real_base_path = realpath( $this->base_path . '/' . $hash );

		if ( false === $real_path || false === $real_base_path || 0 !== strpos( $real_path, $real_base_path ) ) {
			return new WP_Error(
				'access_denied',
				__( 'Access denied.', 'exelearning' ),
				array( 'status' => 403 )
			);
		}

		// Get file info.
		$extension = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );
		$mime_type = isset( $this->mime_types[ $extension ] ) ? $this->mime_types[ $extension ] : 'application/octet-stream';
		$file_size = filesize( $full_path );

		// Send headers.
		$this->send_headers( $mime_type, $file_size );

		// Output file content.
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile -- Direct output needed for streaming file content.
		readfile( $full_path );
		exit;
	}

	/**
	 * Send HTTP headers for the response.
	 *
	 * @param string $mime_type Content MIME type.
	 * @param int    $file_size File size in bytes.
	 */
	private function send_headers( $mime_type, $file_size ) {
		// Content headers.
		header( 'Content-Type: ' . $mime_type );
		header( 'Content-Length: ' . $file_size );

		// Security headers.
		header( 'X-Frame-Options: SAMEORIGIN' );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Referrer-Policy: same-origin' );
		header( 'Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()' );

		// CSP for HTML content.
		if ( false !== strpos( $mime_type, 'text/html' ) ) {
			$csp = implode(
				'; ',
				array(
					"default-src 'self'",
					"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
					"style-src 'self' 'unsafe-inline'",
					"img-src 'self' data: blob: https:",
					"media-src 'self' data: blob: https:",
					"font-src 'self' data:",
					"connect-src 'self'",
					"frame-src 'self' https:",
					"frame-ancestors 'self'",
					"form-action 'self'",
					"base-uri 'self'",
				)
			);
			header( 'Content-Security-Policy: ' . $csp );
		}

		// Cache headers (content is static).
		header( 'Cache-Control: public, max-age=3600' );
	}

	/**
	 * Sanitize file path to prevent directory traversal.
	 *
	 * @param string $path File path to sanitize.
	 * @return string|null Sanitized path or null if invalid.
	 */
	private function sanitize_path( $path ) {
		// Decode URL encoding.
		$path = rawurldecode( $path );

		// Remove null bytes.
		$path = str_replace( "\0", '', $path );

		// Normalize slashes.
		$path = str_replace( '\\', '/', $path );

		// Split and filter path components.
		$parts      = explode( '/', $path );
		$safe_parts = array();

		foreach ( $parts as $part ) {
			// Skip empty parts and current directory references.
			if ( '' === $part || '.' === $part ) {
				continue;
			}
			// Reject any attempt to go up directories.
			if ( '..' === $part ) {
				return null;
			}
			$safe_parts[] = $part;
		}

		if ( empty( $safe_parts ) ) {
			return 'index.html';
		}

		return implode( '/', $safe_parts );
	}

	/**
	 * Generate a proxy URL for the given hash and file.
	 *
	 * @param string $hash Extraction hash.
	 * @param string $file File path (default: index.html).
	 * @return string|null Proxy URL or null if hash is empty.
	 */
	public static function get_proxy_url( $hash, $file = 'index.html' ) {
		if ( empty( $hash ) ) {
			return null;
		}
		return rest_url( 'exelearning/v1/content/' . $hash . '/' . $file );
	}
}
