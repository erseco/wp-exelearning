<?php
/**
 * Internationalization class.
 *
 * Loads plugin text domain for translation.
 *
 * @package Exelearning
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Class ExeLearning_i18n.
 *
 * Manages loading of plugin text domain.
 */
class ExeLearning_i18n {

	/**
	 * Loads the plugin text domain for translation.
	 */
	public function load_textdomain() {
		load_plugin_textdomain(
			'exelearning',
			false,
			dirname( plugin_basename( EXELEARNING_PLUGIN_FILE ) ) . '/languages'
		);
	}
}
