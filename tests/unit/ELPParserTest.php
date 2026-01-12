<?php
/**
 * Tests for ELPParser class.
 *
 * @package Exelearning
 */

use Exelearning\ELPParser;

/**
 * Class ELPParserTest.
 *
 * @covers Exelearning\ELPParser
 */
class ELPParserTest extends WP_UnitTestCase {

	/**
	 * Path to test fixtures.
	 *
	 * @var string
	 */
	private static $fixtures_path;

	/**
	 * Path to generated test ELP file.
	 *
	 * @var string
	 */
	private static $test_elp_v3;

	/**
	 * Path to generated test ELP v2 file.
	 *
	 * @var string
	 */
	private static $test_elp_v2;

	/**
	 * Set up test fixtures.
	 */
	public static function set_up_before_class() {
		parent::set_up_before_class();

		self::$fixtures_path = dirname( __DIR__ ) . '/fixtures';
		if ( ! is_dir( self::$fixtures_path ) ) {
			mkdir( self::$fixtures_path, 0755, true );
		}

		// Create test ELP v3 file.
		self::$test_elp_v3 = self::$fixtures_path . '/test-v3.elpx';
		self::create_test_elp_v3( self::$test_elp_v3 );

		// Create test ELP v2 file.
		self::$test_elp_v2 = self::$fixtures_path . '/test-v2.elpx';
		self::create_test_elp_v2( self::$test_elp_v2 );
	}

	/**
	 * Clean up test fixtures.
	 */
	public static function tear_down_after_class() {
		parent::tear_down_after_class();

		if ( file_exists( self::$test_elp_v3 ) ) {
			unlink( self::$test_elp_v3 );
		}
		if ( file_exists( self::$test_elp_v2 ) ) {
			unlink( self::$test_elp_v2 );
		}
	}

	/**
	 * Create a test ELP v3 file.
	 *
	 * @param string $path File path.
	 */
	private static function create_test_elp_v3( $path ) {
		$zip = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		// Create content.xml with v3 structure.
		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<package>
	<odeProperties>
		<odeProperty>
			<key>pp_title</key>
			<value>Test ELP Title</value>
		</odeProperty>
		<odeProperty>
			<key>pp_description</key>
			<value>Test ELP Description</value>
		</odeProperty>
		<odeProperty>
			<key>pp_author</key>
			<value>Test Author</value>
		</odeProperty>
		<odeProperty>
			<key>license</key>
			<value>CC-BY-SA</value>
		</odeProperty>
		<odeProperty>
			<key>lom_general_language</key>
			<value>en</value>
		</odeProperty>
		<odeProperty>
			<key>pp_learningResourceType</key>
			<value>lesson</value>
		</odeProperty>
	</odeProperties>
</package>';

		$zip->addFromString( 'content.xml', $content_xml );

		// Create index.html.
		$index_html = '<!DOCTYPE html>
<html>
<head><title>Test ELP</title></head>
<body><h1>Test Content</h1></body>
</html>';
		$zip->addFromString( 'index.html', $index_html );

		$zip->close();
	}

	/**
	 * Create a test ELP v2 file.
	 *
	 * @param string $path File path.
	 */
	private static function create_test_elp_v2( $path ) {
		$zip = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		// Create contentv3.xml with v2 structure.
		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="Test V2 Title"/>
		<string role="key" value="_description"/>
		<unicode value="Test V2 Description"/>
		<string role="key" value="_author"/>
		<unicode value="Test V2 Author"/>
		<string role="key" value="license"/>
		<unicode value="GPL"/>
		<string role="key" value="_lang"/>
		<unicode value="es"/>
		<string role="key" value="_learningResourceType"/>
		<unicode value="exercise"/>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );

