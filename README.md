# auto-slice

AI-powered image segmentation and background processing CLI tool.

Automatically split images into individual transparent assets, remove or replace backgrounds, and crop with smart detection.

## Installation

```bash
npm install -g auto-slice
# or
bun install -g auto-slice
```

## Commands

### `auto-slice segment <input>`

Split an image into individual elements (transparent background assets).

```bash
auto-slice segment ./image.png
auto-slice segment ./image.png -o ./output/ -s 0.4 --padding 8
```

### `auto-slice bg-remove <input>`

Remove background from an image (produces transparent PNG).

```bash
auto-slice bg-remove ./image.png
auto-slice bg-remove ./image.png -o ./nobg.png -s 0.3
```

### `auto-slice bg-replace <input> [color]`

Replace background color of an image.

```bash
auto-slice bg-replace ./image.png '#ff0000'
auto-slice bg-replace ./image.png blue -o ./output.png
```

### `auto-slice crop <input>`

Crop or resize an image.

```bash
auto-slice crop ./image.png -W 800 -H 600
auto-slice crop ./image.png --trim
auto-slice crop ./image.png -W 400 -g north
```

### `auto-slice batch <operation> <input-dir>`

Process multiple images in a directory.

```bash
auto-slice batch bg-remove ./images/ -o ./output/
auto-slice batch bg-replace ./images/ --bg-color '#00ff00' -j 8
auto-slice batch crop ./images/ -W 512 -H 512
auto-slice batch segment ./images/ -o ./segments/
```

## Options

| Option | Description |
|---|---|
| `-o, --output <path>` | Output path |
| `-f, --format <format>` | Output format: png, jpg |
| `-s, --sensitivity <number>` | Background detection sensitivity (0-1) |
| `-c, --config <path>` | Path to config file |
| `-v, --verbose` | Verbose output |
| `--log-level <level>` | Log level: debug, info, warn, error |

## Configuration

Create a `.auto-slice.json` in your project root or home directory:

```json
{
  "outputDir": "./output",
  "format": "png",
  "quality": 90,
  "bgSensitivity": 0.3,
  "bgColor": "#ffffff",
  "concurrency": 4,
  "verbose": false
}
```

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
