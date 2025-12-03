/**
 * Mock Translations Data for eXeLearning WordPress Integration
 *
 * This provides the response for /api/translations/{locale}/list
 * Contains basic UI translations for the editor.
 */

(function() {
    'use strict';

    // Initialize mock data namespace
    window.wpExeMockData = window.wpExeMockData || {};

    // English translations
    const translationsEN = {
        // General UI
        'save': 'Save',
        'cancel': 'Cancel',
        'close': 'Close',
        'delete': 'Delete',
        'edit': 'Edit',
        'add': 'Add',
        'remove': 'Remove',
        'ok': 'OK',
        'yes': 'Yes',
        'no': 'No',
        'confirm': 'Confirm',
        'loading': 'Loading...',
        'error': 'Error',
        'warning': 'Warning',
        'info': 'Information',
        'success': 'Success',

        // Menu
        'file': 'File',
        'new': 'New',
        'open': 'Open',
        'save_as': 'Save As',
        'export': 'Export',
        'import': 'Import',
        'print': 'Print',
        'properties': 'Properties',
        'preferences': 'Preferences',

        // Structure
        'page': 'Page',
        'pages': 'Pages',
        'add_page': 'Add Page',
        'delete_page': 'Delete Page',
        'rename_page': 'Rename Page',
        'duplicate_page': 'Duplicate Page',
        'move_up': 'Move Up',
        'move_down': 'Move Down',

        // Blocks
        'block': 'Block',
        'blocks': 'Blocks',
        'add_block': 'Add Block',
        'delete_block': 'Delete Block',
        'block_properties': 'Block Properties',

        // iDevices
        'idevice': 'iDevice',
        'idevices': 'iDevices',
        'add_idevice': 'Add iDevice',
        'delete_idevice': 'Delete iDevice',
        'idevice_properties': 'iDevice Properties',

        // Themes
        'theme': 'Theme',
        'themes': 'Themes',
        'select_theme': 'Select Theme',
        'apply_theme': 'Apply Theme',

        // Export formats
        'export_html5': 'Export as HTML5',
        'export_scorm12': 'Export as SCORM 1.2',
        'export_scorm2004': 'Export as SCORM 2004',
        'export_epub3': 'Export as EPUB3',
        'export_ims': 'Export as IMS Content Package',

        // Properties
        'title': 'Title',
        'author': 'Author',
        'description': 'Description',
        'license': 'License',
        'language': 'Language',

        // Visibility
        'visible': 'Visible',
        'hidden': 'Hidden',
        'teacher_only': 'Teacher Only',

        // Messages
        'unsaved_changes': 'You have unsaved changes. Do you want to save before closing?',
        'confirm_delete': 'Are you sure you want to delete this?',
        'delete_page_confirm': 'Are you sure you want to delete this page and all its content?',
        'delete_block_confirm': 'Are you sure you want to delete this block and all its iDevices?',
        'delete_idevice_confirm': 'Are you sure you want to delete this iDevice?',

        // Editor
        'edit_content': 'Edit Content',
        'save_content': 'Save Content',
        'preview': 'Preview',
        'source_code': 'Source Code',

        // WordPress specific
        'save_to_wordpress': 'Save to WordPress',
        'close_editor': 'Close Editor',
        'download_file': 'Download File'
    };

    // Spanish translations
    const translationsES = {
        // General UI
        'save': 'Guardar',
        'cancel': 'Cancelar',
        'close': 'Cerrar',
        'delete': 'Eliminar',
        'edit': 'Editar',
        'add': 'A\u00f1adir',
        'remove': 'Quitar',
        'ok': 'Aceptar',
        'yes': 'S\u00ed',
        'no': 'No',
        'confirm': 'Confirmar',
        'loading': 'Cargando...',
        'error': 'Error',
        'warning': 'Advertencia',
        'info': 'Informaci\u00f3n',
        'success': '\u00c9xito',

        // Menu
        'file': 'Archivo',
        'new': 'Nuevo',
        'open': 'Abrir',
        'save_as': 'Guardar como',
        'export': 'Exportar',
        'import': 'Importar',
        'print': 'Imprimir',
        'properties': 'Propiedades',
        'preferences': 'Preferencias',

        // Structure
        'page': 'P\u00e1gina',
        'pages': 'P\u00e1ginas',
        'add_page': 'A\u00f1adir p\u00e1gina',
        'delete_page': 'Eliminar p\u00e1gina',
        'rename_page': 'Renombrar p\u00e1gina',
        'duplicate_page': 'Duplicar p\u00e1gina',
        'move_up': 'Mover arriba',
        'move_down': 'Mover abajo',

        // Blocks
        'block': 'Bloque',
        'blocks': 'Bloques',
        'add_block': 'A\u00f1adir bloque',
        'delete_block': 'Eliminar bloque',
        'block_properties': 'Propiedades del bloque',

        // iDevices
        'idevice': 'iDispositivo',
        'idevices': 'iDispositivos',
        'add_idevice': 'A\u00f1adir iDispositivo',
        'delete_idevice': 'Eliminar iDispositivo',
        'idevice_properties': 'Propiedades del iDispositivo',

        // Themes
        'theme': 'Tema',
        'themes': 'Temas',
        'select_theme': 'Seleccionar tema',
        'apply_theme': 'Aplicar tema',

        // Export formats
        'export_html5': 'Exportar como HTML5',
        'export_scorm12': 'Exportar como SCORM 1.2',
        'export_scorm2004': 'Exportar como SCORM 2004',
        'export_epub3': 'Exportar como EPUB3',
        'export_ims': 'Exportar como paquete IMS',

        // Properties
        'title': 'T\u00edtulo',
        'author': 'Autor',
        'description': 'Descripci\u00f3n',
        'license': 'Licencia',
        'language': 'Idioma',

        // Visibility
        'visible': 'Visible',
        'hidden': 'Oculto',
        'teacher_only': 'Solo profesor',

        // Messages
        'unsaved_changes': 'Tiene cambios sin guardar. \u00bfDesea guardar antes de cerrar?',
        'confirm_delete': '\u00bfEst\u00e1 seguro de que desea eliminar esto?',
        'delete_page_confirm': '\u00bfEst\u00e1 seguro de que desea eliminar esta p\u00e1gina y todo su contenido?',
        'delete_block_confirm': '\u00bfEst\u00e1 seguro de que desea eliminar este bloque y todos sus iDispositivos?',
        'delete_idevice_confirm': '\u00bfEst\u00e1 seguro de que desea eliminar este iDispositivo?',

        // Editor
        'edit_content': 'Editar contenido',
        'save_content': 'Guardar contenido',
        'preview': 'Vista previa',
        'source_code': 'C\u00f3digo fuente',

        // WordPress specific
        'save_to_wordpress': 'Guardar en WordPress',
        'close_editor': 'Cerrar editor',
        'download_file': 'Descargar archivo'
    };

    // Translation data by locale
    const translations = {
        'en': translationsEN,
        'en_US': translationsEN,
        'en_GB': translationsEN,
        'es': translationsES,
        'es_ES': translationsES,
        'es_MX': translationsES
    };

    /**
     * Get translations for a locale
     */
    window.wpExeMockData.getTranslations = function(locale) {
        // Handle undefined or null locale
        if (!locale) {
            locale = window.wpExeMockConfig?.locale || 'en';
        }

        // Normalize locale (e.g., es_ES -> es)
        const shortLocale = String(locale).split('_')[0];

        // Return translations for locale, falling back to English
        const trans = translations[locale] || translations[shortLocale] || translationsEN;

        return {
            locale: locale,
            translations: trans
        };
    };

    console.log('[WP-EXE Mock] Translations data initialized');
})();
