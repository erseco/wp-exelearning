# eXeLearning

![CI](https://img.shields.io/github/actions/workflow/status/erseco/wp-exelearning/ci.yml?label=CI)
[![codecov](https://codecov.io/gh/erseco/wp-exelearning/graph/badge.svg)](https://codecov.io/gh/erseco/wp-exelearning)
![WordPress Version](https://img.shields.io/badge/WordPress-6.1-blue)
![PHP Version](https://img.shields.io/badge/PHP-%3E%3D%208.0-8892bf)
![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)
![Downloads](https://img.shields.io/github/downloads/erseco/wp-exelearning/total)
![Last Commit](https://img.shields.io/github/last-commit/erseco/wp-exelearning)
![Open Issues](https://img.shields.io/github/issues/erseco/wp-exelearning)

WordPress plugin for eXeLearning content management. Upload, manage and embed eXeLearning `.elp` files directly in your WordPress site.

## Demo

Try eXeLearning instantly in your browser using WordPress Playground! Note that all changes will be lost when you close the browser window, as everything runs locally in your browser.

[<kbd> <br> Preview in WordPress Playground <br> </kbd>](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/erseco/wp-exelearning/refs/heads/main/blueprint.json)

## Features

- **ELP File Support**: Upload and manage eXeLearning `.elp` files through the WordPress Media Library
- **Automatic Extraction**: ELP files are automatically extracted and ready to display
- **Gutenberg Block**: Embed eXeLearning content using the native block editor
- **Shortcode Support**: Use `[exelearning id="123"]` to embed content in classic editor
- **Media Library Integration**: View ELP metadata directly in the media library
- **WP-CLI Support**: Manage ELP files via command line

## Installation

1. **Download the latest release** from the [GitHub Releases page](https://github.com/erseco/wp-exelearning/releases).
2. Upload the downloaded ZIP file to your WordPress site via **Plugins > Add New > Upload Plugin**.
3. Activate the plugin through the 'Plugins' menu in WordPress.

## Usage

### Uploading ELP Files

1. Go to **Media > Add New** in your WordPress admin
2. Upload your `.elp` file
3. The file will be automatically validated and extracted

### Embedding Content

**Using Gutenberg Block:**
1. Add a new block in the editor
2. Search for "eXeLearning"
3. Select an ELP file from your media library

**Using Shortcode:**
```
[exelearning id="123"]
```
Replace `123` with the attachment ID of your ELP file.

### Viewing ELP Files

- Go to **Media > Library** to see all uploaded files
- ELP files display metadata including license, language, and resource type
- Click on an ELP file to preview its content

## Development

For development, you can bring up a local WordPress environment with the plugin pre-installed:

```bash
make up
```

This will start a Dockerized WordPress instance at [http://localhost:8888](http://localhost:8888) with credentials:
- Username: `admin`
- Password: `password`

### Available Commands

```bash
make up          # Start development environment
make down        # Stop containers
make test        # Run PHPUnit tests
make lint        # Check code style
make fix         # Auto-fix code style
```

## WP-CLI Commands

```bash
# List all ELP files
wp exelearning list

# Delete an ELP file
wp exelearning delete --id=123
```

## Requirements

- WordPress 6.1 or higher
- PHP 8.0 or higher

## License

This plugin is licensed under the GPL v3 or later.

## Credits

Developed by [INTEF](https://intef.es/).
