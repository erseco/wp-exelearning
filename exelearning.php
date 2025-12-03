<?php
/**
 * eXeLearning WordPress Plugin.
 *
 * @link https://github.com/exelearning/wp-exelearning
 * @package Exelearning
 *
 * @wordpress-plugin
 * Plugin Name:       eXeLearning
 * Plugin URI:        https://github.com/exelearning/wp-exelearning
 * Description:       Plugin to support eXeLearning .elp files in WordPress. Upload, manage and embed eXeLearning content.
 * Version:           0.0.0
 * Author:            INTEF
 * Author URI:        https://github.com/exelearning/wp-exelearning
 * License:           GPL-3.0+
 * License URI:       https://www.gnu.org/licenses/gpl-3.0-standalone.html
 * Text Domain:       exelearning
 * Domain Path:       /languages
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

define( 'EXELEARNING_VERSION', '0.0.0' );
define( 'EXELEARNING_PLUGIN_FILE', __FILE__ );
define( 'EXELEARNING_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EXELEARNING_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Core classes.
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-activator.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-deactivator.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-exelearning.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-hooks.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-i18n.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-filters.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-post-types.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-mime-types.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-elp-list-table.php';

// Load the eXeLearning file upload handler.
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-elp-upload-handler.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-elp-upload-block.php';

// Admin classes.
require_once EXELEARNING_PLUGIN_DIR . 'admin/class-admin-settings.php';
require_once EXELEARNING_PLUGIN_DIR . 'admin/class-admin-upload.php';
require_once EXELEARNING_PLUGIN_DIR . 'admin/class-admin-wpcli.php';

// Public classes.
require_once EXELEARNING_PLUGIN_DIR . 'public/class-shortcodes.php';

// Integration classes.
require_once EXELEARNING_PLUGIN_DIR . 'includes/integrations/class-media-library.php';

// Include the ELPParser library and the ELP File Service.
require_once EXELEARNING_PLUGIN_DIR . 'includes/vendor/exelearning/elp-parser/src/ElpParser.php';
require_once EXELEARNING_PLUGIN_DIR . 'includes/class-elp-file-service.php';


// Register activation and deactivation hooks.
register_activation_hook( __FILE__, array( 'ExeLearning_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'ExeLearning_Deactivator', 'deactivate' ) );


/**
 * Starts the plugin.
 */
function run_exelearning() {
	$plugin = new ExeLearning();
	$plugin->run();
}

run_exelearning();
