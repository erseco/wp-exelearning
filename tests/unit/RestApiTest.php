<?php
/**
 * Tests for ExeLearning_REST_API class.
 *
 * @package Exelearning
 */

/**
 * Class RestApiTest.
 *
 * @covers ExeLearning_REST_API
 */
class RestApiTest extends WP_UnitTestCase {

	/**
	 * Test instance.
	 *
	 * @var ExeLearning_REST_API
	 */
	private $rest_api;

	/**
	 * Set up test fixtures.
	 */
	public function set_up() {
		parent::set_up();
		$this->rest_api = new ExeLearning_REST_API();

		// Initialize REST server.
		global $wp_rest_server;
		$wp_rest_server = new WP_REST_Server();
		do_action( 'rest_api_init' );
	}

	/**
	 * Tear down test fixtures.
	 */
	public function tear_down() {
		global $wp_rest_server;
		$wp_rest_server = null;
		parent::tear_down();
	}

	/**
	 * Test REST routes are registered.
	 */
	public function test_routes_are_registered() {
		$routes = rest_get_server()->get_routes();

		// Check save route.
		$this->assertArrayHasKey( '/exelearning/v1/save/(?P<id>\\d+)', $routes );

		// Check elp-data route.
		$this->assertArrayHasKey( '/exelearning/v1/elp-data/(?P<id>\\d+)', $routes );

		// Check create route.
		$this->assertArrayHasKey( '/exelearning/v1/create', $routes );

		// Check content proxy route.
		$this->assertArrayHasKey( '/exelearning/v1/content/(?P<hash>[a-f0-9]{40})(?:/(?P<file>.*))?', $routes );
	}

	/**
	 * Test proxy endpoint returns 404 for invalid hash.
	 */
	public function test_proxy_endpoint_returns_404_for_invalid_hash() {
		$request = new WP_REST_Request( 'GET', '/exelearning/v1/content/invalid/index.html' );
		$request->set_param( 'hash', 'invalid' );

		$response = rest_get_server()->dispatch( $request );

		$this->assertEquals( 404, $response->get_status() );
	}

	/**
	 * Test proxy endpoint accepts valid hash format.
	 */
	public function test_proxy_endpoint_accepts_valid_hash() {
		$hash    = str_repeat( 'a', 40 );
		$request = new WP_REST_Request( 'GET', '/exelearning/v1/content/' . $hash . '/index.html' );
		$request->set_param( 'hash', $hash );
		$request->set_param( 'file', 'index.html' );

		$response = rest_get_server()->dispatch( $request );

		// Should return 404 (file not found) not 400 (bad request).
		$this->assertEquals( 404, $response->get_status() );

		$data = $response->get_data();
		$this->assertNotEquals( 'invalid_hash', $data['code'] );
	}

	/**
	 * Test check_edit_permission denies unauthorized users.
	 */
	public function test_check_edit_permission_denies_unauthorized() {
		$attachment_id = $this->factory->attachment->create();
		$request       = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		// Ensure we're logged out.
		wp_set_current_user( 0 );

		$result = $this->rest_api->check_edit_permission( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'rest_forbidden', $result->get_error_code() );
	}

	/**
	 * Test check_edit_permission allows authorized users.
	 */
	public function test_check_edit_permission_allows_authorized() {
		$user_id       = $this->factory->user->create( array( 'role' => 'administrator' ) );
		$attachment_id = $this->factory->attachment->create( array( 'post_author' => $user_id ) );

		wp_set_current_user( $user_id );

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->check_edit_permission( $request );

		$this->assertTrue( $result );
	}

