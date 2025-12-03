/**
 * Bun Test Setup for Frontend JavaScript Tests
 *
 * This file sets up global mocks and configurations needed for testing
 * frontend JavaScript code in the browser environment.
 */

/* eslint-disable no-undef */

import { mock, expect } from 'bun:test';
import { Window } from 'happy-dom';

// Create a happy-dom window and register globals
const window = new Window({ url: 'http://localhost:3001/' });
globalThis.window = window;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;
globalThis.DOMParser = window.DOMParser;
globalThis.XMLSerializer = window.XMLSerializer;

// ============================================================================
// Mock JSZip
// ============================================================================

class MockJSZip {
  constructor() {
    this._files = {};
    this._folders = {};
  }

  file(name, content) {
    if (content === undefined) {
      return this._files[name] || null;
    }
    this._files[name] = {
      name,
      content,
      async: (type) => {
        if (type === 'string') return String(content);
        if (type === 'uint8array') return new Uint8Array(Buffer.from(String(content)));
        if (type === 'blob') return new Blob([content]);
        return content;
      },
    };
    return this;
  }

  folder(name) {
    if (!this._folders[name]) {
      this._folders[name] = new MockJSZip();
      this._folders[name]._parent = this;
      this._folders[name]._folderName = name;
    }
    return this._folders[name];
  }

  async generateAsync(options = {}) {
    const type = options.type || 'blob';
    const content = JSON.stringify({
      files: Object.keys(this._files),
      folders: Object.keys(this._folders),
    });

    if (type === 'blob') {
      return new Blob([content], { type: 'application/zip' });
    }
    if (type === 'uint8array') {
      return new Uint8Array(Buffer.from(content));
    }
    if (type === 'arraybuffer') {
      return Buffer.from(content).buffer;
    }
    return content;
  }

  async loadAsync(data) {
    // Mock loading a ZIP file
    return this;
  }

  forEach(callback) {
    Object.entries(this._files).forEach(([path, file]) => {
      callback(path, file);
    });
    Object.entries(this._folders).forEach(([path, folder]) => {
      callback(path + '/', { dir: true });
    });
  }
}

global.JSZip = MockJSZip;

// ============================================================================
// Mock Translation Function
// ============================================================================

global._ = mock((key, ...args) => {
  // Return the key as-is for testing, or format with args
  if (args.length > 0) {
    let result = key;
    args.forEach((arg, i) => {
      result = result.replace(`%${i + 1}`, arg);
    });
    return result;
  }
  return key;
});

// ============================================================================
// Mock eXeLearning Global Object
// ============================================================================

global.eXeLearning = {
  project: {
    sessionId: 'test-session-id',
    odeId: 'test-ode-id',
    title: 'Test Project',
    author: 'Test Author',
    language: 'en',
    theme: 'default',
    getMetadata: mock(() => ({
      title: 'Test Project',
      author: 'Test Author',
      language: 'en',
    })),
  },
  toasts: {
    show: mock(() => undefined),
    success: mock(() => undefined),
    error: mock(() => undefined),
    warning: mock(() => undefined),
    info: mock(() => undefined),
  },
  modals: {
    show: mock(() => undefined),
    hide: mock(() => undefined),
    confirm: mock((message) => Promise.resolve(true)),
    alert: mock((message) => Promise.resolve()),
  },
  interface: {
    showLoading: mock(() => undefined),
    hideLoading: mock(() => undefined),
    updateStatus: mock(() => undefined),
    showProgress: mock(() => undefined),
    hideProgress: mock(() => undefined),
  },
  config: {
    baseUrl: 'http://localhost:3001',
    apiUrl: 'http://localhost:3001/api',
    assetsUrl: 'http://localhost:3001/assets',
  },
  utils: {
    generateId: mock(() => 'mock-id-' + Math.random().toString(36).substr(2, 9)),
    sanitizeFilename: mock((name) => name.replace(/[^a-z0-9]/gi, '-').toLowerCase()),
  },
};

// ============================================================================
// Mock Window Properties
// ============================================================================

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockUrls = new Map();
let urlCounter = 0;

global.URL.createObjectURL = mock((blob) => {
  const url = `blob:mock-url-${urlCounter++}`;
  mockUrls.set(url, blob);
  return url;
});

global.URL.revokeObjectURL = mock((url) => {
  mockUrls.delete(url);
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3001/',
    origin: 'http://localhost:3001',
    pathname: '/',
    search: '',
    hash: '',
    assign: mock(() => undefined),
    replace: mock(() => undefined),
    reload: mock(() => undefined),
  },
  writable: true,
});

// Mock window.navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test) Jest/29.0',
    language: 'en-US',
    languages: ['en-US', 'en'],
    platform: 'MacIntel',
    onLine: true,
  },
  writable: true,
});

// ============================================================================
// Mock Exporter Globals
// ============================================================================

// createExporter factory function (used by exporter system)
global.createExporter = mock((type, manager, assetCache, resourceFetcher) => {
  return {
    export: mock(() => Promise.resolve({ success: true, filename: 'export.zip' })),
    getFileExtension: mock(() => '.zip'),
    getFileSuffix: mock(() => '_web'),
    buildFilename: mock(() => 'test-project_web.zip'),
  };
});

