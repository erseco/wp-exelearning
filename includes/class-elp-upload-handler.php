<?php
/**
 * File upload handler for eXeLearning files.
 *
 * This class validates and extracts .elp files upon upload.
 *
 * @package Exelearning
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Class ExeLearning_Elp_Upload_Handler.
 *
 * Processes the .elp file uploads.
 */
class ExeLearning_Elp_Upload_Handler {

	/**
	 * Registers the upload filter.
	 */
	public function register() {
		add_filter( 'wp_handle_upload', array( $this, 'process_elp_upload' ) );
		add_action( 'delete_attachment', array( $this, 'exelearning_delete_extracted_folder' ) );

		add_action( 'add_attachment', array( $this, 'save_elp_metadata' ) ); // Nuevo hook para guardar metadatos
	}

	/**
	 * Processes .elp file uploads.
	 *
	 * Checks if the uploaded file is a valid .elp (zip) file, verifies its structure,
	 * and extracts it to a secure folder with a unique hash.
	 *
	 * @param array $upload The upload data.
	 *
	 * @return array|WP_Error Modified upload data or WP_Error on failure.
	 */
	public function process_elp_upload( $upload ) {
		$file = $upload['file'];
		$ext  = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );

		// Process only .elp and .elpx files.
		if ( ! in_array( $ext, array( 'elp', 'elpx' ), true ) ) {
			return $upload;
		}

		// Validate the .elp file using the ELP File Service.
		$elp_service = new ExeLearning_Elp_File_Service();
		$result      = $elp_service->validate_elp_file( $file );

		if ( is_wp_error( $result ) ) {
			@unlink( $file );
			return $result;
		}

		// Determine a secure destination folder.
		$upload_dir  = wp_upload_dir();
		$unique_hash = sha1( $file . time() );
		$destination = trailingslashit( $upload_dir['basedir'] ) . 'exelearning/' . $unique_hash . '/';

		if ( ! wp_mkdir_p( $destination ) ) {
			return new WP_Error( 'mkdir_failed', 'Failed to create directory for extracted files.' );
		}

		// Parse and validate the file
		try {
			$parser = new Exelearning\ELPParser( $file );
			$parser->extract( $destination );

			// Check if index.html exists (only version 3 files have it).
			$has_preview = file_exists( $destination . 'index.html' );

			$post_data = array(
				'post_excerpt' => $parser->getTitle(),     // Title va al caption
				'post_content' => $parser->getDescription(), // Description al content
			);

			// Guardar metadatos en un transitorio
			$metadata = array(
				'_exelearning_title'         => $parser->getTitle(),
				'_exelearning_description'   => $parser->getDescription(),
				'_exelearning_license'       => $parser->getLicense(),
				'_exelearning_language'      => $parser->getLanguage(),
				'_exelearning_resource_type' => $parser->getLearningResourceType(),
				'_exelearning_extracted'     => $unique_hash,
				'_exelearning_version'       => $parser->getVersion(),
				'_exelearning_has_preview'   => $has_preview ? '1' : '0',
			);

			$transient_key = 'exelearning_data_' . md5( $file );

			set_transient(
				$transient_key,
				array(
					'post_data' => $post_data,
					'metadata'  => $metadata,
				),
				300
			);

		} catch ( Exception $e ) {
			@unlink( $file );
			return new WP_Error( 'extract_failed', $e->getMessage() );
		}

		// Optionally, remove the original .elp file.
		// @unlink( $file );

		return $upload;
	}

	/**
	 * Guarda los metadatos del .elp en el attachment.
	 */
	public function save_elp_metadata( $attachment_id ) {
		$file = get_attached_file( $attachment_id );
		if ( ! $file ) {
			return;
		}

		$ext = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );
		if ( ! in_array( $ext, array( 'elp', 'elpx' ), true ) ) {
			return;
		}

		$transient_key = 'exelearning_data_' . md5( $file );
		$data          = get_transient( $transient_key );

		if ( $data ) {
			// Actualizar los campos principales del attachment
			wp_update_post(
				array_merge(
					array( 'ID' => $attachment_id ),
					$data['post_data']
				)
			);

			// Guardar los metadatos adicionales
			foreach ( $data['metadata'] as $key => $value ) {
				update_post_meta( $attachment_id, $key, $value );
			}

			delete_transient( $transient_key );
		}
	}

	/**
	 * Recursively deletes a directory and its contents.
	 *
	 * @param string $dir Directory path.
	 */
	private function exelearning_recursive_delete( $dir ) {
		if ( ! file_exists( $dir ) ) {
			return;
		}
		if ( is_file( $dir ) || is_link( $dir ) ) {
			unlink( $dir );
		} else {
			$files = array_diff( scandir( $dir ), array( '.', '..' ) );
			foreach ( $files as $file ) {
				$this->exelearning_recursive_delete( $dir . DIRECTORY_SEPARATOR . $file );
			}
			rmdir( $dir );
		}
	}

	/**
	 * Deletes the extracted folder associated with an attachment.
	 *
	 * @param int $post_id Attachment ID.
	 */
	function exelearning_delete_extracted_folder( $post_id ) {
		$directory = get_post_meta( $post_id, '_exelearning_extracted', true );

		if ( $directory ) {
			$upload_dir = wp_upload_dir();
			$full_path  = trailingslashit( $upload_dir['basedir'] ) . 'exelearning/' . $directory . '/';

			if ( is_dir( $full_path ) ) {
				$this->exelearning_recursive_delete( $full_path );
			}
		}
	}
}
