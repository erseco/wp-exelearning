/**
 * AssetManager
 *
 * Offline-first asset management for eXeLearning.
 *
 * Key features:
 * - Assets referenced with asset:// URLs in HTML (not base64 or http://)
 * - Stored in IndexedDB for offline use
 * - Deduplication by SHA-256 hash
 * - Uploaded to server only on explicit save
 *
 * Usage:
 *   const manager = new AssetManager(projectId);
 *   await manager.init();
 *   const assetUrl = await manager.insertImage(file);  // Returns "asset://uuid"
 *   const blobUrl = await manager.resolveAssetURL(assetUrl);  // Returns "blob://..."
 */
class AssetManager {
  static DB_NAME = 'exelearning-assets-v2';
  static DB_VERSION = 2; // Incremented to add projectId_uploaded index
  static STORE_NAME = 'assets';

  /**
   * @param {string} projectId - Project UUID
   */
  constructor(projectId) {
    this.projectId = projectId;
    this.db = null;

    // Cache of blob URLs: assetId -> blob:// URL
    this.blobURLCache = new Map();

    // Reverse cache: blob:// URL -> assetId
    this.reverseBlobCache = new Map();
  }

  /**
   * Initialize database connection
   * Must be called before any other operations.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(AssetManager.DB_NAME, AssetManager.DB_VERSION);

      request.onerror = () => {
        console.error('[AssetManager] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log(`[AssetManager] Initialized for project ${this.projectId}`);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        if (!db.objectStoreNames.contains(AssetManager.STORE_NAME)) {
          // Fresh install - create store with all indexes
          const store = db.createObjectStore(AssetManager.STORE_NAME, {
            keyPath: 'id'
          });

          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('hash', 'hash', { unique: false });
          store.createIndex('uploaded', 'uploaded', { unique: false });
          store.createIndex('projectId_uploaded', ['projectId', 'uploaded'], { unique: false });

          console.log('[AssetManager] Created assets object store with all indexes');
        } else if (oldVersion < 2) {
          // Migration from v1 to v2: add projectId_uploaded index
          const transaction = event.target.transaction;
          const store = transaction.objectStore(AssetManager.STORE_NAME);

          if (!store.indexNames.contains('projectId_uploaded')) {
            store.createIndex('projectId_uploaded', ['projectId', 'uploaded'], { unique: false });
            console.log('[AssetManager] Added projectId_uploaded index (migration v1->v2)');
          }
        }
      };
    });
  }

  /**
   * Generate UUID v4
   * @returns {string}
   */
  generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Calculate SHA-256 hash of blob
   * @param {Blob} blob
   * @returns {Promise<string>} Hex string hash
   */
  async calculateHash(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Convert SHA-256 hash to UUID format
   * Takes first 32 hex chars and formats as UUID
   * @param {string} hash - SHA-256 hex string (64 chars)
   * @returns {string} UUID format (8-4-4-4-12)
   */
  hashToUUID(hash) {
    // Use first 32 hex characters of the hash
    const h = hash.substring(0, 32);
    return `${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20, 32)}`;
  }

  /**
   * Store asset in IndexedDB
   * @param {Object} asset
   * @returns {Promise<void>}
   */
  async putAsset(asset) {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([AssetManager.STORE_NAME], 'readwrite');
      const store = tx.objectStore(AssetManager.STORE_NAME);
      store.put(asset);

      // Wait for transaction to fully commit, not just put success
      // This ensures data is available for subsequent reads
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get asset by ID
   * @param {string} id - Asset UUID
   * @returns {Promise<Object|null>}
   */
  async getAsset(id) {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([AssetManager.STORE_NAME], 'readonly');
      const store = tx.objectStore(AssetManager.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all assets for the project
   * @returns {Promise<Array>}
   */
  async getProjectAssets() {
    if (!this.db) throw new Error('Database not initialized');

    // Validate projectId is a valid IndexedDB key (string)
    if (!this.projectId || typeof this.projectId !== 'string') {
      console.warn('[AssetManager] getProjectAssets: Invalid projectId, returning empty array');
      return [];
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([AssetManager.STORE_NAME], 'readonly');
      const store = tx.objectStore(AssetManager.STORE_NAME);
      const index = store.index('projectId');
      const request = index.getAll(this.projectId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Find asset by hash (for deduplication)
   * @param {string} hash - SHA-256 hash
   * @returns {Promise<Object|null>}
   */
  async findByHash(hash) {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([AssetManager.STORE_NAME], 'readonly');
      const store = tx.objectStore(AssetManager.STORE_NAME);
      const index = store.index('hash');
      const request = index.getAll(hash);

      request.onsuccess = () => {
        const assets = request.result;
        // Find one in the same project
        const match = assets.find(a => a.projectId === this.projectId);
        resolve(match || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get assets pending upload
   * @returns {Promise<Array>}
   */
  async getPendingAssets() {
    if (!this.db) throw new Error('Database not initialized');

    // Validate projectId is a valid IndexedDB key (string)
    if (!this.projectId || typeof this.projectId !== 'string') {
      console.warn('[AssetManager] getPendingAssets: Invalid projectId:', this.projectId, 'type:', typeof this.projectId);
      return [];
    }

    // Note: We use manual filtering because IndexedDB compound index with boolean
    // doesn't work reliably (boolean is not a valid key type in IndexedDB spec)
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([AssetManager.STORE_NAME], 'readonly');
      const store = tx.objectStore(AssetManager.STORE_NAME);
      const index = store.index('projectId');
      const request = index.getAll(this.projectId);

      request.onsuccess = () => {
        const assets = request.result || [];
        const pending = assets.filter(a => a.uploaded === false);
        resolve(pending);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark asset as uploaded
   * @param {string} id - Asset UUID
   * @returns {Promise<void>}
   */
  async markAssetUploaded(id) {
    const asset = await this.getAsset(id);
    if (!asset) {
      console.warn(`[AssetManager] Cannot mark asset ${id} as uploaded: not found`);
      return;
    }
    asset.uploaded = true;
    await this.putAsset(asset);
  }

  /**
   * Insert image file
   *
   * Flow:
   * 1. Read file as blob
   * 2. Calculate SHA-256 hash
   * 3. Generate deterministic ID from hash (content-addressable)
   * 4. Check if already exists (same content = same ID)
   * 5. Store in IndexedDB with uploaded=false
   * 6. Return asset:// URL
   *
   * @param {File} file - Image file
   * @returns {Promise<string>} asset:// URL
   */
  async insertImage(file) {
    console.log(`[AssetManager] Inserting image: ${file.name} (${file.size} bytes, ${file.type})`);

    // 1. Create blob
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });

    // 2. Calculate hash
    const hash = await this.calculateHash(blob);
    console.log(`[AssetManager] Hash: ${hash.substring(0, 16)}...`);

    // 3. Generate deterministic ID from hash (content-addressable)
    const assetId = this.hashToUUID(hash);
    console.log(`[AssetManager] Content-addressable ID: ${assetId}`);

    // 4. Check if already exists (same content = same ID)
    const existing = await this.getAsset(assetId);
    if (existing) {
      console.log(`[AssetManager] Asset already exists: ${assetId}`);
      // Return full URL with filename for proper export paths
      const existingFilename = existing.filename || file.name;
      return `asset://${assetId}/${existingFilename}`;
    }

    // 5. Create new asset
    const asset = {
      id: assetId,
      projectId: this.projectId,
      blob: blob,
      mime: file.type || this.getMimeType(file.name),
      hash: hash,
      size: blob.size,
      uploaded: false,
      createdAt: new Date().toISOString(),
      filename: file.name
    };

    await this.putAsset(asset);
    console.log(`[AssetManager] Stored new asset ${assetId}`);

    // 6. Return asset:// URL with filename (e.g., asset://uuid/image.jpg)
    return `asset://${assetId}/${file.name}`;
  }

  /**
   * Extract asset ID from asset:// URL
   * Handles both old format (asset://uuid) and new format (asset://uuid/filename)
   * @param {string} assetUrl
   * @returns {string} Asset UUID
   */
  extractAssetId(assetUrl) {
    const path = assetUrl.replace('asset://', '');
    // If path contains /, take only the first part (UUID)
    const slashIndex = path.indexOf('/');
    return slashIndex > 0 ? path.substring(0, slashIndex) : path;
  }

  /**
   * Resolve asset:// URL to blob:// URL for display
   * @param {string} assetUrl - asset://uuid or asset://uuid/filename
   * @returns {Promise<string|null>} blob:// URL or null
   */
  async resolveAssetURL(assetUrl) {
    // Extract ID from asset://uuid or asset://uuid/filename
    const assetId = this.extractAssetId(assetUrl);

    // Check cache first
    if (this.blobURLCache.has(assetId)) {
      return this.blobURLCache.get(assetId);
    }

    // Load from IndexedDB
    const asset = await this.getAsset(assetId);
    if (!asset) {
      console.warn(`[AssetManager] Asset not found: ${assetId}`);
      return null;
    }

    // Create blob URL
    const blobURL = URL.createObjectURL(asset.blob);

    // Cache both directions
    this.blobURLCache.set(assetId, blobURL);
    this.reverseBlobCache.set(blobURL, assetId);

    console.log(`[AssetManager] Resolved ${assetId.substring(0, 8)}... → blob URL`);
    return blobURL;
  }

  /**
   * Resolve asset:// URL synchronously (from cache only)
   * @param {string} assetUrl - asset://uuid or asset://uuid/filename
   * @returns {string|null} blob:// URL or null
   */
  resolveAssetURLSync(assetUrl) {
    const assetId = this.extractAssetId(assetUrl);
    return this.blobURLCache.get(assetId) || null;
  }

  /**
   * Resolve all asset:// URLs in HTML string
   * @param {string} html - HTML with asset:// references
   * @param {Object} options - Options
   * @param {AssetWebSocketHandler} options.wsHandler - WebSocket handler for fetching missing assets
   * @param {boolean} options.addTrackingAttrs - Add data-asset-id attributes for DOM updates
   * @returns {Promise<string>} HTML with blob:// URLs
   */
  async resolveHTMLAssets(html, options = {}) {
    if (!html) return html;

    const { wsHandler = null, addTrackingAttrs = false } = options;

    // Find all asset:// references (supports both asset://uuid and asset://uuid/filename)
    const assetRegex = /asset:\/\/([a-f0-9-]+)(\/[^"'\s)]+)?/gi;
    const matches = [...html.matchAll(assetRegex)];

    if (matches.length === 0) return html;

    console.log(`[AssetManager] Resolving ${matches.length} asset references`);

    let resolvedHTML = html;

    for (const match of matches) {
      const assetUrl = match[0]; // Full URL: asset://uuid or asset://uuid/filename
      const assetId = match[1];  // Just the UUID
      const blobURL = await this.resolveAssetURL(assetUrl);

      if (blobURL) {
        resolvedHTML = resolvedHTML.split(assetUrl).join(blobURL);
      } else {
        // Asset not found - use loading placeholder and trigger fetch
        const placeholder = this.generatePlaceholder('Loading...', 'loading');
        resolvedHTML = resolvedHTML.split(assetUrl).join(placeholder);

        // Trigger background fetch if handler available
        if (wsHandler && !this.pendingFetches.has(assetId)) {
          this.pendingFetches.add(assetId);
          wsHandler.requestAsset(assetId).finally(() => {
            this.pendingFetches.delete(assetId);
          });
        }
      }

      // Add tracking attribute for later DOM updates (for img tags)
      if (addTrackingAttrs) {
        // Find img tags with this asset and add data-asset-id
        const imgRegex = new RegExp(`<img([^>]*)(src=["'][^"']*${assetId}[^"']*["'])`, 'gi');
        resolvedHTML = resolvedHTML.replace(imgRegex, (fullMatch, before, srcAttr) => {
          // Check if already has data-asset-id
          if (before.includes('data-asset-id')) {
            return fullMatch;
          }
          return `<img${before}data-asset-id="${assetId}" ${srcAttr}`;
        });
      }
    }

    return resolvedHTML;
  }

  /**
   * Track assets that need to be fetched from server
   * @type {Set<string>}
   */
  missingAssets = new Set();

  /**
   * Resolve all asset:// URLs synchronously (from cache only)
   * If asset is missing, uses a placeholder and marks it for download
   * @param {string} html
   * @param {Object} options
   * @param {boolean} options.usePlaceholder - Use placeholder for missing (default true)
   * @param {boolean} options.addTracking - Add data-asset-id for DOM updates (default true)
   * @returns {string}
   */
  resolveHTMLAssetsSync(html, options = {}) {
    if (!html) return html;

    const { usePlaceholder = true, addTracking = true } = options;

    // Supports both asset://uuid and asset://uuid/filename formats
    const assetRegex = /asset:\/\/([a-f0-9-]+)(\/[^"'\s)]+)?/gi;
    let resolvedHTML = html;

    // First pass: find all missing assets
    const matches = [...html.matchAll(assetRegex)];
    for (const match of matches) {
      const assetId = match[1]; // Just the UUID
      if (!this.blobURLCache.has(assetId)) {
        this.missingAssets.add(assetId);
      }
    }

    // Second pass: replace URLs (full URL including filename if present)
    resolvedHTML = resolvedHTML.replace(assetRegex, (fullMatch, assetId) => {
      const blobURL = this.blobURLCache.get(assetId);
      if (blobURL) {
        return blobURL;
      }

      // Asset not in cache
      if (usePlaceholder) {
        return this.generatePlaceholder('Loading...', 'loading');
      }
      return fullMatch;
    });

    // Add tracking attributes for images with placeholders
    if (addTracking && this.missingAssets.size > 0) {
      // Add data-asset-id to img tags that have placeholder or asset:// src
      for (const assetId of this.missingAssets) {
        // Match img tags with loading placeholder or original asset:// URL
        const imgPatterns = [
          // Placeholder (data:image/svg+xml...)
          new RegExp(`<img([^>]*src=["']data:image/svg\\+xml[^"']*Loading[^"']*["'])`, 'gi'),
          // Original asset:// URL (if not using placeholders)
          new RegExp(`<img([^>]*src=["']asset://${assetId}["'])`, 'gi'),
        ];

        for (const pattern of imgPatterns) {
          resolvedHTML = resolvedHTML.replace(pattern, (match, before) => {
            if (match.includes('data-asset-id')) return match;
            return `<img data-asset-id="${assetId}" data-asset-loading="true"${before}`;
          });
        }
      }
    }

    return resolvedHTML;
  }

  /**
   * Convert blob:// URLs back to asset:// references
   * Called before saving to Y.Doc
   * @param {string} html
   * @returns {string}
   */
  convertBlobURLsToAssetRefs(html) {
    if (!html) return html;

    let convertedHTML = html;

    for (const [blobURL, assetId] of this.reverseBlobCache.entries()) {
      // Escape special regex characters in blob URL
      const escapedBlobURL = blobURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      convertedHTML = convertedHTML.replace(new RegExp(escapedBlobURL, 'g'), `asset://${assetId}`);
    }

    return convertedHTML;
  }

  /**
   * Extract assets from ZIP file (for .elpx import)
   *
   * Finds all images, stores in IndexedDB, returns mapping.
   * Also handles {{context_path}} replacement.
   *
   * @param {JSZip} zip - JSZip instance
   * @returns {Promise<Map<string, string>>} Map of originalPath -> assetId
   */
  async extractAssetsFromZip(zip) {
    const assetMap = new Map();
    const assetFiles = [];

    // Find all image/media files
    zip.forEach((relativePath, file) => {
      if (file.dir) return;
      if (relativePath.startsWith('__MACOSX')) return;
      if (relativePath.endsWith('.xml')) return;

      // Include images and common media
      if (/\.(png|jpg|jpeg|gif|svg|webp|mp4|webm|mp3|ogg|wav|pdf)$/i.test(relativePath)) {
        assetFiles.push({ path: relativePath, file });
      }
    });

    console.log(`[AssetManager] Found ${assetFiles.length} assets in ZIP`);

    for (const { path, file } of assetFiles) {
      try {
        const arrayBuffer = await file.async('arraybuffer');
        const mime = this.getMimeType(path);
        const blob = new Blob([arrayBuffer], { type: mime });

        // Calculate hash
        const hash = await this.calculateHash(blob);

        // Generate deterministic ID from hash (content-addressable)
        const assetId = this.hashToUUID(hash);

        // Check if already exists (same content = same ID)
        const existing = await this.getAsset(assetId);
        if (existing) {
          // Check if asset belongs to current project
          if (existing.projectId === this.projectId) {
            assetMap.set(path, assetId);
            console.log(`[AssetManager] Asset already exists for this project ${path} → ${assetId.substring(0, 8)}...`);
            continue;
          }
          // Asset exists but for different project - reuse blob, create entry for this project
          console.log(`[AssetManager] Asset exists in other project, creating for ${this.projectId.substring(0, 8)}...`);
          const reusedAsset = {
            id: assetId,
            projectId: this.projectId,
            blob: existing.blob,
            mime: existing.mime,
            hash: existing.hash,
            size: existing.size,
            uploaded: false,
            createdAt: new Date().toISOString(),
            filename: path.split('/').pop(),
            originalPath: path
          };
          await this.putAsset(reusedAsset);
          assetMap.set(path, assetId);
          continue;
        }

        // Create new asset
        const asset = {
          id: assetId,
          projectId: this.projectId,
          blob: blob,
          mime: mime,
          hash: hash,
          size: blob.size,
          uploaded: false,
          createdAt: new Date().toISOString(),
          filename: path.split('/').pop(),
          originalPath: path  // Store original path for {{context_path}} mapping
        };

        await this.putAsset(asset);
        assetMap.set(path, assetId);

        console.log(`[AssetManager] Extracted ${path} → ${assetId.substring(0, 8)}...`);
      } catch (e) {
        console.error(`[AssetManager] Failed to extract ${path}:`, e);
      }
    }

    return assetMap;
  }

  /**
   * Convert {{context_path}} references in HTML to asset:// URLs
   * @param {string} html
   * @param {Map<string, string>} assetMap - Map of originalPath -> assetId
   * @returns {string}
   */
  convertContextPathToAssetRefs(html, assetMap) {
    if (!html) return html;

    let convertedHTML = html;

    // Pattern: {{context_path}}/path/to/file.jpg
    const contextPathRegex = /\{\{context_path\}\}\/([^"'\s<>]+)/g;

    convertedHTML = convertedHTML.replace(contextPathRegex, (fullMatch, assetPath) => {
      // Clean up path - remove trailing backslash/special chars and normalize
      let cleanPath = assetPath.replace(/[\\\s]+$/, '').trim();

      // Try to find asset by exact path
      if (assetMap.has(cleanPath)) {
        const assetId = assetMap.get(cleanPath);
        return `asset://${assetId}`;
      }

      // Try with common prefixes (ZIP structure varies)
      const prefixes = ['', 'content/', 'content/resources/', 'resources/'];
      for (const prefix of prefixes) {
        const fullPath = prefix + cleanPath;
        if (assetMap.has(fullPath)) {
          return `asset://${assetMap.get(fullPath)}`;
        }
      }

      // Try without leading directory (iDevices sometimes use just filename)
      const filename = cleanPath.split('/').pop();
      for (const [path, assetId] of assetMap.entries()) {
        if (path.endsWith('/' + filename) || path === filename) {
          return `asset://${assetId}`;
        }
      }

      // Try matching just the last part of the path (e.g., UUID/file.ext)
      const pathParts = cleanPath.split('/');
      if (pathParts.length >= 2) {
        const shortPath = pathParts.slice(-2).join('/');
        for (const [path, assetId] of assetMap.entries()) {
          if (path.endsWith(shortPath)) {
            return `asset://${assetId}`;
          }
        }
      }

      console.warn(`[AssetManager] Asset not found for path: ${cleanPath}`);
      return fullMatch;
    });

    return convertedHTML;
  }

  /**
   * Preload all project assets into memory (create blob URLs)
   * Call after import to have all URLs ready for sync resolution
   * @returns {Promise<number>} Number of assets preloaded
   */
  async preloadAllAssets() {
    const assets = await this.getProjectAssets();
    let count = 0;

    for (const asset of assets) {
      if (!this.blobURLCache.has(asset.id)) {
        const blobURL = URL.createObjectURL(asset.blob);
        this.blobURLCache.set(asset.id, blobURL);
        this.reverseBlobCache.set(blobURL, asset.id);
        count++;
      }
    }

    console.log(`[AssetManager] Preloaded ${count} assets`);
    return count;
  }

  /**
   * Upload pending assets to server
   * @param {string} apiBaseUrl
   * @param {string} token
   * @returns {Promise<{uploaded: number, failed: number, bytes: number}>}
   */
  async uploadPendingAssets(apiBaseUrl, token) {
    const pending = await this.getPendingAssets();

    if (pending.length === 0) {
      console.log('[AssetManager] No pending assets to upload');
      return { uploaded: 0, failed: 0, bytes: 0 };
    }

    console.log(`[AssetManager] Uploading ${pending.length} pending assets...`);

    const formData = new FormData();
    let totalBytes = 0;

    for (const asset of pending) {
      formData.append('assets', asset.blob, asset.id);
      formData.append(`${asset.id}_mime`, asset.mime);
      formData.append(`${asset.id}_hash`, asset.hash);
      formData.append(`${asset.id}_size`, asset.size.toString());
      if (asset.filename) {
        formData.append(`${asset.id}_filename`, asset.filename);
      }
      totalBytes += asset.size;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/projects/${this.projectId}/assets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Mark as uploaded
      for (const asset of pending) {
        await this.markAssetUploaded(asset.id);
      }

      console.log(`[AssetManager] Uploaded ${result.uploaded} assets`);
      return { uploaded: result.uploaded, failed: 0, bytes: totalBytes };
    } catch (error) {
      console.error('[AssetManager] Upload failed:', error);
      return { uploaded: 0, failed: pending.length, bytes: 0 };
    }
  }

  /**
   * Download missing assets from server
   * @param {string} apiBaseUrl
   * @param {string} token
   * @returns {Promise<number>} Number of assets downloaded
   */
  async downloadMissingAssets(apiBaseUrl, token) {
    console.log('[AssetManager] Checking for missing assets...');

    try {
      // Get list from server
      const response = await fetch(`${apiBaseUrl}/api/projects/${this.projectId}/assets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.warn('[AssetManager] Failed to fetch asset list from server');
        return 0;
      }

      const serverAssets = await response.json();
      console.log(`[AssetManager] Server has ${serverAssets.length} assets`);

      // Find missing locally
      const missing = [];
      for (const serverAsset of serverAssets) {
        const local = await this.getAsset(serverAsset.id);
        if (!local) {
          missing.push(serverAsset.id);
        }
      }

      if (missing.length === 0) {
        console.log('[AssetManager] All assets cached locally');
        return 0;
      }

      console.log(`[AssetManager] Downloading ${missing.length} missing assets...`);

      let downloaded = 0;
      for (const assetId of missing) {
        try {
          const assetResponse = await fetch(
            `${apiBaseUrl}/api/projects/${this.projectId}/assets/${assetId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );

          if (!assetResponse.ok) continue;

          const blob = await assetResponse.blob();
          const mime = assetResponse.headers.get('X-Original-Mime') || 'application/octet-stream';
          const hash = assetResponse.headers.get('X-Asset-Hash') || '';
          const size = parseInt(assetResponse.headers.get('X-Original-Size') || '0');
          const filename = assetResponse.headers.get('X-Filename') || undefined;

          const asset = {
            id: assetId,
            projectId: this.projectId,
            blob: blob,
            mime: mime,
            hash: hash,
            size: size,
            uploaded: true,
            createdAt: new Date().toISOString(),
            filename: filename
          };

          await this.putAsset(asset);
          downloaded++;
        } catch (e) {
          console.error(`[AssetManager] Failed to download ${assetId}:`, e);
        }
      }

      console.log(`[AssetManager] Downloaded ${downloaded}/${missing.length} assets`);
      return downloaded;
    } catch (error) {
      console.error('[AssetManager] Download check failed:', error);
      return 0;
    }
  }

  /**
   * Get MIME type from filename
   * @param {string} filename
   * @returns {string}
   */
  getMimeType(filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogg: 'video/ogg',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      pdf: 'application/pdf',
      css: 'text/css',
      js: 'application/javascript'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Generate placeholder SVG data URL
   * @param {string} text
   * @param {string} type - 'loading' | 'error' | 'notfound'
   * @returns {string}
   */
  generatePlaceholder(text, type = 'notfound') {
    const colors = {
      loading: { bg: '#e3f2fd', text: '#1976d2', icon: '&#8987;' }, // Blue, hourglass
      error: { bg: '#ffebee', text: '#c62828', icon: '&#9888;' },   // Red, warning
      notfound: { bg: '#f0f0f0', text: '#999', icon: '&#128247;' }, // Gray, camera
    };

    const style = colors[type] || colors.notfound;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <rect width="300" height="200" fill="${style.bg}"/>
      <text x="150" y="85" text-anchor="middle" fill="${style.text}" font-size="32">${style.icon}</text>
      <text x="150" y="120" text-anchor="middle" fill="${style.text}" font-size="14">${text}</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Generate a loading placeholder for an asset being fetched
   * @param {string} assetId - Asset UUID
   * @returns {string} Data URL for loading placeholder
   */
  generateLoadingPlaceholder(assetId) {
    return this.generatePlaceholder('Loading...', 'loading');
  }

  /**
   * Track assets that are currently being fetched
   * @type {Set<string>}
   */
  pendingFetches = new Set();

  /**
   * Update all images in the DOM that reference a specific asset
   * Called when an asset becomes available (after peer fetch)
   * @param {string} assetId - Asset UUID
   * @returns {Promise<number>} Number of images updated
   */
  async updateDomImagesForAsset(assetId) {
    const assetUrl = `asset://${assetId}`;

    // Get the actual blob URL
    const blobUrl = await this.resolveAssetURL(assetUrl);
    if (!blobUrl) {
      console.warn(`[AssetManager] Cannot update DOM: asset ${assetId.substring(0, 8)}... not found`);
      return 0;
    }

    let count = 0;

    // Find all images with data-asset-id attribute matching this asset
    const images = document.querySelectorAll(`img[data-asset-id="${assetId}"]`);
    for (const img of images) {
      img.src = blobUrl;
      img.removeAttribute('data-asset-loading');
      count++;
    }

    // Also check for background images in style attributes
    const elements = document.querySelectorAll(`[data-asset-id="${assetId}"]`);
    for (const el of elements) {
      if (el.style.backgroundImage && el.style.backgroundImage.includes('data:image')) {
        el.style.backgroundImage = `url(${blobUrl})`;
        el.removeAttribute('data-asset-loading');
        count++;
      }
    }

    console.log(`[AssetManager] Updated ${count} DOM elements for asset ${assetId.substring(0, 8)}...`);
    return count;
  }

  /**
   * Resolve asset:// URL with loading placeholder support
   * If asset is missing but a WebSocket handler is available, returns a loading placeholder
   * and triggers background fetch
   * @param {string} assetUrl - asset://uuid
   * @param {Object} options - Options
   * @param {AssetWebSocketHandler} options.wsHandler - WebSocket handler for fetching
   * @param {boolean} options.returnPlaceholder - Return loading placeholder if missing
   * @returns {Promise<{url: string, isPlaceholder: boolean, assetId: string}>}
   */
  async resolveAssetURLWithPlaceholder(assetUrl, options = {}) {
    const assetId = assetUrl.replace('asset://', '');
    const { wsHandler = null, returnPlaceholder = true } = options;

    // Check cache first
    if (this.blobURLCache.has(assetId)) {
      return {
        url: this.blobURLCache.get(assetId),
        isPlaceholder: false,
        assetId,
      };
    }

    // Try to load from IndexedDB
    const asset = await this.getAsset(assetId);
    if (asset) {
      const blobURL = URL.createObjectURL(asset.blob);
      this.blobURLCache.set(assetId, blobURL);
      this.reverseBlobCache.set(blobURL, assetId);
      return {
        url: blobURL,
        isPlaceholder: false,
        assetId,
      };
    }

    // Asset not found locally
    if (returnPlaceholder) {
      // Trigger background fetch if handler available and not already fetching
      if (wsHandler && !this.pendingFetches.has(assetId)) {
        this.pendingFetches.add(assetId);
        wsHandler.requestAsset(assetId).finally(() => {
          this.pendingFetches.delete(assetId);
        });
      }

      return {
        url: this.generateLoadingPlaceholder(assetId),
        isPlaceholder: true,
        assetId,
      };
    }

    return {
      url: this.generatePlaceholder('Image not found', 'notfound'),
      isPlaceholder: true,
      assetId,
    };
  }

  /**
   * Get statistics
   * @returns {Promise<{total: number, pending: number, uploaded: number, totalSize: number}>}
   */
  async getStats() {
    const all = await this.getProjectAssets();
    const pending = all.filter(a => !a.uploaded);
    const uploaded = all.filter(a => a.uploaded);
    const totalSize = all.reduce((sum, a) => sum + a.size, 0);

    return {
      total: all.length,
      pending: pending.length,
      uploaded: uploaded.length,
      totalSize
    };
  }

  /**
   * Update asset filename
   * @param {string} id - Asset UUID
   * @param {string} newFilename - New filename
   * @returns {Promise<void>}
   */
  async updateAssetFilename(id, newFilename) {
    const asset = await this.getAsset(id);
    if (!asset) {
      console.warn(`[AssetManager] Cannot update filename for ${id}: not found`);
      return;
    }
    asset.filename = newFilename;
    await this.putAsset(asset);
    console.log(`[AssetManager] Updated filename for ${id} to ${newFilename}`);
  }

  /**
   * Get image dimensions (width, height)
   * @param {string} id - Asset UUID
   * @returns {Promise<{width: number, height: number}|null>}
   */
  async getImageDimensions(id) {
    const asset = await this.getAsset(id);
    if (!asset || !asset.blob) {
      return null;
    }

    // Only process images
    if (!asset.mime || !asset.mime.startsWith('image/')) {
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(asset.blob);
    });
  }

  /**
   * Check if asset is an image
   * @param {Object} asset
   * @returns {boolean}
   */
  isImage(asset) {
    if (!asset || !asset.mime) return false;
    return asset.mime.startsWith('image/');
  }

  /**
   * Check if asset is a video
   * @param {Object} asset
   * @returns {boolean}
   */
  isVideo(asset) {
    if (!asset || !asset.mime) return false;
    return asset.mime.startsWith('video/');
  }

  /**
   * Check if asset is audio
   * @param {Object} asset
   * @returns {boolean}
   */
  isAudio(asset) {
    if (!asset || !asset.mime) return false;
    return asset.mime.startsWith('audio/');
  }

  /**
   * Format file size to human readable
   * @param {number} bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Delete asset
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteAsset(id) {
    if (!this.db) throw new Error('Database not initialized');

    // Revoke blob URL if exists
    const blobURL = this.blobURLCache.get(id);
    if (blobURL) {
      URL.revokeObjectURL(blobURL);
      this.blobURLCache.delete(id);
      this.reverseBlobCache.delete(blobURL);
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([AssetManager.STORE_NAME], 'readwrite');
      const store = tx.objectStore(AssetManager.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all assets for the project
   * @returns {Promise<void>}
   */
  async clearProjectAssets() {
    const assets = await this.getProjectAssets();

    for (const asset of assets) {
      await this.deleteAsset(asset.id);
    }

    console.log(`[AssetManager] Cleared ${assets.length} assets`);
  }

  // ===== Server Download Methods =====

  /**
   * Download missing assets from server by clientId
   * Uses the by-client-id endpoint to fetch assets that were uploaded by other clients
   * @param {string} apiBaseUrl - Base API URL (e.g., http://localhost:3001/api/v2)
   * @param {string} token - JWT token
   * @param {string} projectUuid - Project UUID
   * @returns {Promise<{downloaded: number, failed: number}>}
   */
  async downloadMissingAssetsFromServer(apiBaseUrl, token, projectUuid) {
    if (this.missingAssets.size === 0) {
      console.log('[AssetManager] No missing assets to download');
      return { downloaded: 0, failed: 0 };
    }

    const assetIds = [...this.missingAssets];
    console.log(`[AssetManager] Downloading ${assetIds.length} missing assets from server...`);

    let downloaded = 0;
    let failed = 0;

    for (const assetId of assetIds) {
      // Skip if already fetching
      if (this.pendingFetches.has(assetId)) {
        continue;
      }

      // Skip if already in cache (was loaded after being marked as missing)
      if (this.blobURLCache.has(assetId)) {
        this.missingAssets.delete(assetId);
        continue;
      }

      // Skip if already in IndexedDB (just not loaded to cache yet)
      const existingAsset = await this.getAsset(assetId);
      if (existingAsset) {
        // Load it to cache
        const blobURL = URL.createObjectURL(existingAsset.blob);
        this.blobURLCache.set(assetId, blobURL);
        this.reverseBlobCache.set(blobURL, assetId);
        this.missingAssets.delete(assetId);
        // Update DOM
        await this.updateDomImagesForAsset(assetId);
        console.log(`[AssetManager] Found ${assetId.substring(0, 8)}... in IndexedDB, loaded to cache`);
        continue;
      }

      this.pendingFetches.add(assetId);

      try {
        const url = `${apiBaseUrl}/projects/${projectUuid}/assets/by-client-id/${assetId}`;
        console.log(`[AssetManager] Fetching from server: ${assetId.substring(0, 8)}...`);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.warn(`[AssetManager] Failed to fetch ${assetId}: ${response.status}`);
          failed++;
          continue;
        }

        const blob = await response.blob();
        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        const contentDisposition = response.headers.get('Content-Disposition') || '';

        // Extract filename from Content-Disposition
        let filename = `asset-${assetId}`;
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }

        // Calculate hash
        const hash = await this.calculateHash(blob);

        // Store in IndexedDB
        const asset = {
          id: assetId,
          projectId: this.projectId,
          blob: blob,
          mime: contentType,
          hash: hash,
          size: blob.size,
          uploaded: true, // Already on server
          createdAt: new Date().toISOString(),
          filename: filename,
        };

        await this.putAsset(asset);

        // Create blob URL and update cache
        const blobURL = URL.createObjectURL(blob);
        this.blobURLCache.set(assetId, blobURL);
        this.reverseBlobCache.set(blobURL, assetId);

        // Remove from missing set
        this.missingAssets.delete(assetId);

        // Update DOM images
        await this.updateDomImagesForAsset(assetId);

        console.log(`[AssetManager] Downloaded and cached: ${assetId.substring(0, 8)}...`);
        downloaded++;
      } catch (error) {
        console.error(`[AssetManager] Error downloading ${assetId}:`, error);
        failed++;
      } finally {
        this.pendingFetches.delete(assetId);
      }
    }

    console.log(`[AssetManager] Download complete: ${downloaded} downloaded, ${failed} failed`);
    return { downloaded, failed };
  }

  /**
   * Get missing asset IDs that need to be downloaded
   * @returns {string[]}
   */
  getMissingAssetsList() {
    return [...this.missingAssets];
  }

  /**
   * Check if there are missing assets waiting to be downloaded
   * @returns {boolean}
   */
  hasMissingAssets() {
    return this.missingAssets.size > 0;
  }

  // ===== Peer Coordination Methods =====

  /**
   * Get all asset IDs for this project
   * Used to announce asset availability to peers
   * @returns {Promise<string[]>} Array of asset UUIDs
   */
  async getAllAssetIds() {
    const assets = await this.getProjectAssets();
    return assets.map(a => a.id);
  }

  /**
   * Check if an asset exists locally
   * @param {string} assetId - Asset UUID
   * @returns {Promise<boolean>}
   */
  async hasAsset(assetId) {
    const asset = await this.getAsset(assetId);
    return asset !== null;
  }

  /**
   * Get asset blob by ID (for uploading to server/sending to peer)
   * @param {string} assetId - Asset UUID
   * @returns {Promise<{blob: Blob, mime: string, hash: string, filename: string}|null>}
   */
  async getAssetForUpload(assetId) {
    const asset = await this.getAsset(assetId);
    if (!asset) return null;

    return {
      blob: asset.blob,
      mime: asset.mime,
      hash: asset.hash,
      filename: asset.filename || `asset-${assetId}`,
      size: asset.size,
    };
  }

  /**
   * Store asset received from server (after peer uploaded it)
   * @param {string} assetId - Asset UUID
   * @param {Blob} blob - Asset blob
   * @param {Object} metadata - Asset metadata
   * @returns {Promise<void>}
   */
  async storeAssetFromServer(assetId, blob, metadata = {}) {
    // Check if we already have it
    const existing = await this.getAsset(assetId);
    if (existing) {
      console.log(`[AssetManager] Asset ${assetId.substring(0, 8)}... already exists`);
      return;
    }

    const hash = metadata.hash || await this.calculateHash(blob);

    const asset = {
      id: assetId,
      projectId: this.projectId,
      blob: blob,
      mime: metadata.mime || 'application/octet-stream',
      hash: hash,
      size: blob.size,
      uploaded: true, // Already on server
      createdAt: new Date().toISOString(),
      filename: metadata.filename,
    };

    await this.putAsset(asset);
    console.log(`[AssetManager] Stored asset from server: ${assetId.substring(0, 8)}...`);
  }

  /**
   * Get list of missing asset IDs
   * Compares given list against local assets
   * @param {string[]} assetIds - List of asset IDs to check
   * @returns {Promise<string[]>} List of missing asset IDs
   */
  async getMissingAssetIds(assetIds) {
    const missing = [];
    for (const assetId of assetIds) {
      const exists = await this.hasAsset(assetId);
      if (!exists) {
        missing.push(assetId);
      }
    }
    return missing;
  }

  /**
   * Cleanup blob URLs and close database
   * MUST be called when done
   */
  cleanup() {
    // Revoke all blob URLs
    for (const blobURL of this.blobURLCache.values()) {
      URL.revokeObjectURL(blobURL);
    }
    this.blobURLCache.clear();
    this.reverseBlobCache.clear();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('[AssetManager] Cleaned up');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssetManager;
} else {
  window.AssetManager = AssetManager;
}

/**
 * Global helper function to resolve asset:// URLs
 * Searches for active AssetManager and resolves
 *
 * @param {string} html - HTML content with asset:// URLs
 * @param {Object} options - Options
 * @param {boolean} options.fetchMissing - If true, triggers fetch for missing assets (default true)
 * @returns {string} - HTML with blob:// URLs (or placeholders for missing)
 */
window.resolveAssetUrls = function(html, options = {}) {
  if (!html) return html;

  const { fetchMissing = true } = options;

  // Try to find active AssetManager from YjsProjectBridge
  const bridge = window.eXeLearning?.app?.project?._yjsBridge;
  const assetManager = bridge?.assetManager;

  if (assetManager && typeof assetManager.resolveHTMLAssetsSync === 'function') {
    const resolved = assetManager.resolveHTMLAssetsSync(html);

    // Trigger async download of missing assets from server
    if (fetchMissing && assetManager.hasMissingAssets()) {
      // Get API config
      const config = window.eXeLearning?.config || {};
      const apiBaseUrl = config.apiUrl || `${window.location.origin}/api/v2`;
      const token = window.eXeLearning?.symfony?.token || '';
      const projectUuid = bridge?.projectId || '';

      if (token && projectUuid) {
        // Trigger download in background (don't await)
        assetManager.downloadMissingAssetsFromServer(apiBaseUrl, token, projectUuid)
          .then(result => {
            if (result.downloaded > 0) {
              console.log(`[resolveAssetUrls] Downloaded ${result.downloaded} missing assets`);
            }
          })
          .catch(err => {
            console.warn('[resolveAssetUrls] Failed to download missing assets:', err);
          });
      } else {
        console.warn('[resolveAssetUrls] Missing token or projectUuid for asset download');
      }
    }

    return resolved;
  }

  // Legacy fallback: try AssetCacheManager
  const assetCache = bridge?.assetCache;
  if (assetCache && typeof assetCache.resolveHtmlAssetUrlsSync === 'function') {
    return assetCache.resolveHtmlAssetUrlsSync(html);
  }

  // No manager available - return original
  return html;
};

/**
 * Global async helper function to resolve asset:// URLs
 * Waits for assets to be fetched if missing
 *
 * @param {string} html - HTML content with asset:// URLs
 * @param {Object} options - Options
 * @param {boolean} options.addTrackingAttrs - Add data-asset-id for DOM updates
 * @returns {Promise<string>} - HTML with blob:// URLs
 */
window.resolveAssetUrlsAsync = async function(html, options = {}) {
  if (!html) return html;

  const bridge = window.eXeLearning?.app?.project?._yjsBridge;
  const assetManager = bridge?.assetManager;
  const wsHandler = bridge?.assetWebSocketHandler;

  if (assetManager && typeof assetManager.resolveHTMLAssets === 'function') {
    return assetManager.resolveHTMLAssets(html, {
      wsHandler,
      addTrackingAttrs: options.addTrackingAttrs,
    });
  }

  // Legacy fallback
  const assetCache = bridge?.assetCache;
  if (assetCache && typeof assetCache.resolveHtmlAssetUrls === 'function') {
    return assetCache.resolveHtmlAssetUrls(html);
  }

  return html;
};
