<?php
/**
 * Media library integration for eXeLearning plugin.
 *
 * This class adds integration features to the WordPress media library
 * for handling eXeLearning files.
 *
 * @package Exelearning
 */

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Class ExeLearning_Media_Library.
 *
 * Manages integration with the WordPress media library.
 */
class ExeLearning_Media_Library {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_filter( 'manage_media_columns', array( $this, 'add_elp_column' ) );
		add_action( 'manage_media_custom_column', array( $this, 'render_elp_column' ), 10, 2 );
    add_action( 'add_meta_boxes_attachment', array( $this, 'add_elp_meta_box' ) );


        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_media_modal_scripts' ) );

        add_filter( 'wp_prepare_attachment_for_js', array( $this, 'add_elp_metadata_to_js' ), 10, 3 );


    }

    /**
     * Encola el script para el modal de medios.
     */
    public function enqueue_media_modal_scripts( $hook ) {
        // Cargar en páginas donde se usa la biblioteca de medios.
        $allowed_hooks = array( 'upload.php', 'post.php', 'post-new.php', 'media.php' );

        if ( in_array( $hook, $allowed_hooks, true ) || did_action( 'wp_enqueue_media' ) ) {
            wp_enqueue_media();

            wp_enqueue_script(
                'exelearning-media-modal',
                plugins_url( '../../assets/js/exelearning-media-modal.js', __FILE__ ),
                array( 'jquery', 'media-views' ),
                EXELEARNING_VERSION,
                true
            );

            wp_enqueue_style(
                'exelearning-media-library',
                plugins_url( '../../assets/css/exelearning-admin.css', __FILE__ ),
                array(),
                EXELEARNING_VERSION
            );
        }
    }

    /**
     * Añade los metadatos de eXeLearning al objeto del adjunto.
     */
    public function add_elp_metadata_to_js( $response, $post, $meta ) {
        $extracted_hash = get_post_meta( $post->ID, '_exelearning_extracted', true );

        if ( $extracted_hash ) {
            $has_preview = get_post_meta( $post->ID, '_exelearning_has_preview', true );
            $version     = get_post_meta( $post->ID, '_exelearning_version', true );

            $response['exelearning'] = array(
                'license'        => get_post_meta( $post->ID, '_exelearning_license', true ),
                'language'       => get_post_meta( $post->ID, '_exelearning_language', true ),
                'resource_type'  => get_post_meta( $post->ID, '_exelearning_resource_type', true ),
                'version'        => $version,
                'has_preview'    => $has_preview === '1',
            );

            // Only include preview_url if the file has index.html (version 3 files).
            if ( $has_preview === '1' ) {
                $upload_dir  = wp_upload_dir();
                $response['exelearning']['preview_url'] = $upload_dir['baseurl'] . '/exelearning/' . $extracted_hash . '/index.html';
            }
        }

        return $response;
    }

/**
 * Adds a meta box to the attachment edit screen.
 */
