/**
 * Mock Themes Data for eXeLearning WordPress Integration
 *
 * This provides the response for /api/theme/installed
 * Contains all available themes from the base installation.
 */

(function() {
    'use strict';

    // Initialize mock data namespace
    window.wpExeMockData = window.wpExeMockData || {};

    // Base URL for theme files
    const baseUrl = window.wpExeMockConfig?.baseUrl || '';
    const themesBasePath = baseUrl + '/files/perm/themes/base';

    /**
     * Helper to create theme entry
     * Note: url is relative path, cssFiles are just filenames
     * The full path is constructed by theme.js using: ${this.path}${cssFile}
     */
    function createTheme(name, title, description) {
        return {
            name: name,
            dirName: name,
            displayName: title,
            title: title,
            description: description || '',
            preview: `screenshot.png`,
            // URL is relative to server root, will be prefixed with symfonyURL
            url: `/files/perm/themes/base/${name}`,
            type: 'base',
            valid: true,
            // Just filenames, not full paths
            cssFiles: ['style.css'],
            js: ['style.js'],
            icons: {
                // Base theme icons (relative paths)
                activity: {
                    id: 'activity',
                    title: 'Activity',
                    type: 'img',
                    value: `icons/activity.png`
                },
                info: {
                    id: 'info',
                    title: 'Information',
                    type: 'img',
                    value: `icons/info.png`
                },
                question: {
                    id: 'question',
                    title: 'Question',
                    type: 'img',
                    value: `icons/ask.png`
                },
                reflection: {
                    id: 'reflection',
                    title: 'Reflection',
                    type: 'img',
                    value: `icons/reflection.png`
                },
                objectives: {
                    id: 'objectives',
                    title: 'Objectives',
                    type: 'img',
                    value: `icons/objectives.png`
                },
                experiment: {
                    id: 'experiment',
                    title: 'Experiment',
                    type: 'img',
                    value: `icons/experiment.png`
                },
                math: {
                    id: 'math',
                    title: 'Math',
                    type: 'img',
                    value: `icons/math.png`
                },
                video: {
                    id: 'video',
                    title: 'Video',
                    type: 'img',
                    value: `icons/video.png`
                },
                gallery: {
                    id: 'gallery',
                    title: 'Gallery',
                    type: 'img',
                    value: `icons/gallery.png`
                },
                interactive: {
                    id: 'interactive',
                    title: 'Interactive',
                    type: 'img',
                    value: `icons/interactive.png`
                },
                download: {
                    id: 'download',
                    title: 'Download',
                    type: 'img',
                    value: `icons/download.png`
                },
                file: {
                    id: 'file',
                    title: 'File',
                    type: 'img',
                    value: `icons/file.png`
                }
            }
        };
    }

    window.wpExeMockData.themes = {
        themes: [
            createTheme(
                'base',
                'Default',
                'Minimally-styled, feature rich responsive style for eXe.'
            ),
            createTheme(
                'flux',
                'Flux',
                'Modern, colorful theme with Material Design influences.'
            ),
            createTheme(
                'neo',
                'Neo',
                'Clean and professional theme with a contemporary look.'
            ),
            createTheme(
                'nova',
                'Nova',
                'Elegant theme with smooth transitions and modern typography.'
            ),
            createTheme(
                'zen',
                'Zen',
                'Minimalist theme focused on content readability.'
            )
        ]
    };

    console.log('[WP-EXE Mock] Themes data initialized:', window.wpExeMockData.themes.themes.length, 'themes');
})();
