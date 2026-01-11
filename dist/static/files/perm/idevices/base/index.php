<?php
/**
 * Static file server for eXeLearning iDevice resources.
 *
 * This script serves static files when requested via the ?resource= parameter.
 * Used for dynamic script/CSS loading in the eXeLearning frontend.
 *
 * Expected URL pattern:
 * /files/perm/idevices/base?resource=perm/idevices/base/text/edition/text.js
 *
 * @package Exelearning
 */

// If no resource parameter, just return 404 (don't list directory).
if ( ! isset( $_GET['resource'] ) || empty( $_GET['resource'] ) ) {
	http_response_code( 404 );
	echo 'Resource parameter required';
	exit;
}

$resource = $_GET['resource'];

// Security: prevent directory traversal.
$resource = str_replace( '..', '', $resource );
$resource = str_replace( "\0", '', $resource );

// Remove leading slash (normalize path).
$resource = ltrim( $resource, '/' );

// Build the file path - go up to /public/files/ directory.
// From /files/perm/idevices/base/index.php, we need to go up 4 levels to get to /files/
$base_path = dirname( dirname( dirname( __DIR__ ) ) ); // Go up to /public/files/
$file_path = $base_path . '/' . $resource;

// Normalize the path.
$real_file_path = realpath( $file_path );
$allowed_base   = realpath( $base_path );

if ( ! $real_file_path || strpos( $real_file_path, $allowed_base ) !== 0 ) {
	http_response_code( 404 );
	echo 'File not found: ' . htmlspecialchars( $resource );
	exit;
}

if ( ! is_file( $real_file_path ) ) {
	http_response_code( 404 );
	echo 'File not found: ' . htmlspecialchars( $resource );
	exit;
}

// Determine content type.
$extension  = strtolower( pathinfo( $real_file_path, PATHINFO_EXTENSION ) );
$mime_types = array(
	'css'   => 'text/css',
	'js'    => 'application/javascript',
	'json'  => 'application/json',
	'svg'   => 'image/svg+xml',
	'png'   => 'image/png',
	'jpg'   => 'image/jpeg',
	'jpeg'  => 'image/jpeg',
	'gif'   => 'image/gif',
	'webp'  => 'image/webp',
	'woff'  => 'font/woff',
	'woff2' => 'font/woff2',
	'ttf'   => 'font/ttf',
	'eot'   => 'application/vnd.ms-fontobject',
	'html'  => 'text/html',
	'xml'   => 'application/xml',
	'txt'   => 'text/plain',
	'mp3'   => 'audio/mpeg',
	'mp4'   => 'video/mp4',
	'webm'  => 'video/webm',
	'ogg'   => 'audio/ogg',
	'pdf'   => 'application/pdf',
);

$content_type = isset( $mime_types[ $extension ] ) ? $mime_types[ $extension ] : 'application/octet-stream';

// Set headers.
header( 'Content-Type: ' . $content_type );
header( 'Content-Length: ' . filesize( $real_file_path ) );
header( 'Cache-Control: public, max-age=86400' ); // Cache for 1 day.

// Output the file.
readfile( $real_file_path );
exit;
