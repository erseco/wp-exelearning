/**
 * YjsPropertiesBinding
 * Bidirectional binding between form inputs and Y.Map('metadata')
 *
 * Features:
 * - Real-time sync between form fields and Yjs metadata
 * - Debounced updates (300ms) to avoid spam
 * - Supports undo/redo via UndoManager (uses clientID origin)
 * - Handles text, textarea, select, and checkbox inputs
 * - Observer for remote changes updates UI automatically
 *
 * Usage:
 *   const binding = new YjsPropertiesBinding(documentManager);
 *   binding.bindForm(formElement);
 *   // ... form is now synced with Yjs
 *   binding.unbindForm();
 */
class YjsPropertiesBinding {
  /**
   * @param {YjsDocumentManager} documentManager - The Yjs document manager
   */
  constructor(documentManager) {
    this.documentManager = documentManager;
    this.metadata = documentManager.getMetadata();
    this.ydoc = documentManager.getDoc();

    // Bound elements and their listeners
    this.boundInputs = new Map(); // element -> { listener, property }
    this.formElement = null;

    // Debounce timers per property
    this.debounceTimers = new Map();
    this.debounceDelay = 300; // ms

    // Observer for remote changes (form inputs)
    this.metadataObserver = null;

    // Observer for ALL title changes (syncs to header)
    this.titleSyncObserver = null;

    // Flag to prevent feedback loops
    this.isUpdatingFromYjs = false;

    // Title element binding (header #exe-title h2)
    this.titleElement = null;
    this.titleInputListener = null;

    // Property key mapping: pp_title -> title, pp_author -> author, etc.
    this.propertyKeyMap = {
      'pp_title': 'title',
      'pp_subtitle': 'subtitle',
      'pp_author': 'author',
      'pp_description': 'description',
      'pp_lang': 'language',
      'pp_license': 'license',
      'pp_addExeLink': 'addExeLink',
      'pp_addPagination': 'addPagination',
      'pp_addSearchBox': 'addSearchBox',
      'pp_addAccessibilityToolbar': 'addAccessibilityToolbar',
      'pp_extraHeadContent': 'extraHeadContent',
      'exportSource': 'exportSource',
      'footer': 'footer',
    };
  }

  /**
   * Map property key from form to metadata key
   * @param {string} propertyKey - e.g., 'pp_title'
   * @returns {string} - e.g., 'title'
   */
  mapPropertyToMetadataKey(propertyKey) {
    return this.propertyKeyMap[propertyKey] || propertyKey;
  }

  /**
   * Reverse map: metadata key to property key
   * @param {string} metadataKey - e.g., 'title'
   * @returns {string} - e.g., 'pp_title'
   */
  mapMetadataKeyToProperty(metadataKey) {
    for (const [propKey, metaKey] of Object.entries(this.propertyKeyMap)) {
      if (metaKey === metadataKey) {
        return propKey;
      }
    }
    return metadataKey;
  }

  /**
   * Bind all property inputs in a form to Yjs metadata
   * @param {HTMLFormElement} formElement - The properties form
   */
  bindForm(formElement) {
    if (this.formElement) {
      this.unbindForm();
    }

    this.formElement = formElement;

    // Find all property inputs
    const inputs = formElement.querySelectorAll('.property-value');

    inputs.forEach(input => {
      this.bindInput(input);
    });

    // Setup observer for remote changes
    this.setupMetadataObserver();

    console.log(`[YjsPropertiesBinding] Bound ${inputs.length} inputs to Yjs metadata`);
  }

  /**
   * Bind a single input element to Yjs metadata
   * @param {HTMLElement} input - Input, textarea, or select element
   */
  bindInput(input) {
    const propertyKey = input.getAttribute('property');
    if (!propertyKey) return;

    const metadataKey = this.mapPropertyToMetadataKey(propertyKey);
    const inputType = input.getAttribute('data-type') || input.type;

    // Create input listener with debouncing
    const listener = (event) => {
      if (this.isUpdatingFromYjs) return;

      // Clear existing debounce timer for this property
      if (this.debounceTimers.has(metadataKey)) {
        clearTimeout(this.debounceTimers.get(metadataKey));
      }

      // Set new debounce timer
      const timer = setTimeout(() => {
        this.updateYjsFromInput(input, metadataKey, inputType);
        this.debounceTimers.delete(metadataKey);
      }, this.debounceDelay);

      this.debounceTimers.set(metadataKey, timer);
    };

    // Determine event type based on input type
    const eventType = (inputType === 'checkbox') ? 'change' : 'input';

    input.addEventListener(eventType, listener);
    this.boundInputs.set(input, { listener, propertyKey, metadataKey, eventType });

    // Initialize input value from Yjs
    this.updateInputFromYjs(input, metadataKey, inputType);
  }

