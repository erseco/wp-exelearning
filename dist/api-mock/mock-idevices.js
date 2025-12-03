/**
 * Mock iDevices Data for eXeLearning WordPress Integration
 *
 * This provides the response for /api/idevice/installed
 * Contains all available iDevices from the base installation.
 */

(function() {
    'use strict';

    // Initialize mock data namespace
    window.wpExeMockData = window.wpExeMockData || {};

    // Base URL for iDevice files
    const baseUrl = window.wpExeMockConfig?.baseUrl || '';
    const idevicesBasePath = baseUrl + '/files/perm/idevices/base';

    /**
     * Helper to create iDevice entry
     * Note: editionJs/Css and exportJs/Css should be just filenames, not full paths
     * The full path is constructed by idevice.js using: ${this.pathEdition}${script}
     */
    function createIdevice(name, title, category, iconName, componentType = 'html') {
        const iconType = iconName ? 'img' : 'exe-icon';
        // Icon URL is relative to the iDevice directory
        const iconUrl = iconName ? `${name}-icon.svg` : null;

        return {
            name: name,
            dirName: name,
            title: title,
            cssClass: name,
            category: category,
            // URL is the path relative to the server root, will be prefixed with symfonyURL
            url: `/files/perm/idevices/base/${name}`,
            enabled: true,
            visible: true,
            componentType: componentType,
            icon: {
                name: iconName || name,
                type: iconType,
                url: iconUrl
            },
            // Just the filenames, not full paths
            editionJs: [`${name}.js`],
            editionCss: [`${name}.css`],
            exportJs: [`${name}.js`],
            exportCss: [`${name}.css`]
        };
    }

    window.wpExeMockData.idevices = {
        idevices: [
            // Information and presentation
            createIdevice('text', 'Text', 'Information and presentation', 'text-icon.svg', 'json'),
            createIdevice('image-gallery', 'Image Gallery', 'Information and presentation', 'image-gallery-icon.svg'),
            createIdevice('interactive-video', 'Interactive Video', 'Information and presentation', 'interactive-video-icon.svg'),
            createIdevice('external-website', 'External Website', 'Information and presentation', 'external-website-icon.svg'),
            createIdevice('map', 'Map', 'Information and presentation', 'map-icon.svg'),
            createIdevice('download-source-file', 'Download Source File', 'Information and presentation', 'download-source-file-icon.svg'),
            createIdevice('attached-files', 'Attached Files', 'Information and presentation', 'attached-files-icon.svg'),
            createIdevice('select-media-files', 'Select Media Files', 'Information and presentation', 'select-media-files-icon.svg'),

            // Activities and games
            createIdevice('crossword', 'Crossword', 'Activities and games', 'crossword-icon.svg'),
            createIdevice('word-search', 'Word Search', 'Activities and games', 'word-search-icon.svg'),
            createIdevice('puzzle', 'Puzzle', 'Activities and games', 'puzzle-icon.svg'),
            createIdevice('flipcards', 'Flip Cards', 'Activities and games', 'flipcards-icon.svg'),
            createIdevice('hidden-image', 'Hidden Image', 'Activities and games', 'hidden-image-icon.svg'),
            createIdevice('magnifier', 'Magnifier', 'Activities and games', 'magnifier-icon.svg'),
            createIdevice('beforeafter', 'Before/After', 'Activities and games', 'beforeafter-icon.svg'),
            createIdevice('trivial', 'Trivial', 'Activities and games', 'trivial-icon.svg'),
            createIdevice('az-quiz-game', 'A-Z Quiz Game', 'Activities and games', 'az-quiz-game-icon.svg'),
            createIdevice('padlock', 'Padlock', 'Activities and games', 'padlock-icon.svg'),

            // Questions and exercises
            createIdevice('quick-questions', 'Quick Questions', 'Questions and exercises', 'quick-questions-icon.svg'),
            createIdevice('quick-questions-multiple-choice', 'Multiple Choice Questions', 'Questions and exercises', 'quick-questions-multiple-choice-icon.svg'),
            createIdevice('quick-questions-video', 'Video Questions', 'Questions and exercises', 'quick-questions-video-icon.svg'),
            createIdevice('trueorfalse', 'True or False', 'Questions and exercises', 'trueorfalse-icon.svg'),
            createIdevice('complete', 'Complete', 'Questions and exercises', 'complete-icon.svg'),
            createIdevice('guess', 'Guess', 'Questions and exercises', 'guess-icon.svg'),
            createIdevice('identify', 'Identify', 'Questions and exercises', 'identify-icon.svg'),
            createIdevice('discover', 'Discover', 'Questions and exercises', 'discover-icon.svg'),

            // Ordering and classification
            createIdevice('dragdrop', 'Drag and Drop', 'Ordering and classification', 'dragdrop-icon.svg'),
            createIdevice('classify', 'Classify', 'Ordering and classification', 'classify-icon.svg'),
            createIdevice('sort', 'Sort', 'Ordering and classification', 'sort-icon.svg'),
            createIdevice('relate', 'Relate', 'Ordering and classification', 'relate-icon.svg'),
            createIdevice('scrambled-list', 'Scrambled List', 'Ordering and classification', 'scrambled-list-icon.svg'),

            // Mathematics and science
            createIdevice('mathematicaloperations', 'Mathematical Operations', 'Mathematics and science', 'mathematicaloperations-icon.svg'),
            createIdevice('mathproblems', 'Math Problems', 'Mathematics and science', 'mathproblems-icon.svg'),
            createIdevice('geogebra-activity', 'GeoGebra Activity', 'Mathematics and science', 'geogebra-activity-icon.svg'),
            createIdevice('periodic-table', 'Periodic Table', 'Mathematics and science', 'periodic-table-icon.svg'),

            // Organization and structure
            createIdevice('casestudy', 'Case Study', 'Organization and structure', 'casestudy-icon.svg'),
            createIdevice('challenge', 'Challenge', 'Organization and structure', 'challenge-icon.svg'),
            createIdevice('checklist', 'Checklist', 'Organization and structure', 'checklist-icon.svg'),
            createIdevice('example', 'Example', 'Organization and structure', 'example-icon.svg'),
            createIdevice('udl-content', 'UDL Content', 'Organization and structure', 'udl-content-icon.svg'),

            // Evaluation
            createIdevice('form', 'Form', 'Evaluation', 'form-icon.svg'),
            createIdevice('rubric', 'Rubric', 'Evaluation', 'rubric-icon.svg'),
            createIdevice('progress-report', 'Progress Report', 'Evaluation', 'progress-report-icon.svg'),

            // Collaborative
            createIdevice('collaborative-editing', 'Collaborative Editing', 'Collaborative', 'collaborative-editing-icon.svg')
        ]
    };

    console.log('[WP-EXE Mock] iDevices data initialized:', window.wpExeMockData.idevices.idevices.length, 'iDevices');
})();