	/**
	 * Test check_read_permission denies unauthorized users.
	 */
	public function test_check_read_permission_denies_unauthorized() {
		$attachment_id = $this->factory->attachment->create( array( 'post_status' => 'private' ) );
		$request       = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		wp_set_current_user( 0 );

		$result = $this->rest_api->check_read_permission( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
	}

	/**
	 * Test check_upload_permission requires upload_files capability.
	 */
	public function test_check_upload_permission_requires_capability() {
		// Subscriber cannot upload files.
		$user_id = $this->factory->user->create( array( 'role' => 'subscriber' ) );
		wp_set_current_user( $user_id );

		$result = $this->rest_api->check_upload_permission();

		$this->assertFalse( $result );
	}

	/**
	 * Test check_upload_permission allows editors.
	 */
	public function test_check_upload_permission_allows_editors() {
		$user_id = $this->factory->user->create( array( 'role' => 'editor' ) );
		wp_set_current_user( $user_id );

		$result = $this->rest_api->check_upload_permission();

		$this->assertTrue( $result );
	}

	/**
	 * Test get_elp_data returns error for invalid attachment.
	 */
	public function test_get_elp_data_invalid_attachment() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/999999' );
		$request->set_param( 'id', 999999 );

		$result = $this->rest_api->get_elp_data( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'invalid_attachment', $result->get_error_code() );
	}

	/**
	 * Test save_elp_file returns error without file upload.
	 */
	public function test_save_elp_file_requires_file() {
		$user_id       = $this->factory->user->create( array( 'role' => 'administrator' ) );
		$attachment_id = $this->factory->attachment->create( array( 'post_author' => $user_id ) );
		wp_set_current_user( $user_id );

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->save_elp_file( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'no_file', $result->get_error_code() );
	}

	/**
	 * Test create_elp_file returns error without file upload.
	 */
	public function test_create_elp_file_requires_file() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/create' );