  /**
   * Update Yjs metadata from input value
   * @param {HTMLElement} input - The input element
   * @param {string} metadataKey - The metadata key in Y.Map
   * @param {string} inputType - The input type
   */
  updateYjsFromInput(input, metadataKey, inputType) {
    let value;

    switch (inputType) {
      case 'checkbox':
        value = input.checked ? 'true' : 'false';
        break;
      case 'select':
        value = input.value;
        break;
      case 'text':
      case 'textarea':
      case 'date':
      default:
        value = input.value;
        break;
    }

    // Update Yjs in a transaction with clientID origin for undo support
    this.ydoc.transact(() => {
      this.metadata.set(metadataKey, value);
      this.metadata.set('modifiedAt', Date.now());
    }, this.ydoc.clientID);

    console.log(`[YjsPropertiesBinding] Updated Yjs: ${metadataKey} = ${value}`);
  }

  /**
   * Update input value from Yjs metadata
   * @param {HTMLElement} input - The input element
   * @param {string} metadataKey - The metadata key in Y.Map
   * @param {string} inputType - The input type
   */
  updateInputFromYjs(input, metadataKey, inputType) {
    const value = this.metadata.get(metadataKey);
    if (value === undefined) return;

    this.isUpdatingFromYjs = true;

    try {
      switch (inputType) {
        case 'checkbox':
          input.checked = value === 'true' || value === true;
          break;
        case 'select':
          input.value = value;
          break;
        case 'text':
        case 'textarea':
        case 'date':
        default:
          input.value = value;
          break;
      }
    } finally {
      this.isUpdatingFromYjs = false;
    }
  }

