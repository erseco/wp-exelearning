<?php
/**
 * Tests for the built-in editor styles ExeLearning_Styles_Service reads out of
 * the bundled editor.
 *
 * The list comes from each dist/static/files/perm/themes/base/<dir>/config.xml,
 * which only exists once the editor has been built. The build ships the themes
 * manifest only as the zstd-compressed data/bundle.json.zst, which PHP cannot
 * read, so the config.xml files are the source of truth. Rather than assert against whatever the machine has,
 * these tests point the bundle helper at a fixture they wrote themselves, so a
 * source checkout, a developer machine and CI all see the same two themes.
 *
 * @package Exelearning
 */

/**
 * Class StylesServiceBuiltinsTest.
 *
 * @covers ExeLearning_Styles_Service
 */
class StylesServiceBuiltinsTest extends WP_UnitTestCase {

	/**
	 * Hand the plugin back its real bundle.
	 */
	public function tear_down() {
		ExeLearning_Bundle_Fixture::destroy();
		delete_option( ExeLearning_Styles_Service::OPTION_DISABLED_STYLES );
		parent::tear_down();
	}

	/**
	 * The themes shipped by the bundle are read from their config.xml files.
	 */
	public function test_the_builtin_themes_come_from_the_bundle() {
		ExeLearning_Bundle_Fixture::create();

		$themes = ExeLearning_Styles_Service::list_builtin_themes();

		$this->assertSame( array( 'base', 'pukao' ), wp_list_pluck( $themes, 'id' ) );
		$this->assertSame( array( 'Base', 'Pukao' ), wp_list_pluck( $themes, 'title' ) );
		$this->assertSame( array( '1.0.0', '2.1.0' ), wp_list_pluck( $themes, 'version' ) );
	}

	/**
	 * Without a bundle there are no built-in styles, and asking for them is not
	 * an error: the settings screen renders an explanation instead.
	 */
	public function test_there_are_no_builtin_themes_without_a_bundle() {
		ExeLearning_Bundle_Fixture::create_empty();

		$this->assertSame( array(), ExeLearning_Styles_Service::list_builtin_themes() );
	}

	/**
	 * A theme directory without its config.xml is skipped.
	 */
	public function test_a_theme_without_its_config_is_skipped() {
		ExeLearning_Bundle_Fixture::create();
		ExeLearning_Bundle_Fixture::delete( 'files/perm/themes/base/pukao/config.xml' );

		$this->assertSame( array( 'base' ), wp_list_pluck( ExeLearning_Styles_Service::list_builtin_themes(), 'id' ) );
	}

	/**
	 * An empty config.xml is ignored rather than fatal.
	 */
	public function test_an_empty_config_is_skipped() {
		ExeLearning_Bundle_Fixture::create();
		ExeLearning_Bundle_Fixture::write( 'files/perm/themes/base/pukao/config.xml', '' );

		$this->assertSame( array( 'base' ), wp_list_pluck( ExeLearning_Styles_Service::list_builtin_themes(), 'id' ) );
	}

	/**
	 * Nor does a config.xml that is not XML at all bring the screen down.
	 */
	public function test_a_corrupt_config_is_skipped() {
		ExeLearning_Bundle_Fixture::create();
		ExeLearning_Bundle_Fixture::write( 'files/perm/themes/base/pukao/config.xml', 'not xml <<<' );

		$this->assertSame( array( 'base' ), wp_list_pluck( ExeLearning_Styles_Service::list_builtin_themes(), 'id' ) );
	}

	/**
	 * A bundle that ships no themes simply has nothing in it.
	 */
	public function test_a_bundle_can_ship_no_themes() {
		ExeLearning_Bundle_Fixture::create( array() );

		$this->assertSame( array(), ExeLearning_Styles_Service::list_builtin_themes() );
	}

	/**
	 * The registry override the editor consumes reports the built-ins that an
	 * administrator switched off.
	 */
	public function test_the_registry_override_reports_disabled_builtins() {
		ExeLearning_Bundle_Fixture::create();
		ExeLearning_Styles_Service::set_builtin_enabled( 'pukao', false );

		$override = ExeLearning_Styles_Service::build_theme_registry_override();

		$this->assertContains( 'pukao', $override['disabledBuiltins'] );
		$this->assertNotContains( 'base', $override['disabledBuiltins'] );
	}
}
