# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

eXeLearning is a WordPress plugin for managing eXeLearning .elp files. It allows uploading, extracting, and embedding eXeLearning content in WordPress pages and posts.

**Key principle**: The plugin works directly with WordPress **attachments** (Media Library). No custom post type is needed - ELP files are uploaded as attachments and their metadata is stored in attachment post meta.

## Development Commands

### Environment Setup
```bash
make up                    # Start wp-env Docker containers (http://localhost:8888, admin/password)
make down                  # Stop containers
make clean                 # Reset WordPress environment
make destroy               # Completely remove wp-env
```

### Testing
```bash
make test                  # Run all PHPUnit tests
make test FILTER=MyTest    # Run tests matching pattern
```

### Code Quality
```bash
make fix                   # Auto-fix code style with PHPCBF
make lint                  # Check code style with PHPCS
```

### Translations
```bash
make pot                   # Generate .pot file
make po                    # Update .po files
make mo                    # Generate .mo files
```

## Architecture

### How It Works

1. User uploads `.elp` file to Media Library
2. Plugin validates the file using ElpParser
3. File is extracted to `wp-content/uploads/exelearning/{sha1_hash}/`
4. Metadata from ELP is stored in attachment post meta
5. Content is embedded via shortcode or Gutenberg block

### Core Components

- **exelearning.php**: Main plugin file
- **includes/class-exelearning.php**: Core class that initializes all components
- **includes/class-hooks.php**: WordPress action registration
- **includes/class-filters.php**: WordPress filter registration

### ELP File Handling

- **includes/class-elp-upload-handler.php**: Handles ELP file upload and extraction
- **includes/class-elp-file-service.php**: Validates ELP files using ElpParser
- **includes/class-elp-upload-block.php**: Gutenberg block for embedding ELP content
- **includes/class-mime-types.php**: Registers `.elp` MIME type for WordPress uploads
- **includes/vendor/exelearning/elp-parser/**: ELP file parser library

### Admin

- **admin/class-admin-settings.php**: Settings page
- **admin/class-admin-upload.php**: Admin upload handler
- **admin/class-admin-wpcli.php**: WP-CLI commands

### Public/Frontend

- **public/class-shortcodes.php**: `[exelearning]` shortcode handler
- **includes/integrations/class-media-library.php**: Media library integration (columns, meta boxes)

## Data Storage

ELP files use WordPress attachments. Metadata is stored in post meta:

| Meta Key | Description |
|----------|-------------|
| `_exelearning_title` | Title from ELP file |
| `_exelearning_description` | Description from ELP file |
| `_exelearning_license` | License information |
| `_exelearning_language` | Content language |
| `_exelearning_resource_type` | Learning resource type |
| `_exelearning_extracted` | SHA1 hash pointing to extraction folder |

## File Storage

When an ELP file is uploaded:
1. Original `.elp` file stored in Media Library
2. Extracted to `wp-content/uploads/exelearning/{sha1_hash}/`
3. Content accessible via `index.html` in extraction folder

## Key Patterns

- WordPress Coding Standards enforced via PHPCS
- Tests run inside wp-env container
- ELP files are ZIP archives with XML metadata
- No custom post type - uses WordPress attachments
