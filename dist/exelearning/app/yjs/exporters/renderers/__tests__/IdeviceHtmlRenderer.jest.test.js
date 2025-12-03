/**
 * IdeviceHtmlRenderer Jest Tests
 */

// Import the class
const IdeviceHtmlRenderer = require('../IdeviceHtmlRenderer');

describe('IdeviceHtmlRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new IdeviceHtmlRenderer();
  });

  describe('getConfig', () => {
    it('should return correct config for known iDevice types', () => {
      const textConfig = renderer.getConfig('text');
      expect(textConfig.cssClass).toBe('text');
      expect(textConfig.componentType).toBe('json');

      const formConfig = renderer.getConfig('form');
      expect(formConfig.cssClass).toBe('form');
    });

    it('should return fallback config for unknown types', () => {
      const config = renderer.getConfig('UnknownIdevice');
      expect(config.cssClass).toBe('unknown');
      expect(config.componentType).toBe('json');
    });

    it('should handle FreeTextIdevice as text type', () => {
      const config = renderer.getConfig('FreeTextIdevice');
      expect(config.cssClass).toBe('text');
    });
  });

  describe('render', () => {
    it('should render a simple iDevice with content', () => {
      const component = {
        id: 'comp1',
        type: 'text',
        content: '<p>Hello World</p>',
        properties: {},
      };

      const html = renderer.render(component);

      expect(html).toContain('id="comp1"');
      expect(html).toContain('class="idevice_node text"');
      expect(html).toContain('<p>Hello World</p>');
    });

    it('should add data attributes when includeDataAttributes is true', () => {
      const component = {
        id: 'comp1',
        type: 'form',
        content: '<p>Quiz content</p>',
        properties: { question: 'What is 2+2?' },
      };

      const html = renderer.render(component, { includeDataAttributes: true });

      expect(html).toContain('data-idevice-type="form"');
      expect(html).toContain('data-idevice-component-type="json"');
      expect(html).toContain('data-idevice-json-data');
    });

    it('should not add data attributes when includeDataAttributes is false', () => {
      const component = {
        id: 'comp1',
        type: 'text',
        content: '<p>Content</p>',
        properties: {},
      };

      const html = renderer.render(component, { includeDataAttributes: false });

      expect(html).not.toContain('data-idevice-type');
      expect(html).not.toContain('data-idevice-path');
    });

    it('should add visibility classes from properties', () => {
      const component = {
        id: 'comp1',
        type: 'text',
        content: '',
        properties: {
          visibility: 'false',
          teacherOnly: 'true',
        },
      };

      const html = renderer.render(component);

      expect(html).toContain('novisible');
      expect(html).toContain('teacher-only');
    });

    it('should add custom CSS class from properties', () => {
      const component = {
        id: 'comp1',
        type: 'text',
        content: '',
        properties: { cssClass: 'my-custom-class' },
      };

      const html = renderer.render(component);

      expect(html).toContain('my-custom-class');
    });

    it('should add db-no-data class when content is empty', () => {
      const component = {
        id: 'comp1',
        type: 'text',
        content: '',
        properties: {},
      };

      const html = renderer.render(component);

      expect(html).toContain('db-no-data');
    });
  });

  describe('renderBlock', () => {
    it('should render a block with header', () => {
      const block = {
        id: 'block1',
        name: 'My Block Title',
        components: [
          { id: 'comp1', type: 'text', content: '<p>Content 1</p>', properties: {} },
        ],
        properties: {},
      };

      const html = renderer.renderBlock(block);

      expect(html).toContain('<article id="block1"');
      expect(html).toContain('class="box"');
      expect(html).toContain('<header class="box-head no-icon">');
      expect(html).toContain('<h1 class="box-title">My Block Title</h1>');
      expect(html).toContain('<div class="box-content">');
    });

    it('should render a block without header when name is empty', () => {
      const block = {
        id: 'block1',
        name: '',
        components: [],
        properties: {},
      };

      const html = renderer.renderBlock(block);

      expect(html).toContain('class="box no-header"');
      expect(html).not.toContain('<header');
      expect(html).toContain('<div class="box-head">');
    });

    it('should include block visibility properties', () => {
      const block = {
        id: 'block1',
        name: 'Block',
        components: [],
        properties: {
          minimized: 'true',
          visibility: 'false',
        },
      };

      const html = renderer.renderBlock(block);

      expect(html).toContain('minimized');
      expect(html).toContain('novisible');
    });

    it('should render all components inside the block', () => {
      const block = {
        id: 'block1',
        name: 'Block',
        components: [
          { id: 'comp1', type: 'text', content: '<p>First</p>', properties: {} },
          { id: 'comp2', type: 'form', content: '<p>Second</p>', properties: {} },
        ],
        properties: {},
      };

      const html = renderer.renderBlock(block);

      expect(html).toContain('id="comp1"');
      expect(html).toContain('id="comp2"');
      expect(html).toContain('<p>First</p>');
      expect(html).toContain('<p>Second</p>');
    });
  });

  describe('fixAssetUrls', () => {
    it('should convert asset:// URLs', () => {
      const content = '<img src="asset://abc123/image.png">';
      const fixed = renderer.fixAssetUrls(content, '');

      expect(fixed).toBe('<img src="content/resources/abc123/image.png">');
    });

    it('should add basePath prefix', () => {
      const content = '<img src="asset://abc123/image.png">';
      const fixed = renderer.fixAssetUrls(content, '../');

      expect(fixed).toBe('<img src="../content/resources/abc123/image.png">');
    });

    it('should handle multiple asset URLs', () => {
      const content = '<img src="asset://a/1.png"><img src="asset://b/2.png">';
      const fixed = renderer.fixAssetUrls(content, '');

      expect(fixed).toContain('content/resources/a/1.png');
      expect(fixed).toContain('content/resources/b/2.png');
    });

    it('should handle empty content', () => {
      expect(renderer.fixAssetUrls('', '')).toBe('');
      expect(renderer.fixAssetUrls(null, '')).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(renderer.escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(renderer.escapeHtml('"test"')).toBe('&quot;test&quot;');
      expect(renderer.escapeHtml("it's")).toBe('it&#039;s');
      expect(renderer.escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should handle empty strings', () => {
      expect(renderer.escapeHtml('')).toBe('');
      expect(renderer.escapeHtml(null)).toBe('');
    });
  });

  describe('getCssLinks', () => {
    it('should generate CSS link tags for iDevice types', () => {
      const links = renderer.getCssLinks(['text', 'form']);

      expect(links.length).toBe(2);
      expect(links[0]).toContain('idevices/text/text.css');
      expect(links[1]).toContain('idevices/form/form.css');
    });

    it('should add basePath to links', () => {
      const links = renderer.getCssLinks(['text'], '../');

      expect(links[0]).toContain('../idevices/text/text.css');
    });

    it('should deduplicate types', () => {
      const links = renderer.getCssLinks(['text', 'text', 'FreeTextIdevice']);

      // text and FreeTextIdevice both map to 'text', so should be deduplicated
      expect(links.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getJsScripts', () => {
    it('should generate script tags for iDevice types', () => {
      const scripts = renderer.getJsScripts(['text', 'form']);

      expect(scripts.length).toBe(2);
      expect(scripts[0]).toContain('idevices/text/text.js');
      expect(scripts[1]).toContain('idevices/form/form.js');
    });
  });
});
