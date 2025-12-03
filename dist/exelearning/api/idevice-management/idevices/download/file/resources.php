<?php
/**
 * Static file server for eXeLearning WordPress integration.
 *
 * This script serves static files from the /files/ directory when requested
 * via the API endpoint that the eXeLearning frontend expects.
 *
 * Expected URL pattern:
 * /api/idevice-management/idevices/download/file/resources?resource=perm/themes/base/base/style.css
 *
 * @package Exelearning
 */

// Get the requested resource path.
$resource = isset( $_GET['resource'] ) ? $_GET['resource'] : '';

// Security: prevent directory traversal.
$resource = str_replace( '..', '', $resource );
$resource = str_replace( "\0", '', $resource );

// Remove leading slash if present.
$resource = ltrim( $resource, '/' );

// Build the file path - go up to public directory, then into files.
$base_path = dirname( dirname( dirname( dirname( dirname( dirname( __FILE__ ) ) ) ) ) );
$file_path = $base_path . '/files/' . $resource;

// Normalize the path.
$file_path = realpath( $file_path );

// Verify the file exists and is within the allowed directory.
$allowed_base = realpath( $base_path . '/files' );

if ( ! $file_path || strpos( $file_path, $allowed_base ) !== 0 ) {
    http_response_code( 404 );
    echo 'File not found';
    exit;
}

if ( ! is_file( $file_path ) ) {
    http_response_code( 404 );
    echo 'File not found: ' . htmlspecialchars( $resource );
    exit;
}

// Determine content type.
$extension = strtolower( pathinfo( $file_path, PATHINFO_EXTENSION ) );
$mime_types = array(
    'css'  => 'text/css',
    'js'   => 'application/javascript',
    'json' => 'application/json',
    'svg'  => 'image/svg+xml',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif'  => 'image/gif',
    'webp' => 'image/webp',
    'woff' => 'font/woff',
    'woff2'=> 'font/woff2',
    'ttf'  => 'font/ttf',
    'eot'  => 'application/vnd.ms-fontobject',
    'html' => 'text/html',
    'xml'  => 'application/xml',
    'txt'  => 'text/plain',
    'mp3'  => 'audio/mpeg',
    'mp4'  => 'video/mp4',
    'webm' => 'video/webm',
    'ogg'  => 'audio/ogg',
    'pdf'  => 'application/pdf',
);

$content_type = isset( $mime_types[ $extension ] ) ? $mime_types[ $extension ] : 'application/octet-stream';

// Set headers.
header( 'Content-Type: ' . $content_type );
header( 'Content-Length: ' . filesize( $file_path ) );
header( 'Cache-Control: public, max-age=86400' ); // Cache for 1 day.

// Output the file.
readfile( $file_path );
exit;
