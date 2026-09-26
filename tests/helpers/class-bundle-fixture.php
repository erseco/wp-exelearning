<?php
/**
 * Fixture builder for the bundled static editor.
 *
 * A source checkout has no dist/static/ and a developer machine has a full
 * editor build, so every code path that reads the bundle behaves differently
 * depending on where the suite runs: in CI those paths are unreachable, and
 * locally they return whatever the installed editor happens to contain. Tests
 * that care about them build their own bundle here and point
 * {@see ExeLearning_Editor_Bundle} at it, so the assertions mean the same
 * thing on both.
 *
 * @package Exelearning
 */

/**
 * Class ExeLearning_Bundle_Fixture.
 */
class ExeLearning_Bundle_Fixture {

	/**
	 * Directory currently standing in for the plugin directory.
	 *
	 * @var string
	 */
	private static $dir = '';

	/**
	 * Themes the default fixture bundle ships under files/perm/themes/base/.
	 *
	 * @var array<int, array<string,string>>
	 */
	const DEFAULT_THEMES = array(
		array(
			'name'    => 'base',
			'title'   => 'Base',
			'version' => '1.0.0',
			'author'  => 'eXeLearning',
		),
		array(
			'name'    => 'pukao',
			'title'   => 'Pukao',
			'version' => '2.1.0',
			'author'  => 'eXeLearning',
		),
	);

	/**
	 * Build a minimal but valid editor bundle and make the plugin use it.
	 *
	 * Valid means what ExeLearning_Editor_Bundle::is_available() requires: a
	 * readable index.html plus at least one asset directory. Like a release
	 * build, it ships each theme's config.xml and only the compressed
	 * data/bundle.json.zst, never a plain data/bundle.json.
	 *
	 * @param array|null $themes Theme entries written as config.xml files, or
	 *                           null for {@see self::DEFAULT_THEMES}. Pass an
	 *                           empty array for a bundle that ships no themes.
	 * @return string The fixture plugin directory (the parent of dist/static/).
	 */
	public static function create( $themes = null ) {
		self::destroy();

		self::$dir = trailingslashit( get_temp_dir() ) . 'exelearning-fixture-' . wp_generate_password( 8, false );
		$static    = self::$dir . '/dist/static';

		wp_mkdir_p( $static . '/app' );
		wp_mkdir_p( $static . '/data' );

		file_put_contents( // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			$static . '/index.html',
			"<!DOCTYPE html>\n<html>\n<head>\n<title>eXeLearning</title>\n</head>\n<body>\n<div id=\"app\"></div>\n</body>\n</html>\n"
		);
		// zstd magic number: the real file is compressed and PHP cannot read it.
		file_put_contents( $static . '/data/bundle.json.zst', "\x28\xb5\x2f\xfd" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		foreach ( null === $themes ? self::DEFAULT_THEMES : $themes as $theme ) {
			wp_mkdir_p( $static . '/files/perm/themes/base/' . $theme['name'] );
			file_put_contents( // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
				$static . '/files/perm/themes/base/' . $theme['name'] . '/config.xml',
				self::config_xml( $theme )
			);
		}

		ExeLearning_Editor_Bundle::set_path_override( self::$dir );

		return self::$dir;
	}

	/**
	 * Write an arbitrary file into the fixture bundle.
	 *
	 * @param string $relative Path below dist/static/.
	 * @param string $contents File contents.
	 * @return string Absolute path written.
	 */
	public static function write( $relative, $contents ) {
		$path = self::$dir . '/dist/static/' . ltrim( $relative, '/' );
		wp_mkdir_p( dirname( $path ) );
		file_put_contents( $path, $contents ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		return $path;
	}

	/**
	 * Delete a file from the fixture bundle.
	 *
	 * @param string $relative Path below dist/static/.
	 * @return void
	 */
	public static function delete( $relative ) {
		$path = self::$dir . '/dist/static/' . ltrim( $relative, '/' );
		if ( file_exists( $path ) ) {
			wp_delete_file( $path );
		}
	}

	/**
	 * Point the plugin at a directory that holds no bundle at all.
	 *
	 * This is the source-checkout situation: the plugin is installed but
	 * `make build-editor` has never run.
	 *
	 * @return string The empty fixture directory.
	 */
	public static function create_empty() {
		self::destroy();

		self::$dir = trailingslashit( get_temp_dir() ) . 'exelearning-empty-' . wp_generate_password( 8, false );
		wp_mkdir_p( self::$dir );
		ExeLearning_Editor_Bundle::set_path_override( self::$dir );

		return self::$dir;
	}

	/**
	 * Drop the fixture and hand the plugin back its real directory.
	 *
	 * @return void
	 */
	public static function destroy() {
		ExeLearning_Editor_Bundle::set_path_override( null );
		if ( '' !== self::$dir ) {
			self::recursive_delete( self::$dir );
			self::$dir = '';
		}
	}

	/**
	 * Render a theme entry as the config.xml the editor ships for it.
	 *
	 * @param array<string,string> $theme Theme entry.
	 * @return string
	 */
	private static function config_xml( array $theme ) {
		$xml = '<?xml version="1.0"?><theme>';
		foreach ( $theme as $tag => $value ) {
			$xml .= '<' . $tag . '>' . htmlspecialchars( $value, ENT_XML1 ) . '</' . $tag . '>';
		}
		return $xml . '</theme>';
	}

	/**
	 * Remove a directory tree.
	 *
	 * @param string $dir Directory to delete.
	 * @return void
	 */
	private static function recursive_delete( $dir ) {
		if ( ! is_dir( $dir ) ) {
			return;
		}
		$entries = array_diff( (array) scandir( $dir ), array( '.', '..' ) );
		foreach ( $entries as $entry ) {
			$path = $dir . '/' . $entry;
			if ( is_dir( $path ) ) {
				self::recursive_delete( $path );
			} else {
				wp_delete_file( $path );
			}
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir
		rmdir( $dir );
	}
}
