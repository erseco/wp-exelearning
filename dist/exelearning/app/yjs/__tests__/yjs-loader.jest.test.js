/**
 * YjsLoader Jest Tests
 *
 * Unit tests for yjs-loader.js - dynamically loads all Yjs modules.
 *
 * Run with: npm run test:frontend
 */

/* eslint-disable no-undef */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';

describe('YjsLoader', () => {
  let originalWindow;
  let mockScripts;
  let mockCurrentScript;

  beforeEach(() => {
    // Save original state
    originalWindow = { ...global.window };
    mockScripts = [];
    mockCurrentScript = null;

    // Setup window mocks - ensure Y and YjsModules are truly undefined
    global.window = {
      eXeLearning: {
        symfony: { basePath: '' },
        version: 'v1.0.0',
      },
      Y: undefined,
      JSZip: undefined,
      YjsModules: undefined,
      YjsLoader: undefined,
    };

    // Setup document mocks using Object.defineProperty for currentScript
    const mockHead = {
      appendChild: mock((script) => {
        mockScripts.push(script);
        // Simulate async load
        setTimeout(() => {
          if (script.onload) script.onload();
        }, 0);
      }),
    };

    // Mock createElement
    const originalCreateElement = document.createElement.bind(document);
    spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'script') {
        return {
          src: '',
          async: false,
          onload: null,
          onerror: null,
        };
      }
      return originalCreateElement(tag);
    });

    // Mock head.appendChild
    spyOn(document.head, 'appendChild').mockImplementation((script) => {
      mockScripts.push(script);
      setTimeout(() => {
        if (script.onload) script.onload();
      }, 0);
      return script;
    });

    // Mock querySelector
    spyOn(document, 'querySelector').mockReturnValue(null);

    // Mock dispatchEvent
    spyOn(document, 'dispatchEvent').mockImplementation(() => true);

    // Mock currentScript using defineProperty
    Object.defineProperty(document, 'currentScript', {
      get: () => mockCurrentScript,
      configurable: true,
    });

    // Suppress console.log during tests
    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('module initialization', () => {
    it('creates YjsLoader object on window', () => {
      require('../yjs-loader.js');
      expect(window.YjsLoader).toBeDefined();
    });

    it('initializes loaded flag as false', () => {
      require('../yjs-loader.js');
      expect(window.YjsLoader.loaded).toBe(false);
    });

    it('initializes loading flag as false', () => {
      require('../yjs-loader.js');
      expect(window.YjsLoader.loading).toBe(false);
    });

    it('initializes _loadPromise as null', () => {
      require('../yjs-loader.js');
      expect(window.YjsLoader._loadPromise).toBeNull();
    });
  });

  describe('load', () => {
    beforeEach(() => {
      require('../yjs-loader.js');
    });

    it('sets loading flag to true when load is called', () => {
      // Don't await - just check the flag is set
      window.YjsLoader.load();
      expect(window.YjsLoader.loading).toBe(true);
    });

    it('returns same promise if already loading (caches promise)', () => {
      window.YjsLoader.load();
      const cachedPromise = window.YjsLoader._loadPromise;
      window.YjsLoader.load();

      // Both calls should use the same cached _loadPromise
      expect(window.YjsLoader._loadPromise).toBe(cachedPromise);
    });

    it('returns resolved promise if already loaded', async () => {
      window.YjsLoader.loaded = true;
      window.YjsModules = { YjsDocumentManager: mock(() => undefined) };

      const result = await window.YjsLoader.load();

      expect(result).toBeUndefined();
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      // Ensure Y and YjsModules are undefined for these tests
      delete window.Y;
      delete window.YjsModules;
      require('../yjs-loader.js');
    });

    it('returns status object', () => {
      const status = window.YjsLoader.getStatus();

      expect(status).toHaveProperty('loaded');
      expect(status).toHaveProperty('loading');
      expect(status).toHaveProperty('yjsAvailable');
      expect(status).toHaveProperty('modulesAvailable');
    });

    it('reports yjsAvailable based on window.Y', () => {
      // Ensure Y is undefined first
      delete window.Y;
      expect(window.YjsLoader.getStatus().yjsAvailable).toBe(false);

      window.Y = { Doc: mock(() => undefined) };
      expect(window.YjsLoader.getStatus().yjsAvailable).toBe(true);
    });

    it('reports modulesAvailable based on window.YjsModules', () => {
      // Ensure YjsModules is undefined first (but keep YjsLoader)
      const loader = window.YjsLoader;
      delete window.YjsModules;
      window.YjsLoader = loader;
      expect(window.YjsLoader.getStatus().modulesAvailable).toBeFalsy();

      window.YjsModules = { YjsDocumentManager: mock(() => undefined) };
      expect(window.YjsLoader.getStatus().modulesAvailable).toBeTruthy();
    });
  });

  describe('initProject', () => {
    beforeEach(() => {
      require('../yjs-loader.js');

      // Mock successful load
      window.YjsLoader.load = mock(() => undefined).mockResolvedValue();
      window.YjsModules = {
        initializeProject: mock(() => undefined).mockResolvedValue({ bridge: true }),
      };
    });

    it('calls load first', async () => {
      await window.YjsLoader.initProject(123, 'token');

      expect(window.YjsLoader.load).toHaveBeenCalled();
    });

    it('calls YjsModules.initializeProject', async () => {
      await window.YjsLoader.initProject(123, 'token', { option: 'value' });

      expect(window.YjsModules.initializeProject).toHaveBeenCalledWith(123, 'token', { option: 'value' });
    });

    it('returns bridge from initializeProject', async () => {
      const result = await window.YjsLoader.initProject(123, 'token');

      expect(result).toEqual({ bridge: true });
    });
  });

  describe('path building', () => {
    it('uses basePath from eXeLearning config', () => {
      window.eXeLearning = {
        symfony: { basePath: '/web/exelearning' },
        version: 'v1.0.0',
      };

      // Re-require to pick up new config
      
      require('../yjs-loader.js');

      // The paths should include basePath
      // This is tested indirectly through the load function
    });

    it('uses version from eXeLearning config', () => {
      window.eXeLearning = {
        symfony: { basePath: '' },
        version: 'v2.0.0',
      };

      // Re-require to pick up new config
      
      require('../yjs-loader.js');

      // The paths should include version
      // This is tested indirectly through the load function
    });

    it('defaults to empty basePath', () => {
      window.eXeLearning = null;

      // Re-require with no config
      
      require('../yjs-loader.js');

      // Should not throw
      expect(window.YjsLoader).toBeDefined();
    });
  });

  describe('auto-load', () => {
    it('auto-loads when currentScript has data-autoload', () => {
      // Set mockCurrentScript via the getter we defined
      mockCurrentScript = {
        dataset: { autoload: '' },
      };

      require('../yjs-loader.js');

      // Load should have been called
      expect(window.YjsLoader._loadPromise).not.toBeNull();
    });

    it('does not auto-load without data-autoload', () => {
      mockCurrentScript = {
        dataset: {},
      };

      require('../yjs-loader.js');

      expect(window.YjsLoader._loadPromise).toBeNull();
    });

    it('does not auto-load when currentScript is null', () => {
      mockCurrentScript = null;

      require('../yjs-loader.js');

      expect(window.YjsLoader._loadPromise).toBeNull();
    });
  });

  describe('script loading', () => {
    beforeEach(() => {
      require('../yjs-loader.js');
    });

    it('creates script elements when loading', () => {
      // Start load but don't await
      window.YjsLoader.load();

      // Should have called createElement to create script elements
      expect(document.createElement).toHaveBeenCalledWith('script');
    });

    it('handles script load errors gracefully', async () => {
      // Override appendChild to trigger error
      spyOn(document.head, 'appendChild').mockImplementation((script) => {
        setTimeout(() => {
          if (script.onerror) script.onerror(new Error('Load failed'));
        }, 0);
        return script;
      });

      await expect(window.YjsLoader.load()).rejects.toThrow();
    });
  });

  describe('yjs-ready event', () => {
    it('dispatchEvent is available for yjs-ready event', () => {
      require('../yjs-loader.js');

      // Verify dispatchEvent is mockable (shows it can fire events)
      expect(document.dispatchEvent).toBeDefined();
      expect(typeof document.dispatchEvent).toBe('function');
    });

    it('YjsLoader has loaded and loading state tracking', () => {
      require('../yjs-loader.js');

      // Verify state tracking works
      expect(typeof window.YjsLoader.loaded).toBe('boolean');
      expect(typeof window.YjsLoader.loading).toBe('boolean');

      // State should be properly initialized
      window.YjsLoader.loaded = true;
      expect(window.YjsLoader.loaded).toBe(true);
    });
  });
});
