<?php
/**
 * WP-CLI commands for eXeLearning plugin.
 *
 * This class registers WP-CLI commands for managing eXeLearning files.
 *
 * @package Exelearning
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

if ( defined( 'WP_CLI' ) && WP_CLI ) {

	/**
	 * Class ExeLearning_Admin_WPCLI.
	 *
	 * Provides WP-CLI commands for eXeLearning management.
	 */
	class ExeLearning_Admin_WPCLI {

		/**
		 * Registers WP-CLI commands.
		 */
		public static function register_commands() {
			WP_CLI::add_command( 'exelearning', array( __CLASS__, 'handle_command' ) );
		}

		/**
		 * Handles WP-CLI commands.
		 *
		 * ## OPTIONS
		 *
		 * <action>
		 * : The action to perform. Accepts 'list' or 'delete'.
		 *
		 * [--id=<id>]
		 * : The attachment ID (required for delete action).
		 *
		 * ## EXAMPLES
		 *
		 *     wp exelearning list
		 *     wp exelearning delete --id=123
		 *
		 * @param array $args Command arguments.
		 * @param array $assoc_args Command associative arguments.
		 */
		public static function handle_command( $args, $assoc_args ) {
			$action = isset( $args[0] ) ? $args[0] : '';

			switch ( $action ) {
				case 'list':
					self::list_files();
					break;
				case 'delete':
					if ( empty( $assoc_args['id'] ) ) {
						WP_CLI::error( 'Please provide an attachment ID using --id=<id>' );
					}
					self::delete_file( intval( $assoc_args['id'] ) );
					break;
				default:
					WP_CLI::error( 'Invalid action. Available actions: list, delete' );
					break;
			}
		}

		/**
		 * Lists all eXeLearning attachments.
		 */
		private static function list_files() {
			$args = array(
				'post_type'      => 'attachment',
				'posts_per_page' => -1,
				'post_mime_type' => 'application/zip',
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Required to filter eXeLearning attachments.
				'meta_query'     => array(
					array(
						'key'     => '_wp_attachment_metadata',
						'compare' => 'EXISTS',
					),
				),
			);

			$query = new WP_Query( $args );
			if ( $query->have_posts() ) {
				foreach ( $query->posts as $post ) {
					WP_CLI::line( sprintf( 'ID: %d, Title: %s', $post->ID, $post->post_title ) );
				}
			} else {
				WP_CLI::line( 'No eXeLearning files found.' );
			}
		}

		/**
		 * Deletes an attachment.
		 *
		 * @param int $id Attachment ID.
		 */
		private static function delete_file( $id ) {
			$post = get_post( $id );
			if ( ! $post || 'attachment' !== $post->post_type ) {
				WP_CLI::error( 'Attachment not found.' );
			}

			$result = wp_delete_attachment( $id, true );
			if ( $result ) {
				WP_CLI::success( 'Attachment deleted successfully.' );
			} else {
				WP_CLI::error( 'Failed to delete attachment.' );
			}
		}
	}

	// Register WP-CLI commands.
	ExeLearning_Admin_WPCLI::register_commands();
}
