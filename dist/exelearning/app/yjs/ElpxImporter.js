/**
 * ElpxImporter
 * Imports .elpx (ZIP) files and populates a Yjs document.
 * Parses content.xml to extract navigation, pages, blocks, and iDevices.
 *
 * Uses AssetManager to store assets with asset:// URLs.
 *
 * Usage:
 *   const importer = new ElpxImporter(yjsDocumentManager, assetManager);
 *   await importer.importFromFile(file);
 */
class ElpxImporter {
  /**
   * @param {YjsDocumentManager} documentManager - The Yjs document manager
   * @param {AssetManager} assetManager - Asset manager for storing assets
   */
  constructor(documentManager, assetManager = null) {
    this.manager = documentManager;
    this.assetManager = assetManager;
    this.Y = window.Y;

    // Map of original asset paths to asset IDs (populated during import)
    this.assetMap = new Map();

    // Progress callback (set via options.onProgress)
    this.onProgress = null;
  }

  /**
   * Report progress to callback if set
   * @param {string} phase - Current phase: 'decompress' | 'assets' | 'structure' | 'precache'
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} message - Localized message to display
   */
  _reportProgress(phase, percent, message) {
    if (typeof this.onProgress === 'function') {
      this.onProgress({ phase, percent, message });
    }
  }

  /**
   * Import an .elpx file
   * @param {File} file - The .elpx file to import
   * @param {Object} options - Import options
   * @param {boolean} options.clearExisting - If true, clears existing structure before import (default: true)
   * @param {boolean} options.clearIndexedDB - If true, clears IndexedDB before import (for testing)
   * @param {string|null} options.parentId - Parent page ID to import under (null for root level)
   * @returns {Promise<{pages: number, blocks: number, components: number, assets: number}>}
   */
  async importFromFile(file, options = {}) {
    const { clearExisting = true, clearIndexedDB = false, parentId = null, onProgress = null } = options;

    // Store progress callback
    if (onProgress) {
      this.onProgress = onProgress;
    }

    console.log(`[ElpxImporter] Importing ${file.name}... (clearExisting: ${clearExisting}, parentId: ${parentId})`);

    // Phase 1: Decompressing (0-10%)
    this._reportProgress('decompress', 0, typeof _ === 'function' ? _('Decompressing...') : 'Decompressing...');

    // Optional: Clear IndexedDB to ensure clean state (for debugging)
    if (clearIndexedDB && this.manager && this.manager.projectId) {
      const dbName = `exelearning-project-${this.manager.projectId}`;
      console.log(`[ElpxImporter] Clearing IndexedDB: ${dbName}`);
      try {
        await this.clearIndexedDB(dbName);
        console.log('[ElpxImporter] IndexedDB cleared successfully');
      } catch (e) {
        console.warn('[ElpxImporter] Failed to clear IndexedDB:', e);
      }
    }

    // Load JSZip
    const JSZip = window.JSZip;
    if (!JSZip) {
      throw new Error('JSZip library not loaded');
    }

    // Load ZIP
    const zip = await JSZip.loadAsync(file);

    // Report decompression complete (10%)
    this._reportProgress('decompress', 10, typeof _ === 'function' ? _('File decompressed') : 'File decompressed');

    // Find content.xml (could be content.xml or contentv3.xml for legacy)
    let contentXml = null;
    let contentFile = zip.file('content.xml');
    let isLegacyFormat = false;

    if (!contentFile) {
      contentFile = zip.file('contentv3.xml');
      isLegacyFormat = true;
    }

    if (!contentFile) {
      throw new Error('No content.xml found in .elpx file');
    }

    contentXml = await contentFile.async('text');

    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(contentXml, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`XML parsing error: ${parseError.textContent}`);
    }

    // Check if it's Python pickle format (legacy .elp with contentv3.xml)
    const rootElement = xmlDoc.documentElement?.tagName;
    if (rootElement === 'instance' || rootElement === 'dictionary') {
      console.log('[ElpxImporter] Legacy Python pickle format detected, converting via backend...');
      return await this.importLegacyViaBackend(file, { clearExisting, parentId });
    }

    // Extract and import structure
    const stats = await this.importStructure(xmlDoc, zip, { clearExisting, parentId });

