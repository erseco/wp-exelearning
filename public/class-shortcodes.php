<?php
/**
 * Shortcodes handler for eXeLearning plugin.
 *
 * This class registers and manages shortcodes.
 *
 * @package Exelearning
 */

if ( ! defined( 'WPINC' ) ) {
    die;
}

/**
 * Class ExeLearning_Shortcodes.
 *
 * Handles plugin shortcodes.
 */
class ExeLearning_Shortcodes {

    /**
     * Registers plugin shortcodes.
     */
    public function register_shortcodes() {
        add_shortcode( 'exelearning', array( $this, 'display_exelearning' ) );
    }

    /**
     * Displays content for the eXeLearning shortcode.
     *
     * @param array  $atts Shortcode attributes.
     * @param string $content Enclosed content.
     *
     * @return string Processed shortcode content.
     */
    public function display_exelearning( $atts, $content = null ) {
        $atts = shortcode_atts(
            array(
                'id' => 0,
            ),
            $atts,
            'exelearning'
        );

        $file_id = intval( $atts['id'] );
        if ( ! $file_id ) {
            return 'Invalid eXeLearning file ID.';
        }

        // Retrieve attachment details.
        $post = get_post( $file_id );
        if ( ! $post || 'attachment' !== $post->post_type ) {
            return 'eXeLearning file not found.';
        }

        // Process the file content or metadata as needed.
        $output = sprintf( 'Displaying eXeLearning file with ID: %d', $file_id );

        return $output;
    }
}
