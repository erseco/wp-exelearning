/**
 * eXeLearning API Mock Interceptor for WordPress Integration
 *
 * Intercepts both jQuery $.ajax and native fetch calls to eXeLearning API
 * endpoints and returns mock responses. This allows the editor to run in
 * offline/standalone mode within WordPress.
 */

(function() {
    'use strict';

    // Store original fetch
    const originalFetch = window.fetch;

    // Base URL for static files
    const baseUrl = window.wpExeMockConfig?.baseUrl || '';

    /**
     * Generate a UUID v4
     */
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Check if URL matches an API pattern
     */
    function matchesApi(url, pattern) {
        return url.includes(pattern);
    }

    /**
     * Handle resource download requests
     * Converts ?resource=/path/to/file or ?resource=path/to/file to direct file URL
     * Handles both /files/perm/idevices/base?resource=... and
     * /api/idevice-management/idevices/download/file/resources?resource=...
     */
    function handleResourceRequest(url) {
        const urlString = typeof url === 'string' ? url : url.toString();

        // Check if this is a resource download request
        if (urlString.includes('?resource=')) {
            const resourceMatch = urlString.match(/\?resource=([^&]+)/);
            if (resourceMatch) {
                let resourcePath = decodeURIComponent(resourceMatch[1]);
                // Ensure path starts with /
                if (!resourcePath.startsWith('/')) {
                    resourcePath = '/' + resourcePath;
                }
                // Ensure path starts with /perm/ (not /files/perm/)
                if (!resourcePath.startsWith('/perm/')) {
                    // Already has /perm/ prefix, keep it
                }
                // Build direct URL to the file
                const directUrl = baseUrl + '/files' + resourcePath;
                console.log('[WP-EXE Mock] Resource redirect:', urlString, '->', directUrl);
                return directUrl;
            }
        }
        return null;
    }

    /**
     * Extract locale from URL like /api/translations/{locale}/list
     */
    function extractLocale(url) {
        const match = url.match(/\/api\/translations\/([a-z]{2}(?:_[A-Z]{2})?)\/list/);
        return match ? match[1] : 'en';
    }

    /**
     * Handle static file requests that need mocking
     */
    function getStaticFileMock(url) {
        const urlString = typeof url === 'string' ? url : url.toString();

        // README file (third party code info)
        if (urlString.includes('/libs/README')) {
            console.log('[WP-EXE Mock] Intercepting static file:', urlString);
            return '# Third Party Libraries\n\nThis software uses various open source libraries.\nSee LICENSE files for details.';
        }

        // CHANGELOG file
        if (urlString.includes('CHANGELOG')) {
            console.log('[WP-EXE Mock] Intercepting static file:', urlString);
            return '# Changelog\n\n## WordPress Integration\n\n- Initial release for WordPress integration';
        }

        // Licenses list
        if (urlString.includes('/libs/LICENSES') || urlString.includes('licenses')) {
            console.log('[WP-EXE Mock] Intercepting static file:', urlString);
            return '# Licenses\n\n- jQuery: MIT\n- Bootstrap: MIT\n- TinyMCE: LGPL';
        }

        return null;
    }

    /**
     * Handle mock requests - returns data object (not Response)
     * for jQuery AJAX compatibility
     */
    function getMockData(url, method) {
        const urlString = typeof url === 'string' ? url : url.toString();

        // Skip non-API requests
        if (!urlString.includes('/api/')) {
            return null;
        }

        console.log('[WP-EXE Mock] Intercepting:', method || 'GET', urlString);

        // Parameter management - critical for initialization
        if (matchesApi(urlString, '/api/parameter-management/parameters/data/list')) {
            return window.wpExeMockData.parameters;
        }

        // Translations
        if (urlString.includes('/api/translations/') && urlString.includes('/list')) {
            const locale = extractLocale(urlString);
            return window.wpExeMockData.getTranslations(locale);
        }

        // iDevices installed
        if (matchesApi(urlString, '/api/idevice/installed')) {
            return window.wpExeMockData.idevices;
        }

        // Themes installed
        if (matchesApi(urlString, '/api/theme/installed')) {
            return window.wpExeMockData.themes;
        }

        // User preferences
        if (matchesApi(urlString, '/api/user/preferences')) {
            if (method === 'PUT') {
                return { responseMessage: 'OK' };
            }
            // Return user preferences in the format expected by userPreferences.js
            return {
                userPreferences: {
                    advancedMode: { value: 'false' },
                    versionControl: { value: 'inactive' },
                    locale: { value: window.wpExeMockConfig?.locale || 'en' },
                    theme: { value: 'base' },
                    autoSave: { value: 'false' }
                }
            };
        }

        // LOPD accepted
        if (matchesApi(urlString, '/api/user/lopd-accepted') ||
            matchesApi(urlString, '/api/user/set-lopd-accepted')) {
            return { responseMessage: 'OK' };
        }

        // Upload limits
        if (matchesApi(urlString, '/api/config/upload-limits')) {
            return {
                maxFileSize: 104857600,
                maxFileSizeFormatted: '100 MB',
                limitingFactor: 'configuration',
                details: {
                    phpUploadMaxFilesize: 104857600,
                    phpPostMaxSize: 104857600,
                    configuredLimit: 104857600
                }
            };
        }

        // Resource lock timeout
        if (matchesApi(urlString, '/api/resource-lock/timeout')) {
            return { timeout: 300 };
        }

        // User ODE files (projects list)
        if (matchesApi(urlString, '/api/ode-management/odes/user/list') ||
            matchesApi(urlString, '/api/v2/projects/user/list')) {
            return { odeFiles: { odeFilesSync: [] } };
        }

        // Recent projects
        if (matchesApi(urlString, '/api/v2/projects/user/recent')) {
            return [];
        }

        // Templates
        if (matchesApi(urlString, '/api/v2/templates')) {
            return [];
        }

        // Session close
        if (matchesApi(urlString, '/api/ode-management/odes/session/close')) {
            return { responseMessage: 'OK' };
        }

        // ODE save (manual/auto)
        if (matchesApi(urlString, '/api/ode-management/odes/save')) {
            return { responseMessage: 'OK' };
        }

        // ODE properties
        if (matchesApi(urlString, '/api/ode-management/odes') && urlString.includes('/properties')) {
            if (method === 'PUT') {
                return { responseMessage: 'OK' };
            }
            return {
                properties: {
                    title: 'WordPress Project',
                    author: '',
                    description: '',
                    license: '',
                    language: 'en'
                }
            };
        }

        // Nav structure (pages)
        if (matchesApi(urlString, '/api/nav-structure-management/nav-structures')) {
            if (method === 'PUT' || method === 'POST' || method === 'DELETE') {
                return { responseMessage: 'OK' };
            }
            return { odeNavStructureSyncs: [] };
        }

        // Page structure (blocks)
        if (matchesApi(urlString, '/api/pag-structure-management/pag-structures')) {
            if (method === 'PUT' || method === 'POST' || method === 'DELETE') {
                return { responseMessage: 'OK' };
            }
            return { odePagStructureSyncs: [] };
        }

        // iDevices/components management
        if (matchesApi(urlString, '/api/idevice-management/idevices') ||
            matchesApi(urlString, '/api/component-management/components')) {
            if (method === 'PUT' || method === 'POST' || method === 'DELETE') {
                return {
                    responseMessage: 'OK',
                    odeComponentsSyncId: generateUUID()
                };
            }
            return { odeComponentsSyncs: [] };
        }

        // Current ODE users
        if (matchesApi(urlString, '/api/current-ode-users')) {
            return { responseMessage: 'OK', users: [] };
        }

        // Last updated
        if (urlString.includes('/api/ode-management/odes/') && urlString.includes('/last-updated')) {
            return {
                responseMessage: 'OK',
                lastUpdatedDate: Math.floor(Date.now() / 1000) // Current timestamp in seconds
            };
        }

        // Check updates
        if (matchesApi(urlString, '/api/ode-management/check-updates')) {
            return {
                responseMessage: 'OK',
                hasUpdates: false,
                syncNavStructureFlag: false,
                syncPagStructureFlag: false,
                syncComponentsFlag: false
            };
        }

        // Export
        if (matchesApi(urlString, '/api/export/')) {
            return { responseMessage: 'OK' };
        }

        // File upload
        if (matchesApi(urlString, '/api/file-management/upload') ||
            matchesApi(urlString, '/api/idevice-management/idevices/upload-file')) {
            return {
                responseMessage: 'OK',
                fileName: 'uploaded-file',
                filePath: '/files/temp/uploaded-file'
            };
        }

        // Broken links
        if (matchesApi(urlString, '/api/ode-management/broken-links') ||
            matchesApi(urlString, 'broken-links')) {
            return { brokenLinks: [] };
        }

        // Used files
        if (matchesApi(urlString, '/api/ode-management/used-files') ||
            matchesApi(urlString, 'used-files')) {
            return { usedFiles: [] };
        }

        // Games session
        if (matchesApi(urlString, '/api/games/session/')) {
            return { idevices: [] };
        }

        // Cloud storage
        if (matchesApi(urlString, '/api/google/') || matchesApi(urlString, '/api/dropbox/')) {
            return { responseMessage: 'NOT_AVAILABLE' };
        }

        // Project sharing (v2 API)
        if (urlString.includes('/api/v2/projects/') && urlString.includes('/sharing')) {
            return {
                responseMessage: 'OK',
                visibility: 'private',
                sharedWith: []
            };
        }

        // Default stub for unhandled API calls
        console.warn('[WP-EXE Mock] Unhandled API call:', urlString);
        return { responseMessage: 'OK' };
    }

    /**
     * Setup jQuery AJAX interceptor
     * Must be called AFTER jQuery is loaded
     */
    let jQueryInterceptorInitialized = false;
    function setupJQueryInterceptor() {
        // Prevent multiple initializations
        if (jQueryInterceptorInitialized) {
            console.log('[WP-EXE Mock] jQuery interceptor already initialized, skipping');
            return;
        }

        if (typeof jQuery === 'undefined' || typeof $ === 'undefined') {
            console.warn('[WP-EXE Mock] jQuery not available, will retry...');
            setTimeout(setupJQueryInterceptor, 100);
            return;
        }

        jQueryInterceptorInitialized = true;

        // Use jQuery's ajaxPrefilter to intercept all AJAX calls
        $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
            const url = options.url || '';
            const method = options.method || options.type || 'GET';

            // FIRST: Check for resource download requests (?resource=...)
            // Redirect these to direct file URLs
            const redirectUrl = handleResourceRequest(url);
            if (redirectUrl) {
                // Modify the options to use the redirected URL
                options.url = redirectUrl;
                // Continue with the modified URL
                return;
            }

            // Check if this is an API call we should mock
            if (url.includes('/api/')) {
                const mockData = getMockData(url, method.toUpperCase());

                if (mockData !== null) {
                    // Abort the original request
                    jqXHR.abort();

                    // Simulate async response
                    setTimeout(function() {
                        // Call success callback with mock data
                        if (options.success) {
                            options.success(mockData, 'success', jqXHR);
                        }
                        if (options.complete) {
                            options.complete(jqXHR, 'success');
                        }
                    }, 10);

                    // Return a resolved promise-like for the jqXHR
                    // This prevents jQuery from actually making the request
                    return false;
                }
            }
        });

        // Also override $.ajax directly for better control
        const originalAjax = $.ajax;
        $.ajax = function(urlOrSettings, settings) {
            let options = typeof urlOrSettings === 'string'
                ? { url: urlOrSettings, ...settings }
                : urlOrSettings;

            const url = options.url || '';
            const method = (options.method || options.type || 'GET').toUpperCase();

            // FIRST: Check for resource download requests (?resource=...)
            // Must be before /api/ check since URLs can contain both
            const redirectUrl = handleResourceRequest(url);
            if (redirectUrl) {
                // Redirect to the actual file URL
                options.url = redirectUrl;
                return originalAjax.call(this, options);
            }

            // Check if this is an API call we should mock
            if (url.includes('/api/')) {
                const mockData = getMockData(url, method);

                if (mockData !== null) {
                    // Return a jQuery Deferred that resolves with mock data
                    const deferred = $.Deferred();

                    setTimeout(function() {
                        deferred.resolve(mockData, 'success', { status: 200 });
                        if (options.success) {
                            options.success(mockData, 'success', { status: 200 });
                        }
                        if (options.complete) {
                            options.complete({ status: 200 }, 'success');
                        }
                    }, 10);

                    const promise = deferred.promise();
                    // Add jqXHR-like properties
                    promise.done = deferred.done.bind(deferred);
                    promise.fail = deferred.fail.bind(deferred);
                    promise.always = deferred.always.bind(deferred);

                    return promise;
                }
            }

            // Check for static file mocks (README, CHANGELOG, etc.)
            const staticMock = getStaticFileMock(url);
            if (staticMock !== null) {
                const deferred = $.Deferred();

                setTimeout(function() {
                    deferred.resolve(staticMock, 'success', { status: 200 });
                    if (options.success) {
                        options.success(staticMock, 'success', { status: 200 });
                    }
                    if (options.complete) {
                        options.complete({ status: 200 }, 'success');
                    }
                }, 10);

                const promise = deferred.promise();
                promise.done = deferred.done.bind(deferred);
                promise.fail = deferred.fail.bind(deferred);
                promise.always = deferred.always.bind(deferred);

                return promise;
            }

            // Pass through to original $.ajax for non-mocked calls
            return originalAjax.apply(this, arguments);
        };

        console.log('[WP-EXE Mock] jQuery AJAX interceptor initialized');
    }

    /**
     * Override window.fetch for any code that uses native fetch
     */
    window.fetch = async function(url, options) {
        const urlString = typeof url === 'string' ? url : url.toString();
        const method = options?.method || 'GET';

        // Check for resource download requests (?resource=...) first
        const redirectUrl = handleResourceRequest(urlString);
        if (redirectUrl) {
            console.log('[WP-EXE Mock] Fetch resource redirect:', urlString, '->', redirectUrl);
            return originalFetch.call(this, redirectUrl, options);
        }

        // Check for static file mocks
        const staticMock = getStaticFileMock(urlString);
        if (staticMock !== null) {
            return new Response(staticMock, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        // Check if this is an API call we should mock
        if (urlString.includes('/api/')) {
            const mockData = getMockData(urlString, method.toUpperCase());

            if (mockData !== null) {
                return new Response(JSON.stringify(mockData), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Pass through to original fetch for non-API calls
        return originalFetch.apply(this, arguments);
    };

    // Setup jQuery interceptor when jQuery is ready
    if (typeof jQuery !== 'undefined') {
        setupJQueryInterceptor();
    } else {
        // Wait for jQuery to load
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(setupJQueryInterceptor, 100);
        });

        // Also try on window load as fallback
        window.addEventListener('load', function() {
            setTimeout(setupJQueryInterceptor, 200);
        });
    }

    // Expose setup function for manual initialization
    window.wpExeMockSetupJQuery = setupJQueryInterceptor;

    console.log('[WP-EXE Mock] API interceptor initialized');
})();
