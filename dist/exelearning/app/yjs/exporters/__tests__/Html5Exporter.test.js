/**
 * Html5Exporter Tests
 *
 * These tests can be run in a browser environment with the test runner
 * or with Jest using jsdom.
 */

// Mock dependencies for testing
const createMockYjsDocument = () => {
  // Simulated Y.Map with basic get/set functionality
  class MockMap {
    constructor(data = {}) {
      this._data = new Map(Object.entries(data));
    }
    get(key) { return this._data.get(key); }
    set(key, value) { this._data.set(key, value); }
    forEach(callback) { this._data.forEach((v, k) => callback(v, k)); }
    entries() { return this._data.entries(); }
    toJSON() { return Object.fromEntries(this._data); }
  }

  // Simulated Y.Array
  class MockArray {
    constructor(items = []) {
      this._items = items;
    }
    get length() { return this._items.length; }
    get(index) { return this._items[index]; }
    push(items) { this._items.push(...items); }
    toJSON() { return this._items.map(i => i.toJSON ? i.toJSON() : i); }
  }

  // Create mock document manager
  return {
    getMetadata: () => new MockMap({
      title: 'Test Project',
      author: 'Test Author',
      language: 'es',
      description: 'Test description',
      license: 'CC-BY-SA',
      theme: 'ultrathink',
      customStyles: '.custom { color: red; }',
    }),
    getNavigation: () => new MockArray([
      new MockMap({
        id: 'page1',
        pageId: 'page1',
        pageName: 'Página Principal',
        parentId: null,
        order: 0,
        blocks: new MockArray([
          new MockMap({
            id: 'block1',
            blockId: 'block1',
            blockName: 'Block 1',
            order: 0,
            components: new MockArray([
              new MockMap({
                id: 'comp1',
                ideviceId: 'comp1',
                ideviceType: 'FreeTextIdevice',
                order: 0,
                htmlContent: '<div class="exe-text"><p>Este es el contenido del iDevice.</p><img src="asset://assetId123/image.png" alt="Test image"></div>',
              }),
            ]),
          }),
        ]),
      }),
      new MockMap({
        id: 'page2',
        pageId: 'page2',
        pageName: 'Segunda Página',
        parentId: null,
        order: 1,
        blocks: new MockArray([
          new MockMap({
            id: 'block2',
            blockId: 'block2',
            blockName: 'Block 2',
            order: 0,
            components: new MockArray([
              new MockMap({
                id: 'comp2',
                ideviceId: 'comp2',
                ideviceType: 'MultipleChoiceIdevice',
                order: 0,
                htmlContent: '<div class="quiz"><p>¿Cuál es la respuesta correcta?</p></div>',
              }),
            ]),
          }),
        ]),
      }),
      new MockMap({
        id: 'page3',
        pageId: 'page3',
        pageName: 'Subpágina',
        parentId: 'page1',
        order: 2,
        blocks: new MockArray([]),
      }),
    ]),
  };
};

const createMockAssetCache = () => ({
  getAllAssets: async () => [
    {
      assetId: 'assetId123',
      blob: new Blob(['test image data'], { type: 'image/png' }),
      metadata: {
        assetId: 'assetId123',
        filename: 'image.png',
        originalPath: 'assetId123/image.png',
      },
    },
  ],
});

const createMockResourceFetcher = () => ({
  fetchTheme: async (themeName) => {
    return new Map([
      ['content.css', new Blob([`/* Theme: ${themeName} */`], { type: 'text/css' })],
      ['default.js', new Blob([`// Theme: ${themeName}`], { type: 'application/javascript' })],
    ]);
  },
  fetchBaseLibraries: async () => {
    return new Map([
      ['jquery/jquery.min.js', new Blob(['// jQuery'], { type: 'application/javascript' })],
      ['common.js', new Blob(['// Common'], { type: 'application/javascript' })],
      ['common_i18n.js', new Blob(['// i18n'], { type: 'application/javascript' })],
      ['bootstrap/bootstrap.min.css', new Blob(['/* Bootstrap */'], { type: 'text/css' })],
    ]);
  },
  fetchIdevice: async (ideviceType) => {
    return new Map([
      [`${ideviceType}.js`, new Blob([`// ${ideviceType}`], { type: 'application/javascript' })],
      [`${ideviceType}.css`, new Blob([`/* ${ideviceType} */`], { type: 'text/css' })],
    ]);
  },
});

