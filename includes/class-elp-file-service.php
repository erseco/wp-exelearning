<?php
/**
 * eXeLearning ELP File Service.
 *
 * This service validates and converts .elp files using the ELPParser library.
 *
 * @package Exelearning
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

use Exelearning\ELPParser;

/**
 * Class ExeLearning_Elp_File_Service.
 *
 * Provides methods to validate and convert .elp files.
 */
class ExeLearning_Elp_File_Service {

	/**
	 * Validates an .elp file and converts it to version 3 if needed.
	 *
	 * @param string $file_path Path to the .elp file.
	 * @return array|WP_Error Array with parsed data or WP_Error on failure.
	 */
	public function validate_elp_file( string $file_path ) {
		try {
			$parser = ELPParser::fromFile( $file_path );
		} catch ( Exception $e ) {
			return new WP_Error( 'elp_invalid', $e->getMessage() );
		}

		// Check if the file is version 3.
		if ( $parser->getVersion() === 3 ) {
			return array(
				'status'  => 'valid',
				'version' => 3,
				'data'    => $parser->toArray(),
			);
		}

		// If the file is version 2, convert it to version 3.
		if ( $parser->getVersion() === 2 ) {
			$result = $this->convert_v2_to_v3( $file_path );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
			return array(
				'status'  => 'converted',
				'version' => 3,
				'data'    => $result,
			);
		}

		return new WP_Error( 'elp_unknown_version', 'Unknown ELP file version.' );
	}

	/**
	 * Converts a version 2 .elp file to version 3 format.
	 *
	 * The conversion process may involve re-parsing the file and reformatting the data.
	 * You can extend this method to perform a real conversion.
	 *
	 * @param string $file_path Path to the .elp file.
	 * @return array|WP_Error Parsed data in version 3 format or WP_Error on failure.
	 */
	private function convert_v2_to_v3( string $file_path ) {
		try {
			$parser = ELPParser::fromFile( $file_path );
		} catch ( Exception $e ) {
			return new WP_Error( 'conversion_error', $e->getMessage() );
		}

		// Dummy conversion: reformat the parsed data.
		// Here you should implement the logic to map the version 2 structure
		// to a version 3 format. For now, we assume the data is ready.
		$data = $parser->toArray();

		// Example: adjust keys or structure if needed.
		// $data = $this->adjust_data_to_v3( $data );

		return $data;
	}

	/**
	 * (Optional) Adjust parsed data to the version 3 structure.
	 *
	 * @param array $data Parsed data from a version 2 file.
	 * @return array Converted data in version 3 format.
	 */
	private function adjust_data_to_v3( array $data ): array {
		// Implement conversion logic here.
		// For example, remap keys or change structure.
		return $data;
	}
}