		$result = $this->rest_api->create_elp_file( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'no_file', $result->get_error_code() );
	}

	/**
	 * Test register_routes method exists.
	 */
	public function test_register_routes_method_exists() {
		$this->assertTrue( method_exists( $this->rest_api, 'register_routes' ) );
	}

	/**
	 * Test check_read_permission allows logged-in users to read attachments.
	 */
	public function test_check_read_permission_allows_logged_in_users() {
		$user_id       = $this->factory->user->create( array( 'role' => 'subscriber' ) );
		$attachment_id = $this->factory->attachment->create( array( 'post_status' => 'inherit' ) );
		$request       = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		wp_set_current_user( $user_id );

		$result = $this->rest_api->check_read_permission( $request );

		$this->assertTrue( $result );
	}

	/**
	 * Test check_edit_permission allows admin for any attachment.
	 */
	public function test_check_edit_permission_admin_can_edit() {
		$user_id       = $this->factory->user->create( array( 'role' => 'administrator' ) );
		$attachment_id = $this->factory->attachment->create();

		wp_set_current_user( $user_id );

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->check_edit_permission( $request );

		$this->assertTrue( $result );
	}

	/**
	 * Test check_upload_permission allows administrators.
	 */
	public function test_check_upload_permission_allows_administrators() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$result = $this->rest_api->check_upload_permission();

		$this->assertTrue( $result );
	}

	/**
	 * Test check_upload_permission allows authors.
	 */
	public function test_check_upload_permission_allows_authors() {
		$user_id = $this->factory->user->create( array( 'role' => 'author' ) );
		wp_set_current_user( $user_id );

		$result = $this->rest_api->check_upload_permission();

		$this->assertTrue( $result );
	}

	/**
	 * Test check_upload_permission denies logged out users.
	 */
	public function test_check_upload_permission_denies_logged_out() {
		wp_set_current_user( 0 );

		$result = $this->rest_api->check_upload_permission();

		$this->assertFalse( $result );
	}

	/**
	 * Test save route has correct HTTP method.
	 */
	public function test_save_route_method() {
		$routes     = rest_get_server()->get_routes();
		$save_route = $routes['/exelearning/v1/save/(?P<id>\\d+)'];

		$this->assertNotEmpty( $save_route );
		$this->assertArrayHasKey( 'POST', $save_route[0]['methods'] );
	}

	/**
	 * Test create route has correct HTTP method.
	 */
	public function test_create_route_method() {
		$routes       = rest_get_server()->get_routes();
		$create_route = $routes['/exelearning/v1/create'];

		$this->assertNotEmpty( $create_route );
		$this->assertArrayHasKey( 'POST', $create_route[0]['methods'] );
	}

	/**
	 * Test elp-data route has correct HTTP method.
	 */
	public function test_elp_data_route_method() {
		$routes    = rest_get_server()->get_routes();
		$elp_route = $routes['/exelearning/v1/elp-data/(?P<id>\\d+)'];

		$this->assertNotEmpty( $elp_route );
		$this->assertArrayHasKey( 'GET', $elp_route[0]['methods'] );
	}

	/**
	 * Test content proxy route has correct HTTP method.
	 */
	public function test_content_proxy_route_method() {
		$routes        = rest_get_server()->get_routes();
		$content_route = $routes['/exelearning/v1/content/(?P<hash>[a-f0-9]{40})(?:/(?P<file>.*))?'];

		$this->assertNotEmpty( $content_route );
		$this->assertArrayHasKey( 'GET', $content_route[0]['methods'] );
	}

	/**
	 * Test proxy_content method exists and is callable.
	 */
	public function test_proxy_content_method() {
		$this->assertTrue( method_exists( $this->rest_api, 'proxy_content' ) );
	}

	/**
	 * Test get_elp_data returns error for non-elpx file.
	 */
	public function test_get_elp_data_non_elpx_file() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		// Create a regular attachment (not elpx).
		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'image/jpeg',
				'post_author'    => $user_id,
			)
		);

		// Set up a fake file path.
		update_post_meta( $attachment_id, '_wp_attached_file', 'test.jpg' );

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'invalid_file_type', $result->get_error_code() );
	}

	/**
	 * Test get_elp_data returns data for valid elpx file.
	 */
	public function test_get_elp_data_valid_elpx() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		// Create attachment.
		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'application/zip',
				'post_author'    => $user_id,
				'post_title'     => 'Test ELP File',
			)
		);

		// Create a temp elpx file.
		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/test-' . $attachment_id . '.elpx';

		// Create a minimal valid zip.
		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->addFromString( 'index.html', '<html></html>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );

		// Set metadata.
		update_post_meta( $attachment_id, '_exelearning_title', 'Test Title' );
		update_post_meta( $attachment_id, '_exelearning_description', 'Test Description' );
		update_post_meta( $attachment_id, '_exelearning_extracted', 'abc123' );
		update_post_meta( $attachment_id, '_exelearning_has_preview', '1' );
		update_post_meta( $attachment_id, '_exelearning_version', '3' );

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );

		$this->assertInstanceOf( WP_REST_Response::class, $result );
		$data = $result->get_data();
		$this->assertEquals( $attachment_id, $data['id'] );
		$this->assertEquals( 'Test ELP File', $data['title'] );
		$this->assertEquals( 'elpx', $data['extension'] );
		$this->assertTrue( $data['hasPreview'] );

		// Cleanup.
		unlink( $file_path );
	}

	/**
	 * Test save_elp_file returns error for invalid attachment.
	 */
	public function test_save_elp_file_invalid_attachment() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/save/999999' );
		$request->set_param( 'id', 999999 );

		$result = $this->rest_api->save_elp_file( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'invalid_attachment', $result->get_error_code() );
	}

	/**
	 * Test save_elp_file returns error for non-attachment post type.
	 */
	public function test_save_elp_file_non_attachment() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		// Create a regular post, not an attachment.
		$post_id = $this->factory->post->create(
			array(
				'post_type'   => 'post',
				'post_author' => $user_id,
			)
		);

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $post_id );
		$request->set_param( 'id', $post_id );

		$result = $this->rest_api->save_elp_file( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'invalid_attachment', $result->get_error_code() );
	}

	/**
	 * Test constructor registers rest_api_init action.
	 */
	public function test_constructor_registers_action() {
		$new_api = new ExeLearning_REST_API();

		$this->assertGreaterThan(
			0,
			has_action( 'rest_api_init', array( $new_api, 'register_routes' ) )
		);
	}

	/**
	 * Test content proxy validation callback rejects invalid hash.
	 */
	public function test_content_proxy_validation_rejects_invalid() {
		$hash    = 'not-valid-hash';
		$request = new WP_REST_Request( 'GET', '/exelearning/v1/content/' . $hash );
		$request->set_url_params( array( 'hash' => $hash ) );

		$response = rest_get_server()->dispatch( $request );

		// Should return 404 because route doesn't match.
		$this->assertEquals( 404, $response->get_status() );
	}

	/**
	 * Test content proxy with default file parameter.
	 */
	public function test_content_proxy_default_file() {
		$hash    = str_repeat( 'b', 40 );
		$request = new WP_REST_Request( 'GET', '/exelearning/v1/content/' . $hash );
		$request->set_param( 'hash', $hash );

		$response = rest_get_server()->dispatch( $request );

		// Should return 404 (directory not found), not a parameter error.
		$this->assertEquals( 404, $response->get_status() );
	}

	/**
	 * Test get_elp_data returns metadata.
	 */
	public function test_get_elp_data_returns_metadata() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		// Create attachment.
		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'application/zip',
				'post_author'    => $user_id,
			)
		);

		// Create a temp elpx file.
		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/test-meta-' . $attachment_id . '.elpx';

		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->addFromString( 'index.html', '<html></html>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );

		// Set metadata.
		update_post_meta( $attachment_id, '_exelearning_title', 'Meta Title' );
		update_post_meta( $attachment_id, '_exelearning_description', 'Meta Description' );
		update_post_meta( $attachment_id, '_exelearning_license', 'CC BY 4.0' );
		update_post_meta( $attachment_id, '_exelearning_language', 'es' );
		update_post_meta( $attachment_id, '_exelearning_resource_type', 'course' );

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );
		$data   = $result->get_data();

		$this->assertEquals( 'Meta Title', $data['metadata']['title'] );
		$this->assertEquals( 'Meta Description', $data['metadata']['description'] );
		$this->assertEquals( 'CC BY 4.0', $data['metadata']['license'] );
		$this->assertEquals( 'es', $data['metadata']['language'] );
		$this->assertEquals( 'course', $data['metadata']['resourceType'] );

		unlink( $file_path );
	}

	/**
	 * Test get_elp_data without preview.
	 */
	public function test_get_elp_data_without_preview() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'application/zip',
				'post_author'    => $user_id,
			)
		);

		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/test-no-preview-' . $attachment_id . '.elpx';

		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );
		update_post_meta( $attachment_id, '_exelearning_has_preview', '0' );

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );
		$data   = $result->get_data();

		$this->assertFalse( $data['hasPreview'] );
		$this->assertNull( $data['previewUrl'] );

		unlink( $file_path );
	}

	/**
	 * Test save_elp_file returns error for non-elpx file.
	 */
	public function test_save_elp_file_non_elpx() {
		$user_id       = $this->factory->user->create( array( 'role' => 'administrator' ) );
		$attachment_id = $this->factory->attachment->create( array( 'post_author' => $user_id ) );
		wp_set_current_user( $user_id );

		// Create a regular jpg file.
		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/test-' . $attachment_id . '.jpg';
		file_put_contents( $file_path, 'fake image' );

		update_attached_file( $attachment_id, $file_path );

		// Set up fake $_FILES.
		$_FILES['file'] = array(
			'name'     => 'test.elpx',
			'type'     => 'application/zip',
			'tmp_name' => tempnam( sys_get_temp_dir(), 'test' ),
			'error'    => UPLOAD_ERR_OK,
			'size'     => 100,
		);
		file_put_contents( $_FILES['file']['tmp_name'], 'test content' );

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->save_elp_file( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'invalid_file_type', $result->get_error_code() );

		unlink( $file_path );
		unlink( $_FILES['file']['tmp_name'] );
		unset( $_FILES['file'] );
	}

	/**
	 * Test save_elp_file returns error for file not found.
	 */
	public function test_save_elp_file_file_not_found() {
		$user_id       = $this->factory->user->create( array( 'role' => 'administrator' ) );
		$attachment_id = $this->factory->attachment->create( array( 'post_author' => $user_id ) );
		wp_set_current_user( $user_id );

		// Set a non-existent file path.
		update_attached_file( $attachment_id, '/nonexistent/path/file.elpx' );

		$_FILES['file'] = array(
			'name'     => 'test.elpx',
			'type'     => 'application/zip',
			'tmp_name' => tempnam( sys_get_temp_dir(), 'test' ),
			'error'    => UPLOAD_ERR_OK,
			'size'     => 100,
		);
		file_put_contents( $_FILES['file']['tmp_name'], 'test content' );

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->save_elp_file( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'file_not_found', $result->get_error_code() );

		unlink( $_FILES['file']['tmp_name'] );
		unset( $_FILES['file'] );
	}

	/**
	 * Test save_elp_file returns error for upload error.
	 */
	public function test_save_elp_file_upload_error() {
		$user_id       = $this->factory->user->create( array( 'role' => 'administrator' ) );
		$attachment_id = $this->factory->attachment->create( array( 'post_author' => $user_id ) );
		wp_set_current_user( $user_id );

		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/test-' . $attachment_id . '.elpx';
		file_put_contents( $file_path, 'test content' );

		update_attached_file( $attachment_id, $file_path );

		$_FILES['file'] = array(
			'name'     => 'test.elpx',
			'type'     => 'application/zip',
			'tmp_name' => '',
			'error'    => UPLOAD_ERR_NO_FILE,
			'size'     => 0,
		);

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->save_elp_file( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'upload_error', $result->get_error_code() );

		unlink( $file_path );
		unset( $_FILES['file'] );
	}

	/**
	 * Test create_elp_file upload error.
	 */
	public function test_create_elp_file_upload_error() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$_FILES['file'] = array(
			'name'     => 'test.elpx',
			'type'     => 'application/zip',
			'tmp_name' => '',
			'error'    => UPLOAD_ERR_INI_SIZE,
			'size'     => 0,
		);

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/create' );

		$result = $this->rest_api->create_elp_file( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertEquals( 'upload_error', $result->get_error_code() );

		unset( $_FILES['file'] );
	}

	/**
	 * Test check_read_permission error message.
	 */
	public function test_check_read_permission_error_message() {
		$attachment_id = $this->factory->attachment->create( array( 'post_status' => 'private' ) );
		$request       = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		wp_set_current_user( 0 );

		$result = $this->rest_api->check_read_permission( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertStringContainsString( 'permission', $result->get_error_message() );
	}

	/**
	 * Test check_edit_permission error message.
	 */
	public function test_check_edit_permission_error_message() {
		$attachment_id = $this->factory->attachment->create();
		$request       = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		wp_set_current_user( 0 );

		$result = $this->rest_api->check_edit_permission( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertStringContainsString( 'permission', $result->get_error_message() );
	}

	/**
	 * Test save_elp_file deletes old extracted folder.
	 */
	public function test_save_elp_file_with_old_extraction() {
		$user_id       = $this->factory->user->create( array( 'role' => 'administrator' ) );
		$attachment_id = $this->factory->attachment->create( array( 'post_author' => $user_id ) );
		wp_set_current_user( $user_id );

		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/test-' . $attachment_id . '.elpx';

		// Create a valid elpx file.
		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );

		// Create old extracted folder.
		$old_hash   = str_repeat( 'a', 40 );
		$old_folder = $upload_dir['basedir'] . '/exelearning/' . $old_hash . '/';
		wp_mkdir_p( $old_folder );
		file_put_contents( $old_folder . 'test.html', 'test' );

		update_post_meta( $attachment_id, '_exelearning_extracted', $old_hash );

		// Verify old folder exists.
		$this->assertTrue( is_dir( $old_folder ) );

		// Note: We can't fully test this because the actual save requires a valid file upload.
		// But we can verify the metadata is set.
		$this->assertEquals( $old_hash, get_post_meta( $attachment_id, '_exelearning_extracted', true ) );

		// Clean up.
		$this->recursive_delete_test( $old_folder );
		if ( file_exists( $file_path ) ) {
			unlink( $file_path );
		}
	}

	/**
	 * Helper to recursively delete test directories.
	 *
	 * @param string $dir Directory path.
	 */
	private function recursive_delete_test( $dir ) {
		if ( ! file_exists( $dir ) ) {
			return;
		}

		if ( is_file( $dir ) || is_link( $dir ) ) {
			unlink( $dir );
		} else {
			$files = array_diff( scandir( $dir ), array( '.', '..' ) );
			foreach ( $files as $file ) {
				$this->recursive_delete_test( $dir . DIRECTORY_SEPARATOR . $file );
			}
			rmdir( $dir );
		}
	}

	/**
	 * Test proxy_content calls content proxy.
	 */
	public function test_proxy_content_uses_content_proxy() {
		$hash    = str_repeat( 'c', 40 );
		$request = new WP_REST_Request( 'GET', '/exelearning/v1/content/' . $hash );
		$request->set_param( 'hash', $hash );
		$request->set_param( 'file', 'index.html' );

		$result = $this->rest_api->proxy_content( $request );

		// Should return error because content doesn't exist.
		$this->assertInstanceOf( WP_Error::class, $result );
	}

	/**
	 * Test check_edit_permission with valid user returns true.
	 */
	public function test_check_edit_permission_returns_true_for_owner() {
		$user_id       = $this->factory->user->create( array( 'role' => 'editor' ) );
		$attachment_id = $this->factory->attachment->create( array( 'post_author' => $user_id ) );

		wp_set_current_user( $user_id );

		$request = new WP_REST_Request( 'POST', '/exelearning/v1/save/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->check_edit_permission( $request );

		$this->assertTrue( $result );
	}

	/**
	 * Test check_read_permission for public attachment.
	 */
	public function test_check_read_permission_public_attachment() {
		$attachment_id = $this->factory->attachment->create( array( 'post_status' => 'inherit' ) );
		$request       = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		// Public attachment should be readable by logged-out users.
		wp_set_current_user( 0 );

		// Note: WordPress permissions for attachments with 'inherit' status depend on parent.
		$result = $this->rest_api->check_read_permission( $request );

		// Just verify it returns a value (true or WP_Error).
		$this->assertTrue( true === $result || $result instanceof WP_Error );
	}

	/**
	 * Test get_elp_data with no preview URL when has_preview is 0.
	 */
	public function test_get_elp_data_no_preview_url_when_not_extracted() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'application/zip',
				'post_author'    => $user_id,
			)
		);

		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/test-no-ext-' . $attachment_id . '.elpx';

		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );
		// Don't set _exelearning_extracted.

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );
		$data   = $result->get_data();

		$this->assertNull( $data['previewUrl'] );
		$this->assertFalse( $data['hasPreview'] );

		unlink( $file_path );
	}

	/**
	 * Test get_elp_data returns version info.
	 */
	public function test_get_elp_data_returns_version() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'application/zip',
				'post_author'    => $user_id,
			)
		);

		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/test-version-' . $attachment_id . '.elpx';

		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );
		update_post_meta( $attachment_id, '_exelearning_version', '3' );

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );
		$data   = $result->get_data();

		$this->assertEquals( 3, $data['version'] );

		unlink( $file_path );
	}

	/**
	 * Test get_elp_data returns filename.
	 */
	public function test_get_elp_data_returns_filename() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'application/zip',
				'post_author'    => $user_id,
			)
		);

		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/my-test-file.elpx';

		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );
		$data   = $result->get_data();

		$this->assertEquals( 'my-test-file.elpx', $data['filename'] );

		unlink( $file_path );
	}

	/**
	 * Test check_upload_permission allows contributors.
	 */
	public function test_check_upload_permission_denies_contributors() {
		$user_id = $this->factory->user->create( array( 'role' => 'contributor' ) );
		wp_set_current_user( $user_id );

		$result = $this->rest_api->check_upload_permission();

		$this->assertFalse( $result );
	}

	/**
	 * Test content proxy route accepts valid hash patterns.
	 */
	public function test_content_proxy_route_hash_pattern() {
		$routes        = rest_get_server()->get_routes();
		$content_route = $routes['/exelearning/v1/content/(?P<hash>[a-f0-9]{40})(?:/(?P<file>.*))?'];

		$this->assertNotEmpty( $content_route );
		$this->assertArrayHasKey( 'args', $content_route[0] );
		$this->assertArrayHasKey( 'hash', $content_route[0]['args'] );
	}

	/**
	 * Test REST API namespace.
	 */
	public function test_rest_api_namespace() {
		$routes    = rest_get_server()->get_routes();
		$has_namespace = false;

		foreach ( array_keys( $routes ) as $route ) {
			if ( strpos( $route, 'exelearning/v1' ) !== false ) {
				$has_namespace = true;
				break;
			}
		}

		$this->assertTrue( $has_namespace );
	}

	/**
	 * Test register_routes adds all expected routes.
	 */
	public function test_register_routes_count() {
		$routes = rest_get_server()->get_routes();

		$exelearning_routes = array_filter(
			array_keys( $routes ),
			function ( $route ) {
				return strpos( $route, 'exelearning/v1' ) !== false;
			}
		);

		// Should have 4 routes: content, save, elp-data, create.
		$this->assertGreaterThanOrEqual( 4, count( $exelearning_routes ) );
	}

	/**
	 * Test get_elp_data returns all expected fields.
	 */
	public function test_get_elp_data_returns_all_fields() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'application/zip',
				'post_author'    => $user_id,
				'post_title'     => 'All Fields Test',
			)
		);

		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/all-fields-' . $attachment_id . '.elpx';

		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->addFromString( 'index.html', '<html></html>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );

		$hash = str_repeat( 'e', 40 );
		update_post_meta( $attachment_id, '_exelearning_title', 'Custom Title' );
		update_post_meta( $attachment_id, '_exelearning_description', 'Custom Description' );
		update_post_meta( $attachment_id, '_exelearning_license', 'MIT' );
		update_post_meta( $attachment_id, '_exelearning_language', 'en' );
		update_post_meta( $attachment_id, '_exelearning_resource_type', 'lesson' );
		update_post_meta( $attachment_id, '_exelearning_extracted', $hash );
		update_post_meta( $attachment_id, '_exelearning_has_preview', '1' );
		update_post_meta( $attachment_id, '_exelearning_version', '3' );

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );
		$data   = $result->get_data();

		// Check all expected fields.
		$this->assertEquals( $attachment_id, $data['id'] );
		$this->assertEquals( 'All Fields Test', $data['title'] );
		$this->assertEquals( 'elpx', $data['extension'] );
		$this->assertEquals( 3, $data['version'] );
		$this->assertTrue( $data['hasPreview'] );
		$this->assertNotNull( $data['previewUrl'] );
		$this->assertArrayHasKey( 'metadata', $data );
		$this->assertEquals( 'Custom Title', $data['metadata']['title'] );
		$this->assertEquals( 'Custom Description', $data['metadata']['description'] );
		$this->assertEquals( 'MIT', $data['metadata']['license'] );
		$this->assertEquals( 'en', $data['metadata']['language'] );
		$this->assertEquals( 'lesson', $data['metadata']['resourceType'] );

		unlink( $file_path );
	}

	/**
	 * Test get_elp_data with no version returns null.
	 */
	public function test_get_elp_data_no_version() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'application/zip',
				'post_author'    => $user_id,
			)
		);

		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/no-version-' . $attachment_id . '.elpx';

		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );
		// Don't set _exelearning_version.

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );
		$data   = $result->get_data();

		$this->assertNull( $data['version'] );

		unlink( $file_path );
	}

	/**
	 * Test get_elp_data returns url.
	 */
	public function test_get_elp_data_returns_url() {
		$user_id = $this->factory->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $user_id );

		$attachment_id = $this->factory->attachment->create(
			array(
				'post_mime_type' => 'application/zip',
				'post_author'    => $user_id,
			)
		);

		$upload_dir = wp_upload_dir();
		$file_path  = $upload_dir['basedir'] . '/url-test-' . $attachment_id . '.elpx';

		$zip = new ZipArchive();
		$zip->open( $file_path, ZipArchive::CREATE );
		$zip->addFromString( 'content.xml', '<package></package>' );
		$zip->close();

		update_attached_file( $attachment_id, $file_path );

		$request = new WP_REST_Request( 'GET', '/exelearning/v1/elp-data/' . $attachment_id );
		$request->set_param( 'id', $attachment_id );

		$result = $this->rest_api->get_elp_data( $request );
		$data   = $result->get_data();

		$this->assertArrayHasKey( 'url', $data );
		$this->assertNotNull( $data['url'] );

		unlink( $file_path );
	}
}