public function add_elp_meta_box() {
    global $post;

    $extracted_url = get_post_meta( $post->ID, '_exelearning_extracted', true );
    
    // Metabox para vista previa del contenido extraído
    if ( $extracted_url ) {
        add_meta_box(
            'exelearning-preview-metabox',
            __( 'eXeLearning Content Preview', 'exelearning' ),
            array( $this, 'render_preview_meta_box' ),
            'attachment',
            'normal',
            'high'
        );
    }


    if ( get_post_meta( $post->ID, '_exelearning_extracted', true ) ) {
        add_meta_box(
            'exelearning-metabox',
            __( 'eXeLearning Metadata', 'exelearning' ),
            array( $this, 'render_elp_meta_box' ),
            'attachment',
            'side'
        );
    }
}

	 /**
	 * Renderiza el metabox de vista previa
	 */
	public function render_preview_meta_box( $post ) {

	    $directory   = get_post_meta( $post->ID, '_exelearning_extracted', true );
	    $has_preview = get_post_meta( $post->ID, '_exelearning_has_preview', true );
	    $version     = get_post_meta( $post->ID, '_exelearning_version', true );

	    if ( $directory ) {
	        if ( $has_preview === '1' ) {
	            $upload_dir  = wp_upload_dir();
	            $preview_url = $upload_dir['baseurl'] . '/exelearning/' . $directory . '/index.html';

	            echo '<div style="width: 100%; height: 600px; overflow: auto; margin-bottom: 15px;">';
	            echo '<iframe src="' . esc_url( $preview_url ) . '" style="width: 100%; height: 100%; border: none;"></iframe>';
	            echo '</div>';
	            echo '<p><a href="' . esc_url( $preview_url ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Open in new tab', 'exelearning' ) . '</a></p>';
	        } else {
	            echo '<div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">';
	            echo '<p><strong>' . esc_html__( 'No preview available', 'exelearning' ) . '</strong></p>';
	            echo '<p>' . esc_html__( 'This is an eXeLearning v2 source file (.elp). To view the content, open it in eXeLearning and export it as HTML.', 'exelearning' ) . '</p>';
	            echo '</div>';
	        }
	    }

	}


/**
 * Renders the content of the meta box.
 */
public function render_elp_meta_box( $post ) {
    // $title = get_post_meta( $post->ID, '_exelearning_title', true );
    // $description = get_post_meta( $post->ID, '_exelearning_description', true );
    $license = get_post_meta( $post->ID, '_exelearning_license', true );
    $language = get_post_meta( $post->ID, '_exelearning_language', true );
    $resource_type = get_post_meta( $post->ID, '_exelearning_resource_type', true );

    echo '<ul>';
    // echo '<li><strong>' . esc_html__( 'Title:', 'exelearning' ) . '</strong> ' . esc_html( $title ) . '</li>';
    // echo '<li><strong>' . esc_html__( 'Description:', 'exelearning' ) . '</strong> ' . esc_html( $description ) . '</li>';
    echo '<li><strong>' . esc_html__( 'License:', 'exelearning' ) . '</strong> ' . esc_html( $license ) . '</li>';
    echo '<li><strong>' . esc_html__( 'Language:', 'exelearning' ) . '</strong> ' . esc_html( $language ) . '</li>';
    echo '<li><strong>' . esc_html__( 'Resource Type:', 'exelearning' ) . '</strong> ' . esc_html( $resource_type ) . '</li>';
    echo '</ul>';
}


// /**
//  * Adds a meta box to the attachment edit screen.
//  */
// public function add_elp_meta_box() {
//     global $post;
//     if ( get_post_meta( $post->ID, '_exelearning_title', true ) ) {
//         add_meta_box(
//             'exelearning-metabox',
//             __( 'eXeLearning Metadata', 'exelearning' ),
//             array( $this, 'render_elp_meta_box' ),
//             'attachment',
//             'side'
//         );
//     }
// }



	/**
	 * Adds a custom column for eXeLearning files in the media library.
	 *
	 * @param array $columns Current media library columns.
	 * @return array Modified columns.
	 */
	public function add_elp_column( $columns ) {
		$columns['exelearning'] = __( 'eXeLearning', 'exelearning' );
		return $columns;
	}

	// /**
	//  * Renders the custom eXeLearning column content.
	//  *
	//  * @param string $column_name Column name.
	//  * @param int    $post_id Attachment ID.
	//  */
	// public function render_elp_column( $column_name, $post_id ) {
	// 	if ( 'exelearning' !== $column_name ) {
	// 		return;
	// 	}

	// 	$file = get_attached_file( $post_id );
	// 	if ( 'elp' === strtolower( pathinfo( $file, PATHINFO_EXTENSION ) ) ) {
	// 		$title = get_post_meta( $post_id, '_exelearning_title', true );
	// 		$description = get_post_meta( $post_id, '_exelearning_description', true );
	// 		$license = get_post_meta( $post_id, '_exelearning_license', true );
	// 		$language = get_post_meta( $post_id, '_exelearning_language', true );
	// 		$resource_type = get_post_meta( $post_id, '_exelearning_resource_type', true );

	// 		echo '<strong>' . esc_html__( 'Title:', 'exelearning' ) . '</strong> ' . esc_html( $title ) . '<br>';
	// 		echo '<strong>' . esc_html__( 'Description:', 'exelearning' ) . '</strong> ' . esc_html( $description ) . '<br>';
	// 		echo '<strong>' . esc_html__( 'License:', 'exelearning' ) . '</strong> ' . esc_html( $license ) . '<br>';
	// 		echo '<strong>' . esc_html__( 'Language:', 'exelearning' ) . '</strong> ' . esc_html( $language ) . '<br>';
	// 		echo '<strong>' . esc_html__( 'Resource Type:', 'exelearning' ) . '</strong> ' . esc_html( $resource_type );
	// 	}
	// }

	/**
	 * Renders the custom eXeLearning column content.
	 */
	public function render_elp_column( $column_name, $post_id ) {
	    if ( 'exelearning' !== $column_name ) {
	        return;
	    }

	    // Verificar si es un archivo .elp usando los metadatos
	    $is_elp = get_post_meta( $post_id, '_exelearning_extracted', true );

	    if ( $is_elp ) {
	        // $title = get_post_meta( $post_id, '_exelearning_title', true );
	        // $description = get_post_meta( $post_id, '_exelearning_description', true );
	        $license = get_post_meta( $post_id, '_exelearning_license', true );
	        $language = get_post_meta( $post_id, '_exelearning_language', true );
	        $resource_type = get_post_meta( $post_id, '_exelearning_resource_type', true );

	        echo '<div class="exelearning-metadata">';
	        
	        // if ( $title ) {
	        //     echo '<div><strong>' . esc_html__( 'Title:', 'exelearning' ) . '</strong> ' . esc_html( $title ) . '</div>';
	        // }
	        
	        // if ( $description ) {
	        //     echo '<div><strong>' . esc_html__( 'Description:', 'exelearning' ) . '</strong> ' . esc_html( $description ) . '</div>';
	        // }
	        
	        if ( $license ) {
	            echo '<div><strong>' . esc_html__( 'License:', 'exelearning' ) . '</strong> ' . esc_html( $license ) . '</div>';
	        }
	        
	        if ( $language ) {
	            echo '<div><strong>' . esc_html__( 'Language:', 'exelearning' ) . '</strong> ' . esc_html( $language ) . '</div>';
	        }
	        
	        if ( $resource_type ) {
	            echo '<div><strong>' . esc_html__( 'Resource Type:', 'exelearning' ) . '</strong> ' . esc_html( $resource_type ) . '</div>';
	        }
	        
	        echo '</div>';
	    }
	}

}
