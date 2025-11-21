# Scroll Animation Renderer

A lightweight, dependency-free library for ultra-smooth scroll-driven canvas animations.

## Features

- 🎞 Frame-by-frame scroll animations using Canvas
- 🖼 Image sequence support (PNG/JPG)
- 🧩 Subframe extraction for large spritesheets
- 🎬 MP4 decoding via the modern `VideoDecoder` API
- ⚡ High performance thanks to `ImageBitmap` and caching
- 📦 Zero dependencies
- 🔌 Easy integration via a custom HTML tag: `<scroll-animation>`

## Installation

### npm
```
npm install your-package-name
```

### CDN / Static
```
<script src="scroll-animation.js" type="module"></script>
```

## Usage

1. Add the custom element:
   ```html
   <scroll-animation
       section-id="hero"
       animation-id="product-spin"
       host="https://your-host.com/animations">
   </scroll-animation>
   ```

2. Create an `animation.json` alongside the frame assets:

```
product-spin/
├─ 0001.png
├─ 0002.png
├─ ...
└─ animation.json
```

Example `animation.json`:

```json
[
  {
    "imageSrcUrl": "",
    "imgSize": [1920, 1080],
    "numFrames": 120,
    "files": [".png"],
    "numSourceFiles": 120,
    "reverse": false
  }
]
```

This configuration describes how the animation should be loaded and rendered.

## Folder Structure (example)

```
my-app/
├─ animations/
│  └─ product-spin/
│     ├─ 0001.png
│     ├─ 0002.png
│     ├─ ...
│     └─ animation.json
├─ src/
│  └─ main.js
└─ index.html
```

## How it Works

The library:

- Loads all image frames or decodes video frames
- Splits render files into subframes if needed
- Sorts and caches frames globally
- Maps scroll position → frame index
- Renders the selected frame to a `<canvas>` inside your `<scroll-animation>` element

### Frame Calculation

```js
getFrameIndex() {
  const currentScrollPosition =
    (-this.scrollSection.getBoundingClientRect().top) /
    ((this.height - this.canvasElement.clientHeight) - window.innerHeight);

  return Math.round(currentScrollPosition * this.numFrames);
}
```

## MP4 Video Support

If your animation is a single `.mp4` file, the library uses the `VideoDecoder` API:

```js
const videoDecoder = new VideoDecoder({
  output: (frame) => {
    createImageBitmap(frame).then((bitmap) => {
      bitmap.index = images.length;
      images.push(bitmap);
    });
  },
  error: console.error
});
```

This lets you deliver high-quality scroll animations without storing hundreds of images.

## Example Demo

```html
<section id="hero" style="height: 300vh;">
    <scroll-animation
        section-id="hero"
        animation-id="product-spin"
        host="/animations">
    </scroll-animation>
</section>

<script type="module">
    import './scroll-animation.js';
</script>
```

## Options (from animation.json)

| Key             | Type       | Description                     |
|-----------------|------------|---------------------------------|
| imageSrcUrl     | `string`   | Base path for frames            |
| imgSize         | `[w,h]`   | Frame width & height            |
| numFrames       | `number`   | Total frames                    |
| numSourceFiles  | `number`   | Number of source files          |
| files           | `string[]` | Filenames or extension          |
| reverse         | `boolean`  | Play animation backwards        |
| range           | `[a,b]`   | Scroll range control            |
| id              | `string`   | Cache identifier                |

## Custom Element API

Your `<scroll-animation>` tag supports these attributes:

| Attribute     | Purpose                                   |
|---------------|-------------------------------------------|
| section-id    | Section tied to the scroll position        |
| animation-id  | Folder name / animation config identifier |
| host          | Server location of your animation assets  |

Example:

```html
<scroll-animation section-id="intro" animation-id="car" host="/assets/animations"></scroll-animation>
```

## Development

Build and test commands depend on your project setup; add more if needed.

```
npm run dev
npm run build
```

## Contributing

Contributions, issues, and feature requests are welcome — feel free to open a PR or start a discussion.

## License

MIT License — free to use, modify, and distribute.

## Support

If you find this library useful, please consider:

- ⭐ Starring the repo
- 🐛 Reporting issues
- 💬 Suggesting new features
