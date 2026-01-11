<?php
/**
 * Mime types registration class.
 *
 * This class registers and filters mime types.
 *
 * @package Exelearning
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Class ExeLearning_Mime_Types.
 *
 * Manages custom mime type registration.
 */
class ExeLearning_Mime_Types {

	/**
	 * Registers custom mime types.
	 */
	public function register_mime_types() {
		add_filter( 'upload_mimes', array( $this, 'add_elp_mime_type' ) );
	}

	/**
	 * Adds .elpx mime type.
	 *
	 * @param array $mimes Current mime types.
	 * @return array Modified mime types.
	 */
	public function add_elp_mime_type( $mimes ) {
		// Add .elpx mime type for eXeLearning files (zip is already allowed by WordPress).
		$mimes['elpx'] = 'application/zip';
		return $mimes;
	}
}
