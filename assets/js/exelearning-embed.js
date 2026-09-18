/**
 * Toolbar and poster behavior for embedded eXeLearning packages.
 *
 * The shortcode and the block used to print one <script> block per embed, which
 * WordPress.org does not allow (and which shipped the same code again for every
 * embed on the page). This file carries that behavior once, enqueued through
 * wp_enqueue_script(), for every embed the page renders.
 *
 * Everything is delegated from `document`, so nothing has to be bound per
 * instance: an embed inserted later -- a lazy-loaded block, an AJAX-rendered
 * excerpt -- works without a second pass. The embed a click belongs to is found
 * by walking up from the clicked control to the first ancestor that contains an
 * `.exelearning-iframe`, so the script stays out of the markup's business and
 * several embeds on one page never reach into each other.
 */
( function () {
	'use strict';

	/**
	 * The embed a control belongs to.
	 *
	 * @param {Element} element The clicked control.
	 * @return {Element|null} The nearest ancestor holding an embed frame.
	 */
	function containerFor( element ) {
		for ( var node = element.parentElement; node; node = node.parentElement ) {
			if ( node.querySelector( '.exelearning-iframe' ) ) {
				return node;
			}
		}
		return null;
	}

	/**
	 * Promote a deferred frame: load it, reveal it and drop the poster.
	 *
	 * In poster mode the iframe ships with its URL in `data-src` and hidden, so the
	 * package is downloaded only when the visitor asks for it. Called both by the
	 * poster itself and by the fullscreen button, which must not expand a hidden
	 * frame that has no document yet.
	 *
	 * @param {Element} container The embed.
	 * @return {void}
	 */
	function activate( container ) {
		var iframe = container.querySelector( '.exelearning-iframe' );
		if ( ! iframe ) {
			return;
		}

		var deferred = iframe.getAttribute( 'data-src' );
		if ( deferred && ! iframe.getAttribute( 'src' ) ) {
			iframe.setAttribute( 'src', deferred );
		}

		iframe.style.display = '';

		var poster = container.querySelector( '.exelearning-poster' );
		if ( poster ) {
			poster.style.display = 'none';
		}
	}

	/**
	 * Take the embed frame fullscreen, whatever the browser calls it.
	 *
	 * @param {Element} container The embed.
	 * @return {void}
	 */
	function fullscreen( container ) {
		var iframe = container.querySelector( '.exelearning-iframe' );
		if ( ! iframe ) {
			return;
		}

		if ( iframe.requestFullscreen ) {
			iframe.requestFullscreen();
		} else if ( iframe.webkitRequestFullscreen ) {
			iframe.webkitRequestFullscreen();
		} else if ( iframe.msRequestFullscreen ) {
			iframe.msRequestFullscreen();
		}
	}

	document.addEventListener( 'click', function ( event ) {
		var target = event.target;
		if ( ! target || ! target.closest ) {
			return;
		}

		var control = target.closest( '.exelearning-poster, .exelearning-fullscreen-btn' );
		if ( ! control ) {
			return;
		}

		var container = containerFor( control );
		if ( ! container ) {
			return;
		}

		// The fullscreen button in poster mode loads and reveals the frame first:
		// expanding a hidden, srcless frame would fill the screen with nothing.
		activate( container );

		if ( control.classList.contains( 'exelearning-fullscreen-btn' ) ) {
			fullscreen( container );
		}
	} );
}() );