// Test suite
const runHtml5ExporterTests = () => {
  const results = [];

  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  };

  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.push({ name, passed: false, error: error.message });
      console.error(`✗ ${name}: ${error.message}`);
    }
  };

  // Async test runner
  const runTests = async () => {
    console.log('=== Html5Exporter Tests ===\n');

    // Test 1: File extension
    await test('getFileExtension returns .zip', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      assert(exporter.getFileExtension() === '.zip', 'Expected .zip extension');
    });

    // Test 2: File suffix
    await test('getFileSuffix returns _web', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      assert(exporter.getFileSuffix() === '_web', 'Expected _web suffix');
    });

    // Test 3: buildFilename
    await test('buildFilename generates correct name', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const filename = exporter.buildFilename();
      assert(filename.endsWith('_web.zip'), 'Filename should end with _web.zip');
      assert(filename.includes('test-project'), 'Filename should include sanitized title');
    });

    // Test 4: Page list building
    await test('buildPageList extracts pages correctly', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();
      assert(pages.length === 3, 'Should have 3 pages');
      assert(pages[0].title === 'Página Principal', 'First page title correct');
      assert(pages[1].title === 'Segunda Página', 'Second page title correct');
      assert(pages[2].parentId === 'page1', 'Third page has correct parent');
    });

    // Test 5: Root pages
    await test('getRootPages filters correctly', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();
      const rootPages = exporter.getRootPages(pages);
      assert(rootPages.length === 2, 'Should have 2 root pages');
    });

    // Test 6: Child pages
    await test('getChildPages finds children', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();
      const children = exporter.getChildPages('page1', pages);
      assert(children.length === 1, 'page1 should have 1 child');
      assert(children[0].id === 'page3', 'Child should be page3');
    });

    // Test 7: Used iDevices
    await test('getUsedIdevices extracts types', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();
      const idevices = exporter.getUsedIdevices(pages);
      assert(idevices.includes('FreeTextIdevice'), 'Should include FreeTextIdevice');
      assert(idevices.includes('MultipleChoiceIdevice'), 'Should include MultipleChoiceIdevice');
    });

    // Test 8: Sanitize page filename
    await test('sanitizePageFilename handles special chars', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const sanitized = exporter.sanitizePageFilename('Página Principal 🎉');
      assert(!sanitized.includes('á'), 'Should remove accents');
      assert(!sanitized.includes('🎉'), 'Should remove emojis');
      assert(sanitized.includes('pagina'), 'Should have normalized text');
    });

    // Test 9: iDevice path mapping
    await test('getIdevicePath maps types correctly', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      assert(exporter.getIdevicePath('FreeTextIdevice') === 'text', 'FreeTextIdevice -> text');
      assert(exporter.getIdevicePath('MultipleChoiceIdevice') === 'form', 'MultipleChoiceIdevice -> form');
    });

    // Test 10: Asset URL fixing
    await test('fixAssetUrls converts asset:// URLs', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const content = '<img src="asset://abc123/image.png">';
      const fixed = exporter.fixAssetUrls(content, '');
      assert(fixed.includes('content/resources/abc123/image.png'), 'Should convert asset:// URL');
    });

    // Test 11: HTML generation includes iDevice content
    await test('generatePageHtml includes iDevice content', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();
      const meta = mockDoc.getMetadata();
      const html = exporter.generatePageHtml(pages[0], pages, meta);

      assert(html.includes('Este es el contenido del iDevice'), 'Should include iDevice content');
      assert(html.includes('iDevice_wrapper'), 'Should have iDevice wrapper class');
      assert(html.includes('text-IDevice'), 'Should have text-IDevice class');
    });

    // Test 12: HTML includes theme reference
    await test('generatePageHtml includes theme CSS', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();
      const meta = mockDoc.getMetadata();
      const html = exporter.generatePageHtml(pages[0], pages, meta);

      assert(html.includes('theme/content.css'), 'Should include theme CSS');
      assert(html.includes('theme/default.js'), 'Should include theme JS');
    });

    // Test 13: HTML includes custom styles
    await test('generatePageHtml includes custom styles', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();
      const meta = mockDoc.getMetadata();
      const html = exporter.generatePageHtml(pages[0], pages, meta);

      assert(html.includes('.custom { color: red; }'), 'Should include custom styles');
    });

    // Test 14: Navigation structure
    await test('generateNavigation creates correct structure', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();
      const nav = exporter.generateNavigation(pages, 'page1', '');

      assert(nav.includes('<nav id="siteNav">'), 'Should have nav element');
      assert(nav.includes('Página Principal'), 'Should include first page');
      assert(nav.includes('Segunda Página'), 'Should include second page');
      assert(nav.includes('class="active"'), 'Should mark current page as active');
    });

    // Test 15: Base path for subpages
    await test('generatePageHtml uses correct basePath for subpages', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();
      const meta = mockDoc.getMetadata();
      const html = exporter.generatePageHtml(pages[1], pages, meta);

      // Second page should have basePath '../' for relative links
      assert(html.includes('../libs/'), 'Should have ../ basePath for libs');
      assert(html.includes('../theme/'), 'Should have ../ basePath for theme');
    });

    // Test 16: Content XML generation
    await test('generateContentXml creates valid XML', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const xml = exporter.generateContentXml();

      assert(xml.includes('<?xml version="1.0"'), 'Should have XML declaration');
      assert(xml.includes('<ode xmlns="http://www.intef.es/xsd/ode"'), 'Should have ODE namespace');
      assert(xml.includes('Test Project'), 'Should include title');
      assert(xml.includes('odeNavStructure'), 'Should have page structures');
    });

    // Test 17: Pagination
    await test('generatePagination creates prev/next links', () => {
      const mockDoc = createMockYjsDocument();
      const exporter = new Html5Exporter(mockDoc, null, null);
      const pages = exporter.buildPageList();

      // Second page should have both prev and next
      const pagination = exporter.generatePagination(pages[1], pages, '../');
      assert(pagination.includes('class="prev"'), 'Should have prev link');
      // Note: page3 is a child page, so next from page2 is page3
    });

    // Print summary
    console.log('\n=== Test Summary ===');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`Passed: ${passed}/${results.length}`);
    console.log(`Failed: ${failed}/${results.length}`);

    if (failed > 0) {
      console.log('\nFailed tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }

    return results;
  };

  return runTests();
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runHtml5ExporterTests, createMockYjsDocument, createMockAssetCache, createMockResourceFetcher };
} else if (typeof window !== 'undefined') {
  window.Html5ExporterTests = { runHtml5ExporterTests, createMockYjsDocument, createMockAssetCache, createMockResourceFetcher };
}
