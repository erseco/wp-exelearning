/**
 * AssetWebSocketHandler
 *
 * Handles the asset coordination protocol over WebSocket.
 * Works alongside y-websocket's WebsocketProvider to enable
 * peer-to-peer asset synchronization.
 *
 * Protocol Messages (JSON):
 * - awareness-update: Announce which assets we have
 * - request-asset: Ask server to coordinate getting an asset
 * - upload-request: Server asking us to upload an asset we have
 * - asset-ready: Server notifying that an asset is now available
 * - asset-not-found: Asset not available from any peer
 *
 * Binary Yjs messages are NOT handled here - they're handled by y-websocket.
 *
 * Usage:
 *   const handler = new AssetWebSocketHandler(assetManager, wsProvider, config);
 *   await handler.initialize();
 *   // Handler will auto-announce availability on connect
 *   // And respond to asset requests from server/peers
 */
class AssetWebSocketHandler {
  /**
   * @param {AssetManager} assetManager - Asset manager instance
   * @param {WebsocketProvider} wsProvider - y-websocket provider
   * @param {Object} config - Configuration
   * @param {string} config.projectId - Project UUID
   * @param {string} config.apiUrl - API base URL
   * @param {string} config.token - JWT token
   */
  constructor(assetManager, wsProvider, config) {
    this.assetManager = assetManager;
    this.wsProvider = wsProvider;
    this.config = config;

    // Pending asset requests (assetId -> { resolve, reject, timeout })
    this.pendingRequests = new Map();

    // Track connection state
    this.connected = false;

    // Track if we've announced assets (for fallback mechanism)
    this._hasAnnounced = false;

    // Pending prefetch support (for bulk-upload-complete coordination)
    this._pendingPrefetchAssetIds = null;
    this._prefetchDelayTimeout = null;

    // Event listeners
    this.listeners = {
      assetReceived: [],
      assetNotFound: [],
      error: [],
    };

    // Bound handlers for cleanup
    this._onMessage = this._handleMessage.bind(this);
    this._onStatus = this._handleStatus.bind(this);
  }

  /**
   * Initialize the handler
   * Sets up WebSocket message listener and announces availability
   */
  async initialize() {
    if (!this.wsProvider) {
      console.warn('[AssetWebSocketHandler] No WebSocket provider available');
      return;
    }

    // IMPORTANT: Attach status listener FIRST to avoid race conditions
    // This ensures we don't miss any status events
    this.wsProvider.on('status', this._onStatus);

    // Get the underlying WebSocket
    const ws = this.wsProvider.ws;
    if (!ws) {
      console.warn('[AssetWebSocketHandler] WebSocket not connected yet, waiting...');
      // Wait for connection
      await this._waitForConnection();
    }

    // Setup message handler on the WebSocket
    this._setupMessageHandler();

    // Check if already connected and announce assets
    if (this.wsProvider.wsconnected) {
      this.connected = true;
      console.log('[AssetWebSocketHandler] WebSocket already connected, announcing assets...');
      await this.announceAssetAvailability();
    }

    // Fallback: Schedule a delayed announcement in case of race conditions
    // This ensures assets are announced even if timing is off
    setTimeout(async () => {
      if (this.wsProvider?.wsconnected && !this._hasAnnounced) {
        console.log('[AssetWebSocketHandler] Delayed asset announcement (fallback)');
        await this.announceAssetAvailability();
      }
    }, 1000);

    console.log('[AssetWebSocketHandler] Initialized');
  }

  /**
   * Wait for WebSocket connection
   * @returns {Promise<void>}
   */
  _waitForConnection() {
    return new Promise((resolve) => {
      if (this.wsProvider.wsconnected) {
        resolve();
        return;
      }

      const checkConnection = ({ status }) => {
        if (status === 'connected') {
          this.wsProvider.off('status', checkConnection);
          resolve();
        }
      };

      this.wsProvider.on('status', checkConnection);

      // Timeout after 10 seconds
      setTimeout(() => {
        this.wsProvider.off('status', checkConnection);
        resolve();
      }, 10000);
    });
  }