		$zip->close();
	}

	/**
	 * Test parsing a v3 ELP file.
	 */
	public function test_parse_v3_file() {
		$parser = new ELPParser( self::$test_elp_v3 );

		$this->assertEquals( 3, $parser->getVersion() );
	}

	/**
	 * Test parsing a v2 ELP file.
	 */
	public function test_parse_v2_file() {
		$parser = new ELPParser( self::$test_elp_v2 );

		$this->assertEquals( 2, $parser->getVersion() );
	}

	/**
	 * Test getTitle returns correct title.
	 */
	public function test_get_title_v3() {
		$parser = new ELPParser( self::$test_elp_v3 );

		$this->assertEquals( 'Test ELP Title', $parser->getTitle() );
	}

	/**
	 * Test getTitle returns correct title for v2.
	 */
	public function test_get_title_v2() {
		$parser = new ELPParser( self::$test_elp_v2 );

		$this->assertEquals( 'Test V2 Title', $parser->getTitle() );
	}

	/**
	 * Test getDescription returns correct description.
	 */
	public function test_get_description_v3() {
		$parser = new ELPParser( self::$test_elp_v3 );

		$this->assertEquals( 'Test ELP Description', $parser->getDescription() );
	}

	/**
	 * Test getDescription returns correct description for v2.
	 */
	public function test_get_description_v2() {
		$parser = new ELPParser( self::$test_elp_v2 );

		$this->assertEquals( 'Test V2 Description', $parser->getDescription() );
	}

	/**
	 * Test getAuthor returns correct author.
	 */
	public function test_get_author_v3() {
		$parser = new ELPParser( self::$test_elp_v3 );

		$this->assertEquals( 'Test Author', $parser->getAuthor() );
	}

	/**
	 * Test getAuthor returns correct author for v2.
	 */
	public function test_get_author_v2() {
		$parser = new ELPParser( self::$test_elp_v2 );

		$this->assertEquals( 'Test V2 Author', $parser->getAuthor() );
	}

	/**
	 * Test getLicense returns correct license.
	 */
	public function test_get_license_v3() {
		$parser = new ELPParser( self::$test_elp_v3 );

		$this->assertEquals( 'CC-BY-SA', $parser->getLicense() );
	}

	/**
	 * Test getLicense returns correct license for v2.
	 */
	public function test_get_license_v2() {
		$parser = new ELPParser( self::$test_elp_v2 );

		$this->assertEquals( 'GPL', $parser->getLicense() );
	}

	/**
	 * Test getLanguage returns correct language.
	 */
	public function test_get_language_v3() {
		$parser = new ELPParser( self::$test_elp_v3 );

		$this->assertEquals( 'en', $parser->getLanguage() );
	}

	/**
	 * Test getLanguage returns correct language for v2.
	 */
	public function test_get_language_v2() {
		$parser = new ELPParser( self::$test_elp_v2 );

		$this->assertEquals( 'es', $parser->getLanguage() );
	}

	/**
	 * Test getLearningResourceType returns correct type.
	 */
	public function test_get_learning_resource_type_v3() {
		$parser = new ELPParser( self::$test_elp_v3 );

		$this->assertEquals( 'lesson', $parser->getLearningResourceType() );
	}

	/**
	 * Test getLearningResourceType returns correct type for v2.
	 */
	public function test_get_learning_resource_type_v2() {
		$parser = new ELPParser( self::$test_elp_v2 );

		$this->assertEquals( 'exercise', $parser->getLearningResourceType() );
	}

	/**
	 * Test toArray returns expected structure.
	 */
	public function test_to_array() {
		$parser = new ELPParser( self::$test_elp_v3 );
		$array  = $parser->toArray();

		$this->assertIsArray( $array );
		$this->assertArrayHasKey( 'version', $array );
		$this->assertArrayHasKey( 'title', $array );
		$this->assertArrayHasKey( 'description', $array );
		$this->assertArrayHasKey( 'author', $array );
		$this->assertArrayHasKey( 'license', $array );
		$this->assertArrayHasKey( 'language', $array );
		$this->assertArrayHasKey( 'learningResourceType', $array );
		$this->assertArrayHasKey( 'strings', $array );
	}

	/**
	 * Test jsonSerialize returns same as toArray.
	 */
	public function test_json_serialize() {
		$parser = new ELPParser( self::$test_elp_v3 );

		$this->assertEquals( $parser->toArray(), $parser->jsonSerialize() );
	}

	/**
	 * Test exportJson returns valid JSON.
	 */
	public function test_export_json() {
		$parser = new ELPParser( self::$test_elp_v3 );
		$json   = $parser->exportJson();

		$this->assertIsString( $json );
		$decoded = json_decode( $json, true );
		$this->assertIsArray( $decoded );
		$this->assertEquals( 'Test ELP Title', $decoded['title'] );
	}

	/**
	 * Test exportJson to file.
	 */
	public function test_export_json_to_file() {
		$parser    = new ELPParser( self::$test_elp_v3 );
		$json_path = self::$fixtures_path . '/test-export.json';

		$json = $parser->exportJson( $json_path );

		$this->assertFileExists( $json_path );
		$this->assertEquals( $json, file_get_contents( $json_path ) );

		unlink( $json_path );
	}

	/**
	 * Test fromFile static constructor.
	 */
	public function test_from_file() {
		$parser = ELPParser::fromFile( self::$test_elp_v3 );

		$this->assertInstanceOf( ELPParser::class, $parser );
		$this->assertEquals( 3, $parser->getVersion() );
	}

	/**
	 * Test getStrings returns array.
	 */
	public function test_get_strings() {
		$parser  = new ELPParser( self::$test_elp_v3 );
		$strings = $parser->getStrings();

		$this->assertIsArray( $strings );
	}

	/**
	 * Test extract extracts files to destination.
	 */
	public function test_extract() {
		$parser      = new ELPParser( self::$test_elp_v3 );
		$extract_dir = self::$fixtures_path . '/extracted-test';

		$parser->extract( $extract_dir );

		$this->assertDirectoryExists( $extract_dir );
		$this->assertFileExists( $extract_dir . '/index.html' );
		$this->assertFileExists( $extract_dir . '/content.xml' );

		// Cleanup.
		unlink( $extract_dir . '/index.html' );
		unlink( $extract_dir . '/content.xml' );
		rmdir( $extract_dir );
	}

	/**
	 * Test parsing nonexistent file throws exception.
	 */
	public function test_parse_nonexistent_file() {
		$this->expectException( Exception::class );
		$this->expectExceptionMessage( 'File does not exist.' );

		new ELPParser( '/nonexistent/file.elpx' );
	}

	/**
	 * Test parsing non-zip file throws exception.
	 */
	public function test_parse_non_zip_file() {
		$text_file = self::$fixtures_path . '/not-a-zip.elpx';
		file_put_contents( $text_file, 'This is not a zip file' );

		$this->expectException( Exception::class );
		$this->expectExceptionMessage( 'The file is not a valid ZIP file.' );

		try {
			new ELPParser( $text_file );
		} finally {
			unlink( $text_file );
		}
	}

	/**
	 * Test parsing zip without content.xml throws exception.
	 */
	public function test_parse_invalid_elp_no_content() {
		$invalid_elp = self::$fixtures_path . '/invalid-no-content.elpx';
		$zip         = new ZipArchive();
		$zip->open( $invalid_elp, ZipArchive::CREATE | ZipArchive::OVERWRITE );
		$zip->addFromString( 'random.txt', 'Random content' );
		$zip->close();

		$this->expectException( Exception::class );
		$this->expectExceptionMessage( 'Invalid ELP file: No content XML found.' );

		try {
			new ELPParser( $invalid_elp );
		} finally {
			unlink( $invalid_elp );
		}
	}

	/**
	 * Test parsing zip with invalid XML throws exception.
	 */
	public function test_parse_invalid_xml() {
		$invalid_elp = self::$fixtures_path . '/invalid-xml.elpx';
		$zip         = new ZipArchive();
		$zip->open( $invalid_elp, ZipArchive::CREATE | ZipArchive::OVERWRITE );
		$zip->addFromString( 'content.xml', 'Not valid XML <unclosed' );
		$zip->addFromString( 'index.html', '<html></html>' );
		$zip->close();

		$this->expectException( Exception::class );
		$this->expectExceptionMessageMatches( '/XML Parsing error/' );

		try {
			new ELPParser( $invalid_elp );
		} finally {
			unlink( $invalid_elp );
		}
	}

	/**
	 * Test getMetadata returns expected structure.
	 */
	public function test_get_metadata_v2() {
		$parser   = new ELPParser( self::$test_elp_v2 );
		$metadata = $parser->getMetadata();

		$this->assertIsArray( $metadata );
		$this->assertArrayHasKey( 'metadata', $metadata );
		$this->assertArrayHasKey( 'content', $metadata );
		$this->assertIsArray( $metadata['metadata'] );
	}

	/**
	 * Test v2 file with bool values.
	 */
	public function test_v2_with_bool_values() {
		$path = self::$fixtures_path . '/test-v2-bool.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="Bool Test"/>
		<string role="key" value="isPublic"/>
		<bool value="1"/>
		<string role="key" value="isPrivate"/>
		<bool value="0"/>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser = new ELPParser( $path );
		$this->assertEquals( 'Bool Test', $parser->getTitle() );

		unlink( $path );
	}

	/**
	 * Test v2 file with int values.
	 */
	public function test_v2_with_int_values() {
		$path = self::$fixtures_path . '/test-v2-int.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="Int Test"/>
		<string role="key" value="pageCount"/>
		<int value="42"/>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser = new ELPParser( $path );
		$this->assertEquals( 'Int Test', $parser->getTitle() );

		unlink( $path );
	}

	/**
	 * Test v2 file with list values.
	 */
	public function test_v2_with_list_values() {
		$path = self::$fixtures_path . '/test-v2-list.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="List Test"/>
		<string role="key" value="keywords"/>
		<list>
			<unicode value="keyword1"/>
			<unicode value="keyword2"/>
		</list>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser = new ELPParser( $path );
		$this->assertEquals( 'List Test', $parser->getTitle() );

		unlink( $path );
	}

	/**
	 * Test v2 file without dictionary.
	 */
	public function test_v2_without_dictionary() {
		$path = self::$fixtures_path . '/test-v2-no-dict.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<empty/>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser = new ELPParser( $path );
		$this->assertEquals( '', $parser->getTitle() );

		unlink( $path );
	}

	/**
	 * Test v3 file without odeProperties.
	 */
	public function test_v3_without_properties() {
		$path = self::$fixtures_path . '/test-v3-no-props.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<package>
	<empty/>
</package>';

		$zip->addFromString( 'content.xml', $content_xml );
		$zip->addFromString( 'index.html', '<html></html>' );
		$zip->close();

		$parser = new ELPParser( $path );
		$this->assertEquals( '', $parser->getTitle() );
		$this->assertEquals( 3, $parser->getVersion() );

		unlink( $path );
	}

	/**
	 * Test extract creates directory if not exists.
	 */
	public function test_extract_creates_directory() {
		$parser      = new ELPParser( self::$test_elp_v3 );
		$extract_dir = self::$fixtures_path . '/new-directory/nested';

		$parser->extract( $extract_dir );

		$this->assertDirectoryExists( $extract_dir );

		// Cleanup.
		unlink( $extract_dir . '/index.html' );
		unlink( $extract_dir . '/content.xml' );
		rmdir( $extract_dir );
		rmdir( dirname( $extract_dir ) );
	}

	/**
	 * Test getMetadata returns expected structure for v3.
	 */
	public function test_get_metadata_v3() {
		$parser   = new ELPParser( self::$test_elp_v3 );
		$metadata = $parser->getMetadata();

		$this->assertIsArray( $metadata );
		$this->assertArrayHasKey( 'metadata', $metadata );
		$this->assertArrayHasKey( 'content', $metadata );
		$this->assertIsArray( $metadata['content'] );
		$this->assertArrayHasKey( 'file', $metadata['content'] );
		$this->assertArrayHasKey( 'pages', $metadata['content'] );
	}

	/**
	 * Test getMetadata contains Package schema.
	 */
	public function test_get_metadata_has_package_schema() {
		$parser   = new ELPParser( self::$test_elp_v2 );
		$metadata = $parser->getMetadata();

		$schemas = array_column( $metadata['metadata'], 'schema' );
		$this->assertContains( 'Package', $schemas );
	}

	/**
	 * Test getMetadata file returns basename.
	 */
	public function test_get_metadata_file_basename() {
		$parser   = new ELPParser( self::$test_elp_v3 );
		$metadata = $parser->getMetadata();

		$this->assertEquals( 'test-v3.elpx', $metadata['content']['file'] );
	}

	/**
	 * Test v2 file with Dublin Core metadata.
	 */
	public function test_v2_with_dublin_core() {
		$path = self::$fixtures_path . '/test-v2-dc.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="DC Test"/>
		<string role="key" value="dublinCore"/>
		<dictionary>
			<string role="key" value="title"/>
			<unicode value="DC Title"/>
			<string role="key" value="creator"/>
			<unicode value="DC Creator"/>
			<string role="key" value="language"/>
			<unicode value="en"/>
			<string role="key" value="description"/>
			<unicode value="DC Description"/>
			<string role="key" value="rights"/>
			<unicode value="CC-BY"/>
			<string role="key" value="source"/>
			<unicode value="Original Source"/>
		</dictionary>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser   = new ELPParser( $path );
		$metadata = $parser->getMetadata();

		$schemas = array_column( $metadata['metadata'], 'schema' );
		$this->assertContains( 'Dublin core', $schemas );

		unlink( $path );
	}

	/**
	 * Test v2 file with LOM metadata.
	 */
	public function test_v2_with_lom() {
		$path = self::$fixtures_path . '/test-v2-lom.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="LOM Test"/>
		<string role="key" value="lom"/>
		<dictionary>
			<string role="key" value="general"/>
			<dictionary>
				<string role="key" value="title"/>
				<dictionary>
					<string role="key" value="string"/>
					<list>
						<unicode value="LOM Title"/>
					</list>
				</dictionary>
				<string role="key" value="language"/>
				<list>
					<unicode value="en"/>
				</list>
				<string role="key" value="description"/>
				<list>
					<unicode value="LOM Description"/>
				</list>
			</dictionary>
			<string role="key" value="lifeCycle"/>
			<dictionary>
				<string role="key" value="contribute"/>
				<dictionary>
					<string role="key" value="entity"/>
					<list>
						<unicode value="Author Name"/>
					</list>
				</dictionary>
			</dictionary>
			<string role="key" value="rights"/>
			<dictionary>
				<string role="key" value="description"/>
				<unicode value="Copyright info"/>
			</dictionary>
			<string role="key" value="classification"/>
			<list>
				<unicode value="Education"/>
			</list>
		</dictionary>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser   = new ELPParser( $path );
		$metadata = $parser->getMetadata();

		$schemas = array_column( $metadata['metadata'], 'schema' );
		$this->assertContains( 'LOM v1.0', $schemas );

		unlink( $path );
	}

	/**
	 * Test v2 file with LOM-ES metadata.
	 */
	public function test_v2_with_lom_es() {
		$path = self::$fixtures_path . '/test-v2-lomes.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="LOM-ES Test"/>
		<string role="key" value="lomEs"/>
		<dictionary>
			<string role="key" value="general"/>
			<dictionary>
				<string role="key" value="title"/>
				<dictionary>
					<string role="key" value="string"/>
					<list>
						<unicode value="LOM-ES Title"/>
					</list>
				</dictionary>
				<string role="key" value="language"/>
				<list>
					<unicode value="es"/>
				</list>
				<string role="key" value="description"/>
				<list>
					<unicode value="LOM-ES Description"/>
				</list>
			</dictionary>
			<string role="key" value="lifeCycle"/>
			<dictionary>
				<string role="key" value="contribute"/>
				<dictionary>
					<string role="key" value="entity"/>
					<unicode value="Spanish Author"/>
				</dictionary>
			</dictionary>
			<string role="key" value="rights"/>
			<dictionary>
				<string role="key" value="description"/>
				<unicode value="Derechos de autor"/>
			</dictionary>
			<string role="key" value="classification"/>
			<list>
				<unicode value="Educación"/>
			</list>
		</dictionary>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser   = new ELPParser( $path );
		$metadata = $parser->getMetadata();

		$schemas = array_column( $metadata['metadata'], 'schema' );
		$this->assertContains( 'LOM-ES v1.0', $schemas );

		unlink( $path );
	}

	/**
	 * Test v2 file with pages (nodes).
	 */
	public function test_v2_with_pages() {
		$path = self::$fixtures_path . '/test-v2-pages.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="Pages Test"/>
		<string role="key" value="_nodeIdDict"/>
		<dictionary>
			<string role="key" value="0"/>
			<dictionary>
				<string role="key" value="_title"/>
				<unicode value="Home Page"/>
				<string role="key" value="idevices"/>
				<list>
					<dictionary>
						<string role="key" value="_id"/>
						<unicode value="idev1"/>
						<string role="key" value="_iDeviceDir"/>
						<unicode value="text"/>
						<string role="key" value="_title"/>
						<unicode value="Introduction"/>
						<string role="key" value="fields"/>
						<list>
							<dictionary>
								<string role="key" value="content_w_resourcePaths"/>
								<unicode value="&lt;p&gt;Welcome to the course&lt;/p&gt;"/>
							</dictionary>
						</list>
					</dictionary>
				</list>
				<string role="key" value="children"/>
				<list>
					<dictionary>
						<string role="key" value="_title"/>
						<unicode value="Chapter 1"/>
						<string role="key" value="idevices"/>
						<list/>
						<string role="key" value="children"/>
						<list/>
					</dictionary>
				</list>
			</dictionary>
		</dictionary>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser   = new ELPParser( $path );
		$metadata = $parser->getMetadata();

		$this->assertNotEmpty( $metadata['content']['pages'] );
		$this->assertEquals( 'index.html', $metadata['content']['pages'][0]['filename'] );
		$this->assertEquals( 'Home Page', $metadata['content']['pages'][0]['pagename'] );
		$this->assertEquals( 0, $metadata['content']['pages'][0]['level'] );

		unlink( $path );
	}

	/**
	 * Test parseElement handles reference type.
	 */
	public function test_v2_with_reference() {
		$path = self::$fixtures_path . '/test-v2-ref.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="Reference Test"/>
		<string role="key" value="refItem"/>
		<reference key="someRef"/>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser = new ELPParser( $path );
		$this->assertEquals( 'Reference Test', $parser->getTitle() );

		unlink( $path );
	}

	/**
	 * Test parseElement handles none type.
	 */
	public function test_v2_with_none() {
		$path = self::$fixtures_path . '/test-v2-none.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="None Test"/>
		<string role="key" value="emptyValue"/>
		<none/>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser = new ELPParser( $path );
		$this->assertEquals( 'None Test', $parser->getTitle() );

		unlink( $path );
	}

	/**
	 * Test parseElement handles instance type.
	 */
	public function test_v2_with_instance() {
		$path = self::$fixtures_path . '/test-v2-instance.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="Instance Test"/>
		<string role="key" value="instanceObj"/>
		<instance>
			<dictionary>
				<string role="key" value="innerKey"/>
				<unicode value="innerValue"/>
			</dictionary>
		</instance>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser = new ELPParser( $path );
		$this->assertEquals( 'Instance Test', $parser->getTitle() );

		unlink( $path );
	}

	/**
	 * Test slug function handles accented characters.
	 */
	public function test_slug_with_accents() {
		$path = self::$fixtures_path . '/test-v2-slug.elpx';
		$zip  = new ZipArchive();
		$zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );

		$content_xml = '<?xml version="1.0" encoding="UTF-8"?>