    console.log(`[ElpxImporter] Import complete:`, stats);
    return stats;
  }

  /**
   * Import document structure from parsed XML
   * @param {Document} xmlDoc - Parsed XML document
   * @param {JSZip} zip - The ZIP file for extracting assets
   * @param {Object} options - Import options
   * @param {boolean} options.clearExisting - If true, clears existing structure before import
   * @param {string|null} options.parentId - Parent page ID to import under (null for root level)
   */
  async importStructure(xmlDoc, zip, options = {}) {
    const { clearExisting = true, parentId = null } = options;
    const stats = { pages: 0, blocks: 0, components: 0, assets: 0 };

    // Phase 2: Extracting assets (10-50%)
    this._reportProgress('assets', 10, typeof _ === 'function' ? _('Extracting assets...') : 'Extracting assets...');

    // *** IMPORTANT: Extract assets FIRST ***
    // This populates this.assetMap for {{context_path}} conversion
    stats.assets = await this.importAssets(zip);

    // Assets extracted (50%)
    this._reportProgress('assets', 50, typeof _ === 'function' ? _('Assets extracted') : 'Assets extracted');

    // Get Y.Doc components
    const ydoc = this.manager.getDoc();
    const navigation = this.manager.getNavigation();
    const metadata = this.manager.getMetadata();

    // Extract pages (odeNavStructures) - do this BEFORE the transaction
    let odeNavStructures = this.findNavStructures(xmlDoc);

    console.log('[ElpxImporter] Root element:', xmlDoc.documentElement?.tagName);
    console.log('[ElpxImporter] Found odeNavStructure elements:', odeNavStructures.length);

    // Build a map of all pages by ID for hierarchy lookup
    const pageMap = new Map();
    for (const navNode of odeNavStructures) {
      const pageId = this.getPageId(navNode);
      if (pageId) {
        pageMap.set(pageId, navNode);
      }
    }

    // Filter to only root-level pages (those without parent or with null/empty parent)
    const rootNavStructures = [];
    for (const navNode of odeNavStructures) {
      const parentId = this.getParentPageId(navNode);
      if (!parentId || parentId === '' || parentId === 'null') {
        rootNavStructures.push(navNode);
      }
    }

    // Sort root pages by order
    rootNavStructures.sort((a, b) => {
      const orderA = this.getNavOrder(a);
      const orderB = this.getNavOrder(b);
      return orderA - orderB;
    });

    console.log('[ElpxImporter] Root-level pages to import:', rootNavStructures.length);

    // Extract metadata info before transaction
    const odeProperties = xmlDoc.querySelector('odeProperties');
    const metadataValues = {
      title: odeProperties ? (this.getPropertyValue(odeProperties, 'pp_title') || 'Imported Project') : 'Imported Project',
      author: odeProperties ? (this.getPropertyValue(odeProperties, 'pp_author') || '') : '',
      language: odeProperties ? (this.getPropertyValue(odeProperties, 'pp_lang') || 'en') : 'en',
      description: odeProperties ? (this.getPropertyValue(odeProperties, 'pp_description') || '') : '',
      license: odeProperties ? (this.getPropertyValue(odeProperties, 'pp_license') || '') : ''
    };

    // Build all page structures as a FLAT list (not nested)
    // The structure expects all pages in the navigation array with parentId references
    // If parentId is provided, root-level pages will become children of that parent
    const pageStructures = [];
    this.buildFlatPageList(rootNavStructures, zip, odeNavStructures, pageStructures, parentId);
    console.log('[ElpxImporter] Built flat page list:', pageStructures.length, 'pages, parentId:', parentId);

    // Phase 3: Importing structure (50-80%)
    this._reportProgress('structure', 50, typeof _ === 'function' ? _('Importing structure...') : 'Importing structure...');

    // *** WRAP ALL Yjs OPERATIONS IN A SINGLE TRANSACTION ***
    // This ensures all nested Y types are integrated atomically
    console.log('[ElpxImporter] Starting Yjs transaction...');
    try {
      ydoc.transact(() => {
        console.log('[ElpxImporter] Inside transaction');

        // Clear existing structure only if requested
        if (clearExisting) {
          console.log('[ElpxImporter] Clearing existing navigation, length:', navigation.length);
          while (navigation.length > 0) {
            navigation.delete(0);
          }
          console.log('[ElpxImporter] Navigation cleared');
        }

        // Set metadata only if clearing (replacing) the document
        if (odeProperties && clearExisting) {
          console.log('[ElpxImporter] Setting metadata...');
          metadata.set('title', metadataValues.title);
          metadata.set('author', metadataValues.author);
          metadata.set('language', metadataValues.language);
          metadata.set('description', metadataValues.description);
          metadata.set('license', metadataValues.license);
          console.log('[ElpxImporter] Metadata set');
        }

        // Now create Y types and add to document inside the transaction
        console.log('[ElpxImporter] Creating', pageStructures.length, 'page structures...');
        for (let i = 0; i < pageStructures.length; i++) {
          const pageData = pageStructures[i];
          console.log(`[ElpxImporter] Processing page ${i + 1}/${pageStructures.length}: ${pageData.pageName}`);

          try {
            const pageYMap = this.createPageYMap(pageData, stats);
            if (pageYMap) {
              console.log('[ElpxImporter] Page Y.Map created, pushing to navigation...');
              try {
                navigation.push([pageYMap]);
                console.log('[ElpxImporter] Page pushed successfully');
              } catch (pushErr) {
                console.error('[ElpxImporter] ERROR pushing page to navigation:', pushErr);
                console.error('[ElpxImporter] Page data was:', pageData.pageName);
                throw pushErr;
              }
              stats.pages++;
            }
          } catch (pageErr) {
            console.error('[ElpxImporter] ERROR creating page:', pageData.pageName, pageErr);
            throw pageErr;
          }
        }
        console.log('[ElpxImporter] All pages created');
      });
      console.log('[ElpxImporter] Transaction completed successfully');

      // Structure imported (80%)
      this._reportProgress('structure', 80, typeof _ === 'function' ? _('Structure imported') : 'Structure imported');
    } catch (transactionErr) {
      console.error('[ElpxImporter] TRANSACTION ERROR:', transactionErr);
      console.error('[ElpxImporter] Error stack:', transactionErr.stack);
      throw transactionErr;
    }

    // Phase 4: Precaching assets (80-100%)
    this._reportProgress('precache', 80, typeof _ === 'function' ? _('Precaching assets...') : 'Precaching assets...');

    // Preload all assets for immediate rendering
    if (this.assetManager && this.assetManager.preloadAllAssets) {
      await this.assetManager.preloadAllAssets();
    }

    // Import complete (100%)
    this._reportProgress('precache', 100, typeof _ === 'function' ? _('Import complete') : 'Import complete');

    return stats;
  }

  /**
   * Build a flat list of all pages (recursive helper)
   * Pages are added with parentId references instead of nested children arrays
   * @param {Array} navNodes - Nav structure elements to process
   * @param {JSZip} zip - The ZIP file
   * @param {Array} allNavStructures - All nav structures for finding children
   * @param {Array} flatList - The flat list to populate
   * @param {string|null} parentId - Parent page ID (null for root pages)
   */
  buildFlatPageList(navNodes, zip, allNavStructures, flatList, parentId) {
    for (const navNode of navNodes) {
      const pageData = this.buildPageData(navNode, zip, parentId);
      if (pageData) {
        flatList.push(pageData);

        // Find child pages
        const pageId = pageData.id;
        const childNavNodes = [];
        for (const childNav of allNavStructures) {
          const childParentId = this.getParentPageId(childNav);
          if (childParentId === pageId) {
            childNavNodes.push(childNav);
          }
        }

        // Sort children by order and recursively add them
        childNavNodes.sort((a, b) => this.getNavOrder(a) - this.getNavOrder(b));
        if (childNavNodes.length > 0) {
          this.buildFlatPageList(childNavNodes, zip, allNavStructures, flatList, pageId);
        }
      }
    }
  }

  /**
   * Build plain JavaScript data structure from XML (no Yjs types)
   * This is done BEFORE the transaction to separate parsing from Yjs operations
   * @param {Element} navNode - The odeNavStructure element
   * @param {JSZip} zip - The ZIP file
   * @param {string|null} parentId - Parent page ID
   * @returns {Object} Plain JS object with page data
   */
  buildPageData(navNode, zip, parentId = null) {
    const pageId = this.getPageId(navNode) || this.generateId('page');
    const pageName = this.getPageName(navNode);
    const order = this.getNavOrder(navNode);

    const pageData = {
      id: pageId,
      pageId: pageId,
      pageName: pageName,
      title: pageName,
      parentId: parentId,  // Use the passed parentId instead of reading from XML
      order: order,
      createdAt: new Date().toISOString(),
      blocks: []
    };

    console.log(`[ElpxImporter] Building page data: "${pageName}" (${pageId}) parent: ${parentId}`);

    // Extract blocks (odePagStructures)
    const pagStructures = this.findPagStructures(navNode);

    // Sort blocks by order
    const sortedPagStructures = Array.from(pagStructures).sort((a, b) => {
      const orderA = this.getPagOrder(a);
      const orderB = this.getPagOrder(b);
      return orderA - orderB;
    });

    for (const pagNode of sortedPagStructures) {
      const blockData = this.buildBlockData(pagNode, zip);
      if (blockData) {
        pageData.blocks.push(blockData);
      }
    }

    return pageData;
  }

  /**
   * Build plain JavaScript data structure for a block
   * @param {Element} pagNode - The odePagStructure element
   * @param {JSZip} zip - The ZIP file
   * @returns {Object} Plain JS object with block data
   */
  buildBlockData(pagNode, zip) {
    const blockId = pagNode.getAttribute('odePagStructureId') ||
                    this.getTextContent(pagNode, 'odeBlockId') ||
                    this.generateId('block');
    const blockName = pagNode.getAttribute('blockName') ||
                      this.getTextContent(pagNode, 'blockName') ||
                      'Block';
    const order = this.getPagOrder(pagNode);

    const blockData = {
      id: blockId,
      blockId: blockId,
      blockName: blockName,
      order: order,
      createdAt: new Date().toISOString(),
      components: []
    };

    // Extract components (odeComponents)
    const odeComponents = this.findOdeComponents(pagNode);

    // Sort by order
    const sortedComponents = Array.from(odeComponents).sort((a, b) => {
      const orderA = this.getComponentOrder(a);
      const orderB = this.getComponentOrder(b);
      return orderA - orderB;
    });

    for (const compNode of sortedComponents) {
      const compData = this.buildComponentData(compNode, zip);
      if (compData) {
        blockData.components.push(compData);
      }
    }

    return blockData;
  }

  /**
   * Build plain JavaScript data structure for a component
   * @param {Element} compNode - The odeComponent element
   * @param {JSZip} zip - The ZIP file
   * @returns {Object} Plain JS object with component data
   */
  buildComponentData(compNode, zip) {
    const componentId = compNode.getAttribute('odeComponentId') ||
                        this.getTextContent(compNode, 'odeIdeviceId') ||
                        this.generateId('idevice');
    const ideviceType = compNode.getAttribute('odeIdeviceTypeDirName') ||
                        compNode.getAttribute('odeIdeviceTypeName') ||
                        this.getTextContent(compNode, 'odeIdeviceTypeName') ||
                        'FreeTextIdevice';
    const order = this.getComponentOrder(compNode);

    const compData = {
      id: componentId,
      ideviceId: componentId,
      ideviceType: ideviceType,
      type: ideviceType,
      order: order,
      createdAt: new Date().toISOString(),
      htmlView: '',
      properties: null,
      componentProps: {}
    };

    // Extract HTML view content
    const htmlViewNode = compNode.querySelector('htmlView');
    if (htmlViewNode) {
      let htmlContent = this.decodeHtmlContent(htmlViewNode.textContent || '') || '';

      // *** Convert {{context_path}} to asset:// URLs ***
      if (this.assetManager && this.assetMap.size > 0 && htmlContent) {
        try {
          const converted = this.assetManager.convertContextPathToAssetRefs(htmlContent, this.assetMap);
          htmlContent = (typeof converted === 'string') ? converted : htmlContent;
        } catch (convErr) {
          console.warn(`[ElpxImporter] Error converting asset paths for ${componentId}:`, convErr);
        }
      }

      compData.htmlView = (typeof htmlContent === 'string') ? htmlContent : '';
    }

    // Extract JSON properties
    const jsonPropsNode = compNode.querySelector('jsonProperties');
    if (jsonPropsNode) {
      try {
        let jsonStr = this.decodeHtmlContent(jsonPropsNode.textContent || '{}') || '{}';

        // Parse JSON first, then convert asset paths in the parsed object
        let props = {};
        try {
          props = JSON.parse(jsonStr);
        } catch (parseErr) {
          console.warn(`[ElpxImporter] Invalid JSON for ${componentId}, using empty object:`, parseErr.message);
          props = {};
        }

        // Convert {{context_path}} in parsed JSON values (not raw string)
        if (this.assetManager && this.assetMap.size > 0 && props && typeof props === 'object') {
          try {
            props = this.convertAssetPathsInObject(props);
          } catch (convErr) {
            console.warn(`[ElpxImporter] Error converting paths in JSON for ${componentId}:`, convErr);
          }
        }

        compData.properties = props;
      } catch (e) {
        console.warn(`[ElpxImporter] Failed to process JSON properties for ${componentId}:`, e);
      }
    }

    // Extract component properties (odeComponentProperty)
    const componentProps = compNode.querySelectorAll('odeComponentProperty');
    for (const propNode of componentProps) {
      const key = propNode.getAttribute('key') || this.getTextContent(propNode, 'key');
      const value = propNode.getAttribute('value') || this.getTextContent(propNode, 'value') || propNode.textContent;
      if (key && value) {
        compData.componentProps[key] = value;
      }
    }

    return compData;
  }

  /**
   * Create Y.Map from plain page data (called INSIDE transaction)
   * @param {Object} pageData - Plain JS object with page data
   * @param {Object} stats - Stats counter
   * @returns {Y.Map}
   */
  createPageYMap(pageData, stats) {
    console.log('[ElpxImporter] createPageYMap START:', pageData.pageName, pageData.id);

    // Helper to wrap Y operations with detailed error logging
    const safeYOp = (opName, fn) => {
      try {
        return fn();
      } catch (err) {
        console.error(`[ElpxImporter] Y operation failed: ${opName}`);
        console.error(`[ElpxImporter] Error:`, err);
        console.error(`[ElpxImporter] Stack:`, err.stack);
        console.error(`[ElpxImporter] Page context:`, pageData.pageName);
        throw err;
      }
    };

    try {
      const pageMap = safeYOp('new Y.Map()', () => new this.Y.Map());

      safeYOp('pageMap.set(id)', () => pageMap.set('id', pageData.id));
      safeYOp('pageMap.set(pageId)', () => pageMap.set('pageId', pageData.pageId));
      safeYOp('pageMap.set(pageName)', () => pageMap.set('pageName', pageData.pageName));
      safeYOp('pageMap.set(title)', () => pageMap.set('title', pageData.title));
      safeYOp('pageMap.set(parentId)', () => pageMap.set('parentId', pageData.parentId));
      safeYOp('pageMap.set(order)', () => pageMap.set('order', pageData.order));
      safeYOp('pageMap.set(createdAt)', () => pageMap.set('createdAt', pageData.createdAt));
      console.log('[ElpxImporter] Page basic props set');

      // Create blocks array
      const blocksArray = safeYOp('new Y.Array() for blocks', () => new this.Y.Array());
      console.log('[ElpxImporter] Creating blocks array, count:', pageData.blocks.length);
      for (let i = 0; i < pageData.blocks.length; i++) {
        const blockData = pageData.blocks[i];
        console.log(`[ElpxImporter] Creating block ${i + 1}/${pageData.blocks.length}:`, blockData.blockName);
        const blockMap = this.createBlockYMap(blockData, stats);
        if (blockMap) {
          console.log('[ElpxImporter] Pushing block to array...');
          safeYOp(`blocksArray.push(block ${i})`, () => blocksArray.push([blockMap]));
          console.log('[ElpxImporter] Block pushed successfully');
          stats.blocks++;
        }
      }
      console.log('[ElpxImporter] Setting blocks on pageMap...');
      safeYOp('pageMap.set(blocks)', () => pageMap.set('blocks', blocksArray));
      console.log('[ElpxImporter] Blocks set successfully');

      // NOTE: No children array - using flat structure with parentId references

      console.log('[ElpxImporter] createPageYMap END:', pageData.pageName);
      return pageMap;
    } catch (err) {
      console.error('[ElpxImporter] ERROR in createPageYMap:', pageData.pageName, err);
      throw err;
    }
  }

  /**
   * Create Y.Map from plain block data (called INSIDE transaction)
   * @param {Object} blockData - Plain JS object with block data
   * @param {Object} stats - Stats counter
   * @returns {Y.Map}
   */
  createBlockYMap(blockData, stats) {
    console.log('[ElpxImporter] createBlockYMap START:', blockData.blockName, blockData.id);

    // Helper to wrap Y operations with detailed error logging
    const safeYOp = (opName, fn) => {
      try {
        return fn();
      } catch (err) {
        console.error(`[ElpxImporter] Y operation failed: ${opName}`);
        console.error(`[ElpxImporter] Error:`, err);
        console.error(`[ElpxImporter] Stack:`, err.stack);
        console.error(`[ElpxImporter] Block context:`, blockData.blockName);
        throw err;
      }
    };

    try {
      const blockMap = safeYOp('new Y.Map() for block', () => new this.Y.Map());

      safeYOp('blockMap.set(id)', () => blockMap.set('id', blockData.id));
      safeYOp('blockMap.set(blockId)', () => blockMap.set('blockId', blockData.blockId));
      safeYOp('blockMap.set(blockName)', () => blockMap.set('blockName', blockData.blockName));
      safeYOp('blockMap.set(order)', () => blockMap.set('order', blockData.order));
      safeYOp('blockMap.set(createdAt)', () => blockMap.set('createdAt', blockData.createdAt));
      console.log('[ElpxImporter] Block basic props set');

      // Create components array
      const componentsArray = safeYOp('new Y.Array() for components', () => new this.Y.Array());
      console.log('[ElpxImporter] Creating components array, count:', blockData.components.length);
      for (let i = 0; i < blockData.components.length; i++) {
        const compData = blockData.components[i];
        console.log(`[ElpxImporter] Creating component ${i + 1}/${blockData.components.length}:`, compData.ideviceType);
        const compMap = this.createComponentYMap(compData);
        if (compMap) {
          console.log('[ElpxImporter] Pushing component to array...');
          safeYOp(`componentsArray.push(comp ${i})`, () => componentsArray.push([compMap]));
          console.log('[ElpxImporter] Component pushed successfully');
          stats.components++;
        }
      }
      console.log('[ElpxImporter] Setting components on blockMap...');
      safeYOp('blockMap.set(components)', () => blockMap.set('components', componentsArray));
      console.log('[ElpxImporter] Components set successfully');
      // NOTE: Removed 'idevices' alias because Yjs types can only have one parent

      console.log('[ElpxImporter] createBlockYMap END:', blockData.blockName);
      return blockMap;
    } catch (err) {
      console.error('[ElpxImporter] ERROR in createBlockYMap:', blockData.blockName, err);
      throw err;
    }
  }

  /**
   * Create Y.Map from plain component data (called INSIDE transaction)
   * @param {Object} compData - Plain JS object with component data
   * @returns {Y.Map}
   */
  createComponentYMap(compData) {
    console.log('[ElpxImporter] createComponentYMap START:', compData.id);

    let compMap;
    try {
      compMap = new this.Y.Map();
      console.log('[ElpxImporter] Y.Map created successfully');
    } catch (err) {
      console.error('[ElpxImporter] ERROR creating Y.Map:', err);
      throw err;
    }

    // Debug: Log each value being set with try-catch
    const safeSet = (map, key, value) => {
      const valueType = value === null ? 'null' : typeof value;
      const valuePreview = typeof value === 'string' ? value.substring(0, 50) : value;
      console.log(`[ElpxImporter] Setting ${key}: type=${valueType}, value=`, valuePreview);

      // Never set null or undefined - skip silently
      if (value === null || value === undefined) {
        console.warn(`[ElpxImporter] SKIPPING ${key} - value is ${value}`);
        return;
      }

      try {
        map.set(key, value);
        console.log(`[ElpxImporter] ${key} SET OK`);
      } catch (err) {
        console.error(`[ElpxImporter] ERROR setting ${key}:`, err);
        console.error(`[ElpxImporter] Value was:`, value);
        throw err;
      }
    };

    safeSet(compMap, 'id', compData.id);
    safeSet(compMap, 'ideviceId', compData.ideviceId);
    safeSet(compMap, 'ideviceType', compData.ideviceType);
    safeSet(compMap, 'type', compData.type);
    safeSet(compMap, 'order', compData.order);
    safeSet(compMap, 'createdAt', compData.createdAt);

    // Store htmlView as plain string - Y.Text will be created on-demand by TinyMCE binding
    if (compData.htmlView) {
      safeSet(compMap, 'htmlView', compData.htmlView);
    }

    // Store jsonProperties as plain string (skip nested Y.Map to avoid issues)
    if (compData.properties && typeof compData.properties === 'object') {
      console.log('[ElpxImporter] Converting properties to JSON string');
      try {
        const jsonStr = JSON.stringify(compData.properties);
        safeSet(compMap, 'jsonProperties', jsonStr);
      } catch (err) {
        console.error('[ElpxImporter] ERROR stringifying properties:', err);
      }
    }

    // Set component properties as flat values
    if (compData.componentProps) {
      console.log('[ElpxImporter] Setting component props:', Object.keys(compData.componentProps));
      Object.entries(compData.componentProps).forEach(([key, value]) => {
        if (value != null && typeof value !== 'object') {
          safeSet(compMap, `prop_${key}`, String(value));
        }
      });
    }

    console.log('[ElpxImporter] createComponentYMap END:', compData.id);
    return compMap;
  }

  /**
   * Find all odeNavStructure elements using multiple strategies
   * @param {Document} xmlDoc
   * @returns {Array}
   */
  findNavStructures(xmlDoc) {
    // Strategy 1: Direct query
    let structures = xmlDoc.querySelectorAll('odeNavStructure');
    if (structures.length > 0) return Array.from(structures);

    // Strategy 2: Inside odeNavStructures container
    const container = xmlDoc.querySelector('odeNavStructures');
    if (container) {
      structures = container.querySelectorAll('odeNavStructure');
      if (structures.length > 0) return Array.from(structures);

      // Try direct children
      const children = Array.from(container.children).filter(
        el => el.tagName === 'odeNavStructure'
      );
      if (children.length > 0) return children;
    }

    // Strategy 3: Namespace wildcard
    structures = xmlDoc.querySelectorAll('*|odeNavStructure');
    if (structures.length > 0) return Array.from(structures);

    console.warn('[ElpxImporter] No odeNavStructure elements found');
    return [];
  }

  /**
   * Get page ID from nav structure (handles both attribute and sub-element)
   * @param {Element} navNode
   * @returns {string|null}
   */
  getPageId(navNode) {
    // Try attribute first
    let id = navNode.getAttribute('odeNavStructureId');
    if (id) return id;

    // Try as sub-element
    const idEl = navNode.querySelector('odePageId');
    if (idEl) return idEl.textContent;

    return null;
  }

  /**
   * Get parent page ID from nav structure
   * @param {Element} navNode
   * @returns {string|null}
   */
  getParentPageId(navNode) {
    // Try attribute first
    let parentId = navNode.getAttribute('parentOdeNavStructureId');
    if (parentId) return parentId;

    // Try as sub-element
    const parentEl = navNode.querySelector('odeParentPageId');
    if (parentEl) return parentEl.textContent;

    return null;
  }

  /**
   * Get page name from nav structure (handles both attribute and sub-element)
   * @param {Element} navNode
   * @returns {string}
   */
  getPageName(navNode) {
    // Try attribute first (odePageName)
    let name = navNode.getAttribute('odePageName');
    if (name) return name;

    // Try pageName attribute
    name = navNode.getAttribute('pageName');
    if (name) return name;

    // Try as sub-element <pageName>
    const nameEl = navNode.querySelector('pageName');
    if (nameEl && nameEl.textContent) return nameEl.textContent;

    // Try as sub-element <odePageName>
    const odeNameEl = navNode.querySelector('odePageName');
    if (odeNameEl && odeNameEl.textContent) return odeNameEl.textContent;

    return 'Untitled Page';
  }

  /**
   * Get navigation order from nav structure
   * @param {Element} navNode
   * @returns {number}
   */
  getNavOrder(navNode) {
    // Try attribute
    let order = navNode.getAttribute('odeNavStructureOrder');
    if (order) return parseInt(order, 10) || 0;

    // Try sub-element
    const orderEl = navNode.querySelector('odeNavStructureOrder');
    if (orderEl) return parseInt(orderEl.textContent, 10) || 0;

    return 0;
  }

  /**
   * Find odePagStructure elements within a nav structure
   * @param {Element} navNode
   * @returns {NodeList|Array}
   */
  findPagStructures(navNode) {
    // Strategy 1: Direct children
    let structures = navNode.querySelectorAll(':scope > odePagStructure');
    if (structures.length > 0) return structures;

    // Strategy 2: Inside odePagStructures container
    const container = navNode.querySelector('odePagStructures');
    if (container) {
      structures = container.querySelectorAll(':scope > odePagStructure');
      if (structures.length > 0) return structures;

      structures = container.querySelectorAll('odePagStructure');
      if (structures.length > 0) return structures;
    }

    // Strategy 3: Any descendant
    structures = navNode.querySelectorAll('odePagStructure');
    return structures;
  }

  /**
   * Get block order from pag structure
   * @param {Element} pagNode
   * @returns {number}
   */
  getPagOrder(pagNode) {
    let order = pagNode.getAttribute('odePagStructureOrder');
    if (order) return parseInt(order, 10) || 0;

    const orderEl = pagNode.querySelector('odePagStructureOrder');
    if (orderEl) return parseInt(orderEl.textContent, 10) || 0;

    return 0;
  }

  /**
   * Find odeComponent elements within a pag structure
   * @param {Element} pagNode
   * @returns {NodeList|Array}
   */
  findOdeComponents(pagNode) {
    // Strategy 1: Direct children
    let components = pagNode.querySelectorAll(':scope > odeComponent');
    if (components.length > 0) return components;

    // Strategy 2: Inside odeComponents container
    const container = pagNode.querySelector('odeComponents');
    if (container) {
      components = container.querySelectorAll(':scope > odeComponent');
      if (components.length > 0) return components;

      components = container.querySelectorAll('odeComponent');
      if (components.length > 0) return components;
    }

    // Strategy 3: Any descendant
    components = pagNode.querySelectorAll('odeComponent');
    return components;
  }

  /**
   * Get component order
   * @param {Element} compNode
   * @returns {number}
   */
  getComponentOrder(compNode) {
    let order = compNode.getAttribute('odeComponentOrder');
    if (order) return parseInt(order, 10) || 0;

    order = compNode.getAttribute('odeComponentsOrder');
    if (order) return parseInt(order, 10) || 0;

    const orderEl = compNode.querySelector('odeComponentsOrder');
    if (orderEl) return parseInt(orderEl.textContent, 10) || 0;

    return 0;
  }

  /**
   * Import assets from ZIP file
   * Uses AssetManager if available, otherwise falls back to basic cache
   * @param {JSZip} zip - The ZIP file
   * @returns {Promise<number>} - Number of assets imported
   */
  async importAssets(zip) {
    if (!this.assetManager) {
      console.log('[ElpxImporter] No AssetManager, skipping asset import');
      return 0;
    }

    // Use AssetManager to extract assets
    this.assetMap = await this.assetManager.extractAssetsFromZip(zip);
    console.log(`[ElpxImporter] Imported ${this.assetMap.size} assets`);

    return this.assetMap.size;
  }

  /**
   * Get property value from odeProperties container
   * @param {Element} propsContainer
   * @param {string} key
   * @returns {string|null}
   */
  getPropertyValue(propsContainer, key) {
    // Try direct child element with the key name
    const directEl = propsContainer.querySelector(key);
    if (directEl) return directEl.textContent;

    // Try odeProperty elements
    const props = propsContainer.querySelectorAll('odeProperty');
    for (const prop of props) {
      const keyEl = prop.querySelector('key');
      const valueEl = prop.querySelector('value');
      if (keyEl && keyEl.textContent === key && valueEl) {
        return valueEl.textContent;
      }
    }

    return null;
  }

  /**
   * Decode HTML-encoded content
   * @param {string} text
   * @returns {string}
   */
  decodeHtmlContent(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  /**
   * Get text content from a child element
   * @param {Element} parent
   * @param {string} tagName
   * @returns {string|null}
   */
  getTextContent(parent, tagName) {
    const el = parent.querySelector(tagName);
    return el ? el.textContent : null;
  }

  /**
   * Generate a unique ID
   * @param {string} prefix
   * @returns {string}
   */
  generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Recursively convert {{context_path}} references to asset:// URLs in an object
   * This is used for JSON properties where we can't use regex on raw JSON strings
   * @param {any} obj - Object, array, or primitive to process
   * @returns {any} - Processed value with asset paths converted
   */
  convertAssetPathsInObject(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle strings - convert {{context_path}} references
    if (typeof obj === 'string') {
      if (obj.includes('{{context_path}}')) {
        // Use AssetManager's conversion method for strings
        return this.assetManager.convertContextPathToAssetRefs(obj, this.assetMap);
      }
      return obj;
    }

    // Handle arrays - process each element
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertAssetPathsInObject(item));
    }

    // Handle objects - process each value
    if (typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.convertAssetPathsInObject(value);
      }
      return result;
    }

    // Return primitives (numbers, booleans) unchanged
    return obj;
  }

  /**
   * Clear IndexedDB for this project (for debugging/testing)
   * @param {string} dbName - Database name to clear
   * @returns {Promise<void>}
   */
  async clearIndexedDB(dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
      request.onblocked = () => {
        console.warn('[ElpxImporter] IndexedDB delete blocked, waiting...');
        // Still resolve after a timeout
        setTimeout(resolve, 1000);
      };
    });
  }

  /**
   * Import a legacy .elp file (Python pickle format) using client-side parser
   * @param {File} file - The legacy .elp file
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import statistics
   */
  async importLegacyViaBackend(file, options = {}) {
    const { clearExisting = true, parentId = null, onProgress = null } = options;

    // Store progress callback if provided
    if (onProgress) {
      this.onProgress = onProgress;
    }

    console.log('[ElpxImporter] Parsing legacy file in client:', file.name);

    // Phase 1: Decompressing
    this._reportProgress('decompress', 0, typeof _ === 'function' ? _('Decompressing legacy file...') : 'Decompressing legacy file...');

    // 1. Load ZIP and extract contentv3.xml
    const JSZip = window.JSZip;
    const zip = await JSZip.loadAsync(file);

    let contentFile = zip.file('contentv3.xml') || zip.file('content.xml');
    if (!contentFile) {
      throw new Error('No content.xml or contentv3.xml found in legacy file');
    }

    const xmlContent = await contentFile.async('text');

    // 2. Parse using client-side LegacyXmlParser
    if (!window.LegacyXmlParser) {
      throw new Error('LegacyXmlParser not loaded. Include LegacyXmlParser.js first.');
    }

    const legacyParser = new window.LegacyXmlParser();
    const parsedData = legacyParser.parse(xmlContent);

    console.log('[ElpxImporter] Legacy parse complete:', {
      pages: parsedData.pages?.length || 0,
      title: parsedData.meta?.title,
    });

    // Decompression complete (10%)
    this._reportProgress('decompress', 10, typeof _ === 'function' ? _('File decompressed') : 'File decompressed');

    // Phase 2: Extracting assets (10-50%)
    this._reportProgress('assets', 10, typeof _ === 'function' ? _('Extracting assets...') : 'Extracting assets...');

    // 3. Import assets from ZIP (resources/ folder)
    const stats = { pages: 0, blocks: 0, components: 0, assets: 0 };

    if (this.assetManager) {
      this.assetMap = await this.assetManager.extractAssetsFromZip(zip);
      stats.assets = this.assetMap.size;
      console.log(`[ElpxImporter] Imported ${stats.assets} assets from legacy file`);
    }

    // Assets extracted (50%)
    this._reportProgress('assets', 50, typeof _ === 'function' ? _('Assets extracted') : 'Assets extracted');

    // Helper to replace asset paths in strings
    const replaceAssetPaths = (str) => {
      if (str == null || typeof str !== 'string') return '';
      if (!this.assetMap || this.assetMap.size === 0) return str;

      for (const [originalPath, assetId] of this.assetMap.entries()) {
        const fileName = originalPath.split('/').pop();
        // Replace various path formats
        str = str.split(`resources/${fileName}`).join(`asset://${assetId}`);
        str = str.split(`{{context_path}}/resources/${fileName}`).join(`asset://${assetId}`);
        str = str.split(originalPath).join(`asset://${assetId}`);
        if (fileName) {
          // Also replace bare filename references
          const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          str = str.replace(new RegExp(`src=["']${escapedFileName}["']`, 'g'), `src="asset://${assetId}"`);
        }
      }
      return str;
    };

    // 4. Import structure into Yjs
    const ydoc = this.manager.getDoc();
    const navigation = this.manager.getNavigation();
    const metadata = this.manager.getMetadata();
    const Y = this.Y;

    // Pages are already flat from LegacyXmlParser
    const flatPages = parsedData.pages || [];

    // Apply parentId if specified (for import into subtree)
    if (parentId) {
      flatPages.forEach(p => {
        if (!p.parent_id) {
          p.parent_id = parentId;
        }
      });
    }

    // Create page Y.Map
    const createPageYMap = (pageData) => {
      const pageMap = new Y.Map();
      const pageId = pageData.id || this.generateId('page');

      pageMap.set('id', pageId);
      pageMap.set('pageId', pageId);
      pageMap.set('pageName', pageData.title || 'Untitled');
      pageMap.set('title', pageData.title || 'Untitled');
      pageMap.set('parentId', pageData.parent_id || null);
      pageMap.set('order', pageData.position || 0);
      pageMap.set('createdAt', new Date().toISOString());

      const blocksArray = new Y.Array();
      if (pageData.blocks && Array.isArray(pageData.blocks)) {
        for (const blockData of pageData.blocks) {
          const blockMap = new Y.Map();
          const blockId = blockData.id || this.generateId('block');

          blockMap.set('id', blockId);
          blockMap.set('blockId', blockId);
          blockMap.set('blockName', blockData.name || 'Block');
          blockMap.set('order', blockData.position || 0);

          const componentsArray = new Y.Array();
          if (blockData.idevices && Array.isArray(blockData.idevices)) {
            for (const ideviceData of blockData.idevices) {
              const compMap = new Y.Map();
              const compId = ideviceData.id || this.generateId('idevice');
              const ideviceType = ideviceData.type || 'FreeTextIdevice';

              compMap.set('id', compId);
              compMap.set('ideviceId', compId);
              compMap.set('ideviceType', ideviceType);
              compMap.set('type', ideviceType);
              compMap.set('order', ideviceData.position || 0);

              let transformedHtml = '';
              if (ideviceData.htmlView) {
                transformedHtml = replaceAssetPaths(ideviceData.htmlView);
                compMap.set('htmlView', transformedHtml || '');
              }

              // Convert htmlView to jsonProperties for JSON-type iDevices (FreeTextIdevice/TextIdevice)
              // These iDevices expect content in jsonProperties.textTextarea format
              if (ideviceType === 'FreeTextIdevice' || ideviceType.toLowerCase().includes('text')) {
                const jsonProps = {
                  textTextarea: transformedHtml || ''
                };
                compMap.set('jsonProperties', JSON.stringify(jsonProps));
              } else {
                // For other iDevices, set empty jsonProperties
                compMap.set('jsonProperties', '{}');
              }

              componentsArray.push([compMap]);
              stats.components++;
            }
          }

          blockMap.set('components', componentsArray);
          blocksArray.push([blockMap]);
          stats.blocks++;
        }
      }
      pageMap.set('blocks', blocksArray);

      return pageMap;
    };

    // Phase 3: Importing structure (50-80%)
    this._reportProgress('structure', 50, typeof _ === 'function' ? _('Importing structure...') : 'Importing structure...');

    // Import all pages in a transaction
    ydoc.transact(() => {
      if (clearExisting) {
        while (navigation.length > 0) {
          navigation.delete(0);
        }

        // Set metadata
        if (parsedData.meta) {
          metadata.set('title', parsedData.meta.title || 'Legacy Project');
          metadata.set('author', parsedData.meta.author || '');
          metadata.set('description', parsedData.meta.description || '');
        }
      }

      for (const pageData of flatPages) {
        const pageMap = createPageYMap(pageData);
        navigation.push([pageMap]);
        stats.pages++;
      }
    });

    // Structure imported (80%)
    this._reportProgress('structure', 80, typeof _ === 'function' ? _('Structure imported') : 'Structure imported');

    // Phase 4: Precaching assets (80-100%)
    this._reportProgress('precache', 80, typeof _ === 'function' ? _('Precaching assets...') : 'Precaching assets...');

    // Preload assets
    if (this.assetManager && this.assetManager.preloadAllAssets) {
      await this.assetManager.preloadAllAssets();
    }

    // Import complete (100%)
    this._reportProgress('precache', 100, typeof _ === 'function' ? _('Import complete') : 'Import complete');

    console.log('[ElpxImporter] Legacy import complete:', stats);
    return stats;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElpxImporter;
} else {
  window.ElpxImporter = ElpxImporter;
}