  /**
   * Setup message handler on WebSocket
   * Intercepts JSON messages for asset protocol
   */
  _setupMessageHandler() {
    // y-websocket's WebSocket instance
    const ws = this.wsProvider.ws;
    if (!ws) return;

    // Store original onmessage
    const originalOnMessage = ws.onmessage;

    // Wrap onmessage to intercept asset protocol messages
    ws.onmessage = (event) => {
      const data = event.data;

      // Check if it's a JSON message (asset protocol)
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        // Binary message - let y-websocket handle it
        if (originalOnMessage) {
          originalOnMessage.call(ws, event);
        }
        return;
      }

      // Try to parse as JSON
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);

          // Check if it's an asset protocol message
          if (this._isAssetMessage(parsed.type)) {
            this._handleAssetMessage(parsed);
            return; // Don't pass to y-websocket
          }
        } catch {
          // Not JSON, pass through
        }
      }

      // Pass non-asset messages to original handler
      if (originalOnMessage) {
        originalOnMessage.call(ws, event);
      }
    };

    console.log('[AssetWebSocketHandler] Message handler installed');
  }

  /**
   * Check if message type is asset-related
   * @param {string} type
   * @returns {boolean}
   */
  _isAssetMessage(type) {
    const assetTypes = [
      'awareness-update',
      'request-asset',
      'upload-request',
      'bulk-upload-request',
      'bulk-upload-complete',
      'asset-ready',
      'asset-not-found',
      'prefetch-assets',
    ];
    return assetTypes.includes(type);
  }

  /**
   * Handle WebSocket connection status changes
   * @param {{status: string}} param
   */
  async _handleStatus({ status }) {
    if (status === 'connected') {
      this.connected = true;
      console.log('[AssetWebSocketHandler] Connected, announcing assets...');

      // Re-setup message handler (WebSocket may be new)
      this._setupMessageHandler();

      // Announce our assets
      await this.announceAssetAvailability();
    } else if (status === 'disconnected') {
      this.connected = false;
      console.log('[AssetWebSocketHandler] Disconnected');
    }
  }

  /**
   * Handle incoming message
   * @param {MessageEvent} event
   */
  _handleMessage(event) {
    // This is called from the wrapped onmessage above
  }

  /**
   * Handle asset protocol message
   * @param {Object} message
   */
  async _handleAssetMessage(message) {
    const { type, data } = message;

    console.log(`[AssetWebSocketHandler] Received: ${type}`, data);

    switch (type) {
      case 'upload-request':
        await this._handleUploadRequest(data);
        break;

      case 'bulk-upload-request':
        await this._handleBulkUploadRequest(data);
        break;

      case 'asset-ready':
        await this._handleAssetReady(data);
        break;

      case 'asset-not-found':
        this._handleAssetNotFound(data);
        break;

      case 'prefetch-assets':
      case 'request-prefetch':
        await this._handlePrefetchRequest(data);
        break;

      case 'bulk-upload-complete':
        await this._handleBulkUploadComplete(data);
        break;

      default:
        console.warn(`[AssetWebSocketHandler] Unknown message type: ${type}`);
    }
  }

  /**
   * Announce which assets we have to the server
   * Called on connect and after importing new assets
   */
  async announceAssetAvailability() {
    // Use wsProvider.wsconnected directly to avoid race conditions with internal flag
    if (!this.wsProvider?.wsconnected || !this.assetManager) {
      console.log('[AssetWebSocketHandler] Cannot announce: not connected or no asset manager');
      return;
    }

    try {
      const assetIds = await this.assetManager.getAllAssetIds();

      // Mark as announced even if no assets (to prevent unnecessary retries)
      this._hasAnnounced = true;

      if (assetIds.length === 0) {
        console.log('[AssetWebSocketHandler] No assets to announce');
        // Still send awareness update with empty array so server knows we're ready
        this._sendMessage({
          type: 'awareness-update',
          data: {
            availableAssets: [],
            totalAssets: 0,
          },
        });
        return;
      }

      this._sendMessage({
        type: 'awareness-update',
        data: {
          availableAssets: assetIds,
          totalAssets: assetIds.length,
        },
      });

      console.log(`[AssetWebSocketHandler] Announced ${assetIds.length} assets`);
    } catch (error) {
      console.error('[AssetWebSocketHandler] Failed to announce assets:', error);
    }
  }

  /**
   * Request an asset from peers
   * @param {string} assetId - Asset UUID to request
   * @param {number} timeout - Timeout in ms (default 30s)
   * @returns {Promise<boolean>} - True if asset was retrieved
   */
  async requestAsset(assetId, timeout = 30000) {
    // Check if we already have it
    const exists = await this.assetManager.hasAsset(assetId);
    if (exists) {
      console.log(`[AssetWebSocketHandler] Asset ${assetId.substring(0, 8)}... already exists`);
      return true;
    }

    if (!this.connected) {
      console.warn('[AssetWebSocketHandler] Not connected, cannot request asset');
      return false;
    }

    // Check if already requesting
    if (this.pendingRequests.has(assetId)) {
      console.log(`[AssetWebSocketHandler] Already requesting ${assetId.substring(0, 8)}...`);
      return this.pendingRequests.get(assetId).promise;
    }

    // Create pending request
    const pendingRequest = {};
    pendingRequest.promise = new Promise((resolve, reject) => {
      pendingRequest.resolve = resolve;
      pendingRequest.reject = reject;
    });

    // Setup timeout
    pendingRequest.timeout = setTimeout(() => {
      this.pendingRequests.delete(assetId);
      pendingRequest.resolve(false);
    }, timeout);

    this.pendingRequests.set(assetId, pendingRequest);

    // Send request
    this._sendMessage({
      type: 'request-asset',
      data: {
        assetId,
        priority: 'high',
        reason: 'render',
      },
    });

    console.log(`[AssetWebSocketHandler] Requested asset ${assetId.substring(0, 8)}...`);

    return pendingRequest.promise;
  }

  /**
   * Handle upload request from server
   * Server is asking us to upload an asset we have
   * @param {Object} payload
   */
  async _handleUploadRequest(payload) {
    const { assetId, requestId, uploadUrl } = payload;

    console.log(`[AssetWebSocketHandler] Upload request for ${assetId.substring(0, 8)}...`);

    try {
      // Get asset data
      const assetData = await this.assetManager.getAssetForUpload(assetId);

      if (!assetData) {
        console.warn(`[AssetWebSocketHandler] Don't have asset ${assetId.substring(0, 8)}...`);
        // Notify server that we don't have the asset
        this._sendMessage({
          type: 'asset-uploaded',
          data: {
            assetId,
            requestId,
            success: false,
            error: 'Asset not found in local storage',
          },
        });
        return;
      }

      // Upload to server via REST API
      const formData = new FormData();
      formData.append('file', assetData.blob, assetData.filename);

      // Use server-provided uploadUrl (includes clientId as query param)
      // Fall back to constructing URL if not provided
      const url = uploadUrl
        ? `${this.config.apiUrl}${uploadUrl}`
        : `${this.config.apiUrl}/projects/${this.config.projectId}/assets?clientId=${assetId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[AssetWebSocketHandler] Uploaded asset ${assetId.substring(0, 8)}...`, result);

        // Notify server that upload is complete
        this._sendMessage({
          type: 'asset-uploaded',
          data: {
            assetId,
            requestId,
            success: true,
            size: assetData.blob.size,
          },
        });
      } else {
        const errorText = await response.text();
        console.error(`[AssetWebSocketHandler] Upload failed: ${response.status}`, errorText);

        // Notify server about the failure
        this._sendMessage({
          type: 'asset-uploaded',
          data: {
            assetId,
            requestId,
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
          },
        });
      }
    } catch (error) {
      console.error(`[AssetWebSocketHandler] Upload error:`, error);

      // Notify server about the exception
      this._sendMessage({
        type: 'asset-uploaded',
        data: {
          assetId,
          requestId,
          success: false,
          error: error.message || 'Unknown error',
        },
      });
    }
  }

  /**
   * Handle bulk upload request from server
   * Server is asking us to upload multiple assets for collaboration sync
   * @param {Object} payload
   */
  async _handleBulkUploadRequest(payload) {
    const { assetIds, uploadUrl, reason } = payload;

    if (!assetIds || assetIds.length === 0) {
      console.log('[AssetWebSocketHandler] Bulk upload request with no assets');
      return;
    }

    console.log(`[AssetWebSocketHandler] Bulk upload request for ${assetIds.length} assets (reason: ${reason || 'unknown'})`);

    // Report starting bulk upload
    this._sendMessage({
      type: 'bulk-upload-progress',
      data: {
        status: 'started',
        total: assetIds.length,
        completed: 0,
        failed: 0,
      },
    });

    let completed = 0;
    let failed = 0;
    const failedAssets = [];

    // Upload assets sequentially with small delays to avoid overwhelming server
    for (const assetId of assetIds) {
      try {
        // Small delay between uploads
        if (completed > 0 || failed > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Get asset data
        const assetData = await this.assetManager.getAssetForUpload(assetId);

        if (!assetData) {
          console.warn(`[AssetWebSocketHandler] Bulk upload: Don't have asset ${assetId.substring(0, 8)}...`);
          failed++;
          failedAssets.push({ assetId, error: 'Asset not found in local storage' });
          continue;
        }

        // Upload to server
        const formData = new FormData();
        formData.append('file', assetData.blob, assetData.filename);

        // Use server-provided uploadUrl (includes clientId as query param)
        const url = uploadUrl
          ? `${this.config.apiUrl}${uploadUrl}?clientId=${assetId}`
          : `${this.config.apiUrl}/projects/${this.config.projectId}/assets?clientId=${assetId}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
          },
          body: formData,
        });

        if (response.ok) {
          completed++;
          console.log(`[AssetWebSocketHandler] Bulk uploaded ${assetId.substring(0, 8)}... (${completed}/${assetIds.length})`);

          // Report progress every 5 uploads or on last one
          if (completed % 5 === 0 || completed + failed === assetIds.length) {
            this._sendMessage({
              type: 'bulk-upload-progress',
              data: {
                status: 'in-progress',
                total: assetIds.length,
                completed,
                failed,
              },
            });
          }
        } else {
          const errorText = await response.text();
          console.error(`[AssetWebSocketHandler] Bulk upload failed for ${assetId.substring(0, 8)}...: ${response.status}`);
          failed++;
          failedAssets.push({ assetId, error: `HTTP ${response.status}: ${errorText}` });
        }
      } catch (error) {
        console.error(`[AssetWebSocketHandler] Bulk upload error for ${assetId}:`, error);
        failed++;
        failedAssets.push({ assetId, error: error.message || 'Unknown error' });
      }
    }

    // Report completion
    this._sendMessage({
      type: 'bulk-upload-progress',
      data: {
        status: 'completed',
        total: assetIds.length,
        completed,
        failed,
        failedAssets: failedAssets.length > 0 ? failedAssets : undefined,
      },
    });

    console.log(`[AssetWebSocketHandler] Bulk upload complete: ${completed} uploaded, ${failed} failed`);
  }

  /**
   * Handle bulk upload complete notification from server
   * Another client has finished uploading assets - we can now download them
   * @param {Object} payload
   */
  async _handleBulkUploadComplete(payload) {
    const { uploadedBy, totalAvailable, failedCount } = payload || {};

    console.log(`[AssetWebSocketHandler] Bulk upload complete notification: ${totalAvailable} assets available from ${uploadedBy || 'peer'}`);

    if (failedCount > 0) {
      console.warn(`[AssetWebSocketHandler] ${failedCount} assets failed to upload`);
    }

    // Check if we have a pending prefetch request that was delayed
    // If so, we can trigger it now since assets are available
    if (this._pendingPrefetchAssetIds && this._pendingPrefetchAssetIds.length > 0) {
      console.log(`[AssetWebSocketHandler] Triggering delayed prefetch for ${this._pendingPrefetchAssetIds.length} assets`);

      // Cancel any pending delay timeout
      if (this._prefetchDelayTimeout) {
        clearTimeout(this._prefetchDelayTimeout);
        this._prefetchDelayTimeout = null;
      }

      // Start prefetch immediately
      const missing = await this.assetManager.getMissingAssetIds(this._pendingPrefetchAssetIds);
      if (missing.length > 0) {
        this._prefetchAssets(missing);
      }

      this._pendingPrefetchAssetIds = null;
    }
  }

  /**
   * Handle asset-ready notification from server
   * Asset is now available on server, download it
   * @param {Object} payload
   */
  async _handleAssetReady(payload) {
    const { assetId } = payload;

    console.log(`[AssetWebSocketHandler] Asset ready: ${assetId.substring(0, 8)}...`);

    try {
      // Download from server
      const response = await fetch(
        `${this.config.apiUrl}/projects/${this.config.projectId}/assets/by-client-id/${assetId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Get metadata from headers
      const mime = response.headers.get('X-Original-Mime') || 'application/octet-stream';
      const hash = response.headers.get('X-Asset-Hash') || '';
      const filename = response.headers.get('X-Filename') || undefined;

      // Get blob
      const blob = await response.blob();

      // Store in AssetManager
      await this.assetManager.storeAssetFromServer(assetId, blob, {
        mime,
        hash,
        filename,
      });

      // Resolve pending request if any
      const pending = this.pendingRequests.get(assetId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(assetId);
        pending.resolve(true);
      }

      // Emit event
      this._emit('assetReceived', { assetId });

      console.log(`[AssetWebSocketHandler] Downloaded and stored ${assetId.substring(0, 8)}...`);
    } catch (error) {
      console.error(`[AssetWebSocketHandler] Failed to download asset:`, error);
    }
  }

  /**
   * Handle asset-not-found notification
   * @param {Object} payload
   */
  _handleAssetNotFound(payload) {
    const { assetId } = payload;

    console.warn(`[AssetWebSocketHandler] Asset not found: ${assetId.substring(0, 8)}...`);

    // Resolve pending request as failed
    const pending = this.pendingRequests.get(assetId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(assetId);
      pending.resolve(false);
    }

    // Emit event
    this._emit('assetNotFound', { assetId });
  }

  /**
   * Handle prefetch request from server
   * Server is asking us to prefetch assets in background
   * @param {Object} payload
   */
  async _handlePrefetchRequest(payload) {
    const { assetIds, delayMs } = payload;

    if (!assetIds || assetIds.length === 0) {
      return;
    }

    console.log(`[AssetWebSocketHandler] Prefetch request for ${assetIds.length} assets`);

    // Find which ones we're missing
    const missing = await this.assetManager.getMissingAssetIds(assetIds);

    if (missing.length === 0) {
      console.log('[AssetWebSocketHandler] All prefetch assets already cached');
      return;
    }

    // Respect server-provided delay hint (e.g., wait for bulk uploads to complete)
    if (delayMs && delayMs > 0) {
      console.log(`[AssetWebSocketHandler] Waiting ${delayMs}ms before prefetching (server hint)`);

      // Store pending assets so bulk-upload-complete can trigger early
      this._pendingPrefetchAssetIds = missing;

      // Set a timeout to trigger prefetch after delay (in case bulk-upload-complete doesn't arrive)
      this._prefetchDelayTimeout = setTimeout(async () => {
        this._prefetchDelayTimeout = null;
        if (this._pendingPrefetchAssetIds && this._pendingPrefetchAssetIds.length > 0) {
          console.log(`[AssetWebSocketHandler] Delay expired, starting prefetch...`);
          const toFetch = this._pendingPrefetchAssetIds;
          this._pendingPrefetchAssetIds = null;
          this._prefetchAssets(toFetch);
        }
      }, delayMs);

      return; // Will be triggered by timeout or bulk-upload-complete
    }

    console.log(`[AssetWebSocketHandler] Prefetching ${missing.length} missing assets...`);

    // Download missing assets in background (don't await)
    this._prefetchAssets(missing);
  }

  /**
   * Prefetch assets in background
   * @param {string[]} assetIds
   */
  async _prefetchAssets(assetIds) {
    for (const assetId of assetIds) {
      try {
        // Small delay between requests to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 100));

        const response = await fetch(
          `${this.config.apiUrl}/projects/${this.config.projectId}/assets/by-client-id/${assetId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
            },
          }
        );

        if (!response.ok) {
          console.warn(`[AssetWebSocketHandler] Prefetch failed for ${assetId.substring(0, 8)}...`);
          continue;
        }

        const mime = response.headers.get('X-Original-Mime') || 'application/octet-stream';
        const hash = response.headers.get('X-Asset-Hash') || '';
        const filename = response.headers.get('X-Filename') || undefined;
        const blob = await response.blob();

        await this.assetManager.storeAssetFromServer(assetId, blob, {
          mime,
          hash,
          filename,
        });

        console.log(`[AssetWebSocketHandler] Prefetched ${assetId.substring(0, 8)}...`);
      } catch (error) {
        console.warn(`[AssetWebSocketHandler] Prefetch error for ${assetId}:`, error);
      }
    }
  }

  /**
   * Request missing assets that are referenced in HTML
   * Call this after loading content that may reference assets
   * @param {string} html - HTML content to scan
   * @returns {Promise<string[]>} - List of asset IDs that were requested
   */
  async requestMissingAssetsFromHTML(html) {
    if (!html) return [];

    // Find all asset:// references
    const assetRegex = /asset:\/\/([a-f0-9-]+)/gi;
    const matches = [...html.matchAll(assetRegex)];

    if (matches.length === 0) return [];

    const assetIds = matches.map(m => m[1]);
    const uniqueIds = [...new Set(assetIds)];

    // Find missing ones
    const missing = await this.assetManager.getMissingAssetIds(uniqueIds);

    if (missing.length === 0) return [];

    console.log(`[AssetWebSocketHandler] Requesting ${missing.length} missing assets from HTML`);

    // Request each missing asset
    for (const assetId of missing) {
      this.requestAsset(assetId).catch(err => {
        console.warn(`[AssetWebSocketHandler] Failed to request ${assetId}:`, err);
      });
    }

    return missing;
  }

  /**
   * Send JSON message over WebSocket
   * @param {Object} message
   */
  _sendMessage(message) {
    if (!this.wsProvider?.ws || this.wsProvider.ws.readyState !== WebSocket.OPEN) {
      console.warn('[AssetWebSocketHandler] Cannot send - WebSocket not open');
      return;
    }

    const jsonStr = JSON.stringify(message);
    this.wsProvider.ws.send(jsonStr);
  }

  // ===== Event Handling =====

  /**
   * Subscribe to event
   * @param {string} event - Event name
   * @param {Function} callback
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Unsubscribe from event
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event
   * @param {string} event
   * @param {Object} data
   */
  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    // Clear pending requests
    for (const [assetId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.resolve(false);
    }
    this.pendingRequests.clear();

    // Clear prefetch delay timeout
    if (this._prefetchDelayTimeout) {
      clearTimeout(this._prefetchDelayTimeout);
      this._prefetchDelayTimeout = null;
    }
    this._pendingPrefetchAssetIds = null;

    // Remove status listener
    if (this.wsProvider) {
      this.wsProvider.off('status', this._onStatus);
    }

    this.listeners = {
      assetReceived: [],
      assetNotFound: [],
      error: [],
    };

    console.log('[AssetWebSocketHandler] Destroyed');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssetWebSocketHandler;
} else {
  window.AssetWebSocketHandler = AssetWebSocketHandler;
}