  /**
   * Setup observer for remote changes to metadata
   */
  setupMetadataObserver() {
    this.metadataObserver = (event) => {
      // Only react to remote changes (not our own) for form inputs
      if (event.transaction.origin === 'user') return;

      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          this.onMetadataKeyChanged(key);
        }
      });
    };

    this.metadata.observe(this.metadataObserver);

    // Setup separate observer for title sync to header (ALL changes, including 'user')
    this.setupTitleSyncObserver();
  }

  /**
   * Setup observer to sync title to header element on ALL changes
   * This ensures the header title updates when user edits pp_title in form
   */
  setupTitleSyncObserver() {
    if (this.titleSyncObserver) return; // Already setup

    this.titleSyncObserver = (event) => {
      event.changes.keys.forEach((change, key) => {
        if (key === 'title' && (change.action === 'add' || change.action === 'update')) {
          this.syncTitleToHeader();
        }
      });
    };

    this.metadata.observe(this.titleSyncObserver);
  }

  /**
   * Sync title from Yjs to header element (#exe-title h2)
   * Called on ALL title changes (including from form input)
   */
  syncTitleToHeader() {
    const headerTitle = document.querySelector('#exe-title > .exe-title.content');
    if (!headerTitle) return;

    // Don't update if header is in editing mode (contenteditable)
    const isEditing = headerTitle.hasAttribute('contenteditable');
    if (isEditing) return;

    const title = this.metadata.get('title') || _('Untitled document');

    // Only update if different
    if (headerTitle.textContent !== title) {
      headerTitle.textContent = title;
      console.log(`[YjsPropertiesBinding] Synced title to header: ${title}`);

      // Trigger line count check if available
      if (window.eXeLearning?.app?.interface?.odeTitleElement?.checkTitleLineCount) {
        window.eXeLearning.app.interface.odeTitleElement.checkTitleLineCount();
      }
    }
  }

  /**
   * Handle metadata key change from remote
   * @param {string} metadataKey - The changed key
   */
  onMetadataKeyChanged(metadataKey) {
    // Skip internal keys
    if (metadataKey === 'modifiedAt' || metadataKey === 'createdAt') return;

    // Find the property key
    const propertyKey = this.mapMetadataKeyToProperty(metadataKey);

    // Find and update the corresponding input
    if (this.formElement) {
      const input = this.formElement.querySelector(`.property-value[property="${propertyKey}"]`);
      if (input) {
        const inputType = input.getAttribute('data-type') || input.type;
        this.updateInputFromYjs(input, metadataKey, inputType);
        console.log(`[YjsPropertiesBinding] Remote update: ${metadataKey}`);
      }
    }

    // Also update the title element if it's the title that changed
    if (metadataKey === 'title' && this.titleElement) {
      this.updateTitleElementFromYjs();
    }
  }

  /**
   * Unbind all inputs and cleanup
   */
  unbindForm() {
    // Remove input listeners
    this.boundInputs.forEach(({ listener, eventType }, input) => {
      input.removeEventListener(eventType, listener);
    });
    this.boundInputs.clear();

    // Clear debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Remove metadata observer
    if (this.metadataObserver) {
      this.metadata.unobserve(this.metadataObserver);
      this.metadataObserver = null;
    }

    // Remove title sync observer
    if (this.titleSyncObserver) {
      this.metadata.unobserve(this.titleSyncObserver);
      this.titleSyncObserver = null;
    }

    this.formElement = null;

    console.log('[YjsPropertiesBinding] Unbound form');
  }

  // ===== Title Element Binding =====

  /**
   * Bind the title element (#exe-title h2) to Yjs metadata
   * @param {HTMLElement} titleElement - The h2.exe-title element
   */
  bindTitleElement(titleElement) {
    if (this.titleElement) {
      this.unbindTitleElement();
    }

    this.titleElement = titleElement;

    // Initialize from Yjs
    this.updateTitleElementFromYjs();

    // Setup observer if not already done
    if (!this.metadataObserver) {
      this.setupMetadataObserver();
    }

    console.log('[YjsPropertiesBinding] Bound title element to Yjs');
  }

  /**
   * Update Yjs title from the title element
   * Called when user finishes editing the title
   * @param {string} newTitle - The new title text
   */
  updateTitleInYjs(newTitle) {
    this.ydoc.transact(() => {
      this.metadata.set('title', newTitle);
      this.metadata.set('modifiedAt', Date.now());
    }, this.ydoc.clientID);

    console.log(`[YjsPropertiesBinding] Updated title in Yjs: ${newTitle}`);

    // Also update the form input if it exists
    if (this.formElement) {
      const titleInput = this.formElement.querySelector('.property-value[property="pp_title"]');
      if (titleInput) {
        this.isUpdatingFromYjs = true;
        titleInput.value = newTitle;
        this.isUpdatingFromYjs = false;
      }
    }
  }

  /**
   * Update title element from Yjs
   */
  updateTitleElementFromYjs() {
    if (!this.titleElement) return;

    const title = this.metadata.get('title') || _('Untitled document');

    // Only update if different to avoid cursor issues
    if (this.titleElement.textContent !== title) {
      this.isUpdatingFromYjs = true;
      this.titleElement.textContent = title;
      this.isUpdatingFromYjs = false;
      console.log(`[YjsPropertiesBinding] Updated title element from Yjs: ${title}`);
    }
  }

  /**
   * Unbind the title element
   */
  unbindTitleElement() {
    this.titleElement = null;
    console.log('[YjsPropertiesBinding] Unbound title element');
  }

  /**
   * Check if we're currently updating from Yjs (to prevent feedback loops)
   * @returns {boolean}
   */
  isRemoteUpdate() {
    return this.isUpdatingFromYjs;
  }

  /**
   * Get current metadata value
   * @param {string} propertyKey - Property key (e.g., 'pp_title')
   * @returns {*} The value
   */
  getValue(propertyKey) {
    const metadataKey = this.mapPropertyToMetadataKey(propertyKey);
    return this.metadata.get(metadataKey);
  }

  /**
   * Set metadata value
   * @param {string} propertyKey - Property key (e.g., 'pp_title')
   * @param {*} value - The value to set
   */
  setValue(propertyKey, value) {
    const metadataKey = this.mapPropertyToMetadataKey(propertyKey);
    this.ydoc.transact(() => {
      this.metadata.set(metadataKey, value);
      this.metadata.set('modifiedAt', Date.now());
    }, this.ydoc.clientID);
  }

  /**
   * Destroy the binding and cleanup all resources
   */
  destroy() {
    this.unbindForm();
    this.unbindTitleElement();

    // Remove metadata observer if still active
    if (this.metadataObserver) {
      this.metadata.unobserve(this.metadataObserver);
      this.metadataObserver = null;
    }

    // Remove title sync observer if still active
    if (this.titleSyncObserver) {
      this.metadata.unobserve(this.titleSyncObserver);
      this.titleSyncObserver = null;
    }

    this.documentManager = null;
    this.metadata = null;
    this.ydoc = null;

    console.log('[YjsPropertiesBinding] Destroyed');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = YjsPropertiesBinding;
} else {
  window.YjsPropertiesBinding = YjsPropertiesBinding;
}