<pickle>
	<dictionary>
		<string role="key" value="_title"/>
		<unicode value="Slug Test"/>
		<string role="key" value="_nodeIdDict"/>
		<dictionary>
			<string role="key" value="0"/>
			<dictionary>
				<string role="key" value="_title"/>
				<unicode value="Página Principal"/>
				<string role="key" value="children"/>
				<list>
					<dictionary>
						<string role="key" value="_title"/>
						<unicode value="Capítulo Único"/>
						<string role="key" value="children"/>
						<list/>
					</dictionary>
				</list>
			</dictionary>
		</dictionary>
	</dictionary>
</pickle>';

		$zip->addFromString( 'contentv3.xml', $content_xml );
		$zip->close();

		$parser   = new ELPParser( $path );
		$metadata = $parser->getMetadata();

		// The slug function should convert accented chars.
		$pages = $metadata['content']['pages'];
		$this->assertCount( 2, $pages );

		unlink( $path );
	}

	/**
	 * Test removeAccents function with UTF-8.
	 */
	public function test_remove_accents_utf8() {
		$result = Exelearning\removeAccents( 'Café résumé' );
		$this->assertEquals( 'Cafe resume', $result );
	}

	/**
	 * Test removeAccents with German locale.
	 */
	public function test_remove_accents_german() {
		$result = Exelearning\removeAccents( 'Über Größe', 'de_DE' );
		$this->assertStringContainsString( 'Ue', $result );
	}

	/**
	 * Test removeAccents with Danish locale.
	 */
	public function test_remove_accents_danish() {
		$result = Exelearning\removeAccents( 'Ærø', 'da_DK' );
		$this->assertStringContainsString( 'Ae', $result );
	}

	/**
	 * Test removeAccents with Catalan locale.
	 */
	public function test_remove_accents_catalan() {
		$result = Exelearning\removeAccents( 'col·lecció', 'ca' );
		$this->assertStringContainsString( 'll', $result );
	}

	/**
	 * Test removeAccents with Serbian locale.
	 */
	public function test_remove_accents_serbian() {
		$result = Exelearning\removeAccents( 'Đorđe', 'sr_RS' );
		$this->assertStringContainsString( 'DJ', $result );
	}

	/**
	 * Test seemsUtf8 function.
	 */
	public function test_seems_utf8() {
		$this->assertTrue( Exelearning\seemsUtf8( 'Hello World' ) );
		$this->assertTrue( Exelearning\seemsUtf8( 'Hélló Wörld' ) );
	}

	/**
	 * Test removeAccents with ASCII only.
	 */
	public function test_remove_accents_ascii() {
		$result = Exelearning\removeAccents( 'Hello World' );
		$this->assertEquals( 'Hello World', $result );
	}

	/**
	 * Test exportJson fails with invalid destination.
	 */
	public function test_export_json_invalid_destination() {
		$parser = new ELPParser( self::$test_elp_v3 );

		// Suppress the PHP warning.
		$this->expectException( Exception::class );
		$this->expectExceptionMessage( 'Unable to write JSON file' );

		// Convert warnings to exceptions.
		set_error_handler(
			function ( $errno, $errstr ) {
				throw new \Exception( 'Unable to write JSON file.' );
			}
		);

		try {
			$parser->exportJson( '/nonexistent/path/file.json' );
		} finally {
			restore_error_handler();
		}
	}
}
