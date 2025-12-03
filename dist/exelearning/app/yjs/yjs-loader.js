/**
 * Yjs Module Loader
 * Dynamically loads all Yjs modules in the correct order.
 * Include this script to bootstrap the Yjs system.
 *
 * Usage in HTML:
 *   <script src="/app/yjs/yjs-loader.js"></script>
 *   <script>
 *     YjsLoader.load().then(() => {
 *       // All modules ready
 *       YjsModules.initializeProject(projectId, authToken);
 *     });
 *   </script>
 */
(function () {
  'use strict';

  // Get basePath and version from eXeLearning (set by pages.controller.ts)
  const getBasePath = () => window.eXeLearning?.symfony?.basePath || '';
  const getVersion = () => window.eXeLearning?.version || 'v1.0.0';
  // URL pattern: {basePath}/{version}/path (e.g., /web/exelearning/v0.0.0-alpha/libs/yjs/yjs.min.js)
  const assetPath = (path) => `${getBasePath()}/${getVersion()}${path.startsWith('/') ? path : '/' + path}`;

  // Paths are computed lazily to ensure eXeLearning globals are available
  const getLIBS_PATH = () => assetPath('/libs/yjs');
  const getBASE_PATH = () => assetPath('/app/yjs');
  const getJSZIP_DEPENDENCY = () => assetPath('/libs/jszip/jszip.min.js');

  // Local Yjs dependencies (bundled with esbuild) - computed lazily
  const getYJS_DEPENDENCIES = () => [
    `${getLIBS_PATH()}/yjs.min.js`,                  // Core Yjs library (exports window.Y)
    `${getLIBS_PATH()}/y-indexeddb.min.js`,          // IndexedDB persistence (exports window.IndexeddbPersistence)
    `${getLIBS_PATH()}/y-websocket.min.js`,          // y-websocket provider (exports window.WebsocketProvider)
  ];

  // Local module files in load order
  const LOCAL_MODULES = [
    'YjsDocumentManager.js',
    'YjsLockManager.js',
    'YjsStructureBinding.js',
    'AssetCacheManager.js',
    'AssetManager.js',  // New asset:// URL manager (must load before ElpxImporter)
    'AssetWebSocketHandler.js',  // WebSocket handler for peer-to-peer asset sync
    'LegacyXmlParser.js',  // Parser for legacy contentv3.xml (must load before ElpxImporter)
    'ElpxImporter.js',
    'ElpxExporter.js',  // Legacy compatibility shim
    // Client-side exporters (run in browser to save server CPU)
    'exporters/BaseExporter.js',  // Base class for all exporters
    'exporters/ResourceFetcher.js',  // Fetches themes/libs/iDevices from server
    'exporters/LibraryDetector.js',  // Detects required JS/CSS libraries from HTML content
    // Renderers (must load before exporters that use them)
    'exporters/renderers/IdeviceHtmlRenderer.js',  // iDevice HTML rendering
    'exporters/renderers/PageHtmlRenderer.js',  // Page HTML rendering
    // Generators (for SCORM/IMS manifests)
    'exporters/generators/Scorm12ManifestGenerator.js',  // SCORM 1.2 manifest
    'exporters/generators/Scorm2004ManifestGenerator.js',  // SCORM 2004 manifest
    'exporters/generators/ImsManifestGenerator.js',  // IMS Content Package manifest
    'exporters/generators/LomMetadataGenerator.js',  // LOM metadata
    // Exporters
    'exporters/ElpxExporter.js',  // ELPX export (extends BaseExporter)
    'exporters/Html5Exporter.js',  // HTML5 website export
    'exporters/PageExporter.js',  // Single-page HTML export
    'exporters/Scorm12Exporter.js',  // SCORM 1.2 export
    'exporters/Scorm2004Exporter.js',  // SCORM 2004 export
    'exporters/ImsExporter.js',  // IMS Content Package export
    'exporters/Epub3Exporter.js',  // EPUB3 ebook export
    'exporters/PreviewExporter.js',  // Client-side preview - single page (extends Html5Exporter)
    'exporters/WebsitePreviewExporter.js',  // Client-side preview - multi-page SPA (extends Html5Exporter)
    'exporters/index.js',  // Exporter factory and registration
    'SaveManager.js',  // Save to server with progress modal (must load before YjsProjectBridge)
    'YjsProjectBridge.js',
    'YjsTinyMCEBinding.js',
    'YjsStructureTreeAdapter.js',
    'YjsProjectManagerMixin.js',
    'YjsPropertiesBinding.js',
    'index.js',
  ];

  /**
   * Load a script dynamically
   * @param {string} src - Script URL
   * @returns {Promise<void>}
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Load scripts sequentially
   * @param {string[]} scripts - Array of script URLs
   * @returns {Promise<void>}
   */
  async function loadScriptsSequentially(scripts) {
    for (const script of scripts) {
      await loadScript(script);
    }
  }

  /**
   * Check if Yjs core is already loaded
   * @returns {boolean}
   */
  function isYjsLoaded() {
    return typeof window.Y !== 'undefined';
  }

  /**
   * Check if all local modules are loaded
   * @returns {boolean}
   */
  function areModulesLoaded() {
    return typeof window.YjsModules !== 'undefined' && window.YjsModules.YjsDocumentManager;
  }

  /**
   * Main loader object
   */
  window.YjsLoader = {
    loaded: false,
    loading: false,
    _loadPromise: null,

    /**
     * Load all Yjs dependencies and modules
     * @param {Object} options - Load options
     * @returns {Promise<void>}
     */
    async load(options = {}) {
      // Return existing promise if already loading
      if (this._loadPromise) {
        return this._loadPromise;
      }

      // Already loaded
      if (this.loaded && areModulesLoaded()) {
        console.log('[YjsLoader] Already loaded');
        return Promise.resolve();
      }

      this.loading = true;
      console.log('[YjsLoader] Starting load...');

      this._loadPromise = this._doLoad(options);
      return this._loadPromise;
    },

    /**
     * Internal load implementation
     * @private
     */
    async _doLoad(options) {
      try {
        // Get paths lazily (eXeLearning globals should be available now)
        const basePath = options.basePath || getBASE_PATH();

        // Load Yjs dependencies if not already present
        if (!isYjsLoaded()) {
          console.log('[YjsLoader] Loading Yjs from local libs...');
          await loadScriptsSequentially(getYJS_DEPENDENCIES());
        } else {
          console.log('[YjsLoader] Yjs already loaded');
        }

        // Load JSZip if not already present (needed for .elpx import/export)
        if (!window.JSZip) {
          console.log('[YjsLoader] Loading JSZip...');
          await loadScript(getJSZIP_DEPENDENCY());
        }

        // Verify Y is available
        if (!window.Y) {
          throw new Error('Yjs core failed to load');
        }

        // Load local modules
        console.log('[YjsLoader] Loading local modules...');
        const moduleUrls = LOCAL_MODULES.map((m) => `${basePath}/${m}`);
        await loadScriptsSequentially(moduleUrls);

        // Verify modules loaded
        if (!areModulesLoaded()) {
          throw new Error('Local modules failed to load');
        }

        this.loaded = true;
        this.loading = false;
        console.log('[YjsLoader] All modules loaded successfully');

        // Fire custom event
        document.dispatchEvent(new CustomEvent('yjs-ready'));

        return window.YjsModules;
      } catch (error) {
        this.loading = false;
        console.error('[YjsLoader] Load failed:', error);
        throw error;
      }
    },

    /**
     * Initialize for a project (convenience method)
     * @param {number} projectId - Project ID
     * @param {string} authToken - Auth token
     * @param {Object} options - Options
     * @returns {Promise<YjsProjectBridge>}
     */
    async initProject(projectId, authToken, options = {}) {
      await this.load(options);
      return window.YjsModules.initializeProject(projectId, authToken, options);
    },

    /**
     * Get load status
     * @returns {Object}
     */
    getStatus() {
      return {
        loaded: this.loaded,
        loading: this.loading,
        yjsAvailable: isYjsLoaded(),
        modulesAvailable: areModulesLoaded(),
      };
    },
  };

  // Auto-load if data attribute is present
  if (document.currentScript?.dataset.autoload !== undefined) {
    window.YjsLoader.load();
  }
})();