// ResourceFetcher class mock
class MockResourceFetcher {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || 'http://localhost:3001';
  }

  async fetchTheme(themeName) {
    return new Map([
      ['content.css', new Blob(['/* Theme CSS */'], { type: 'text/css' })],
      ['default.js', new Blob(['// Theme JS'], { type: 'application/javascript' })],
    ]);
  }

  async fetchBaseLibraries() {
    return new Map([
      ['jquery/jquery.min.js', new Blob(['// jQuery'], { type: 'application/javascript' })],
      ['common.js', new Blob(['// Common'], { type: 'application/javascript' })],
    ]);
  }

  async fetchIdevice(ideviceType) {
    return new Map([
      [`${ideviceType}.js`, new Blob([`// ${ideviceType}`], { type: 'application/javascript' })],
      [`${ideviceType}.css`, new Blob([`/* ${ideviceType} */`], { type: 'text/css' })],
    ]);
  }
}

global.ResourceFetcher = MockResourceFetcher;

// ============================================================================
// Mock Y.js Types for Document Manager Mocks
// ============================================================================

class MockYMap {
  constructor(data = {}) {
    this._data = new Map(Object.entries(data));
  }

  get(key) {
    return this._data.get(key);
  }

  set(key, value) {
    this._data.set(key, value);
  }

  has(key) {
    return this._data.has(key);
  }

  delete(key) {
    return this._data.delete(key);
  }

  forEach(callback) {
    this._data.forEach((v, k) => callback(v, k));
  }

  entries() {
    return this._data.entries();
  }

  keys() {
    return this._data.keys();
  }

  values() {
    return this._data.values();
  }

  toJSON() {
    return Object.fromEntries(this._data);
  }

  toString() {
    const content = this.get('content') || this.get('htmlContent');
    return content ? String(content) : '[object MockYMap]';
  }
}

class MockYArray {
  constructor(items = []) {
    this._items = items;
  }

  get length() {
    return this._items.length;
  }

  get(index) {
    return this._items[index];
  }

  push(items) {
    if (Array.isArray(items)) {
      this._items.push(...items);
    } else {
      this._items.push(items);
    }
  }

  insert(index, items) {
    if (Array.isArray(items)) {
      this._items.splice(index, 0, ...items);
    } else {
      this._items.splice(index, 0, items);
    }
  }

  delete(index, length = 1) {
    this._items.splice(index, length);
  }

  forEach(callback) {
    this._items.forEach((item, index) => callback(item, index));
  }

  map(callback) {
    return this._items.map(callback);
  }

  toJSON() {
    return this._items.map((i) => (i.toJSON ? i.toJSON() : i));
  }

  toArray() {
    return [...this._items];
  }

  [Symbol.iterator]() {
    return this._items[Symbol.iterator]();
  }
}

global.MockYMap = MockYMap;
global.MockYArray = MockYArray;

// ============================================================================
// Mock Document Manager Factory
// ============================================================================

global.createMockDocumentManager = (overrides = {}) => {
  const defaultMetadata = new MockYMap({
    title: 'Test Project',
    author: 'Test Author',
    language: 'en',
    description: 'Test description',
    license: 'CC-BY-SA',
    theme: 'default',
    createdAt: new Date().toISOString(),
    ...overrides.metadata,
  });

  const defaultNavigation = new MockYArray(overrides.pages || []);

  return {
    getMetadata: mock(() => defaultMetadata),
    getNavigation: mock(() => defaultNavigation),
    getSessionId: mock(() => 'test-session-id'),
    ...overrides,
  };
};

// ============================================================================
// Mock Asset Cache Manager Factory
// ============================================================================

global.createMockAssetCache = (assets = []) => ({
  getAllAssets: mock(() =>
    Promise.resolve(
      assets.length > 0
        ? assets
        : [
            {
              assetId: 'test-asset-1',
              blob: new Blob(['test data'], { type: 'image/png' }),
              metadata: {
                assetId: 'test-asset-1',
                filename: 'image.png',
                originalPath: 'test-asset-1/image.png',
              },
            },
          ]
    )
  ),
  getAsset: mock((assetId) =>
    Promise.resolve({
      assetId,
      blob: new Blob(['test data'], { type: 'image/png' }),
      metadata: { assetId, filename: 'image.png' },
    })
  ),
  addAsset: mock(() => Promise.resolve('new-asset-id')),
  removeAsset: mock(() => Promise.resolve()),
  clear: mock(() => Promise.resolve()),
});

// ============================================================================
// Console Spy Setup (optional)
// ============================================================================

// Suppress console.log in tests unless debugging
if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: mock(() => undefined),
    debug: mock(() => undefined),
    info: mock(() => undefined),
    // Keep warn and error visible for test debugging
    warn: console.warn,
    error: console.error,
  };
}

// ============================================================================
// Custom Jest Matchers (optional)
// ============================================================================

expect.extend({
  toBeValidXml(received) {
    const hasXmlDeclaration = received.includes('<?xml');
    const hasClosingTags = !/<([a-zA-Z]+)[^>]*>[^<]*$/.test(received);

    if (hasXmlDeclaration && hasClosingTags) {
      return {
        message: () => `expected ${received} not to be valid XML`,
        pass: true,
      };
    }
    return {
      message: () => `expected ${received} to be valid XML`,
      pass: false,
    };
  },

  toContainElement(received, selector) {
    const hasElement = received.includes(`<${selector}`) || received.includes(`<${selector}>`);

    if (hasElement) {
      return {
        message: () => `expected HTML not to contain <${selector}>`,
        pass: true,
      };
    }
    return {
      message: () => `expected HTML to contain <${selector}>`,
      pass: false,
    };
  },
});

// ============================================================================
// Cleanup after each test
// ============================================================================

// Note: Bun test runner handles mock cleanup automatically
// Mock URL storage cleanup is handled by the test framework
