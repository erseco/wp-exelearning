/**
 * BaseExporter Tests
 *
 * Tests for the base exporter class utilities.
 */

const runBaseExporterTests = () => {
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

  // Create a concrete implementation for testing
  class TestExporter extends BaseExporter {
    getFileExtension() { return '.test'; }
    getFileSuffix() { return '_test'; }
    async export(filename) { return { success: true, filename }; }
  }

  // Mock document manager
  const createMockDocManager = () => ({
    getMetadata: () => ({
      get: (key) => {
        const data = {
          title: 'Test Title',
          author: 'Test Author',
          language: 'en',
        };
        return data[key];
      },
    }),
    getNavigation: () => ({
      length: 0,
      get: () => null,
    }),
  });

  const runTests = async () => {
    console.log('=== BaseExporter Tests ===\n');

    // Test 1: escapeXml
    await test('escapeXml escapes special characters', () => {
      const exporter = new TestExporter(createMockDocManager());
      const result = exporter.escapeXml('<test attr="value">Hello & World</test>');
      assert(result === '&lt;test attr=&quot;value&quot;&gt;Hello &amp; World&lt;/test&gt;', 'Should escape XML chars');
    });

    // Test 2: escapeXml with null
    await test('escapeXml handles null/undefined', () => {
      const exporter = new TestExporter(createMockDocManager());
      assert(exporter.escapeXml(null) === '', 'Should return empty string for null');
      assert(exporter.escapeXml(undefined) === '', 'Should return empty string for undefined');
    });

    // Test 3: escapeHtml
    await test('escapeHtml escapes HTML characters', () => {
      const exporter = new TestExporter(createMockDocManager());
      const result = exporter.escapeHtml('<script>alert("xss")</script>');
      assert(result.includes('&lt;script&gt;'), 'Should escape < and >');
      assert(result.includes('&quot;'), 'Should escape quotes');
    });

    // Test 4: sanitizeFilename
    await test('sanitizeFilename removes special chars', () => {
      const exporter = new TestExporter(createMockDocManager());
      const result = exporter.sanitizeFilename('Test File: @#$%^&*()!');
      assert(!result.includes('@'), 'Should remove @');
      assert(!result.includes('#'), 'Should remove #');
      assert(result === 'test-file', 'Should produce clean filename');
    });

    // Test 5: sanitizeFilename max length
    await test('sanitizeFilename respects max length', () => {
      const exporter = new TestExporter(createMockDocManager());
      const longTitle = 'A'.repeat(100);
      const result = exporter.sanitizeFilename(longTitle, 20);
      assert(result.length === 20, 'Should truncate to max length');
    });

    // Test 6: sanitizeFilename with spaces
    await test('sanitizeFilename converts spaces to dashes', () => {
      const exporter = new TestExporter(createMockDocManager());
      const result = exporter.sanitizeFilename('Hello World Test');
      assert(result === 'hello-world-test', 'Should convert spaces to dashes');
    });

    // Test 7: generateId
    await test('generateId creates unique IDs', () => {
      const exporter = new TestExporter(createMockDocManager());
      const id1 = exporter.generateId();
      const id2 = exporter.generateId();
      assert(id1 !== id2, 'IDs should be unique');
    });

    // Test 8: generateId with prefix
    await test('generateId includes prefix', () => {
      const exporter = new TestExporter(createMockDocManager());
      const id = exporter.generateId('TEST_');
      assert(id.startsWith('TEST_'), 'ID should start with prefix');
    });

    // Test 9: buildFilename
    await test('buildFilename uses metadata title', () => {
      const exporter = new TestExporter(createMockDocManager());
      const filename = exporter.buildFilename();
      assert(filename.includes('test-title'), 'Should include sanitized title');
      assert(filename.endsWith('_test.test'), 'Should include suffix and extension');
    });

    // Test 10: getJSZip throws when not loaded
    await test('getJSZip returns JSZip when available', () => {
      const exporter = new TestExporter(createMockDocManager());
      // JSZip should be loaded via test-runner.html
      if (typeof JSZip !== 'undefined') {
        const zip = exporter.getJSZip();
        assert(zip === JSZip, 'Should return JSZip');
      }
    });

    // Test 11: createZip creates JSZip instance
    await test('createZip returns new JSZip instance', () => {
      const exporter = new TestExporter(createMockDocManager());
      if (typeof JSZip !== 'undefined') {
        const zip = exporter.createZip();
        assert(zip instanceof JSZip, 'Should be JSZip instance');
      }
    });

    // Print summary
    console.log('\n=== Test Summary ===');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`Passed: ${passed}/${results.length}`);
    console.log(`Failed: ${failed}/${results.length}`);

    return results;
  };

  return runTests();
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runBaseExporterTests };
} else if (typeof window !== 'undefined') {
  window.BaseExporterTests = { runBaseExporterTests };
}
