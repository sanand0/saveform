# saveform

> Lightweight solution to persist form field values across page reloads

[![npm version](https://img.shields.io/npm/v/saveform.svg)](https://www.npmjs.com/package/saveform)
[![license](https://img.shields.io/npm/l/saveform.svg)](https://github.com/sanand0/saveform/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/saveform)](https://bundlephobia.com/package/saveform)

Automatically save HTML form field values to localStorage or sessionStorage and restore them when the user returns to the page.

## Features

- Tiny footprint (~2KB minified and gzipped)
- No dependencies
- Modern ESM format
- Works with all form elements (input, select, textarea, etc.)
- Flexible field selection/exclusion
- Custom storage triggers (input, change, or both)
- Support for custom value accessors and setters
- Configurable storage key prefix

## Install

Install via `npm`:

```bash
npm install saveform@1.2
```

Use locally as an ES module:

```html
<script type="module">
  import saveform from "./node_modules/saveform/saveform.min.js";
  saveform("#my-form");
</script>
```

Use via CDN as an ES Module:

```html
<script type="module">
  import saveform from "https://cdn.jsdelivr.net/npm/saveform@1.2";
  saveform("#my-form");
</script>
```

## Usage

```js
// One-liner: automatically save & restore form values with default settings
import saveform from "saveform";
saveform("#my-form");

// With options
saveform("#my-form", {
  storage: sessionStorage, // use sessionStorage instead of localStorage
  prefix: "myapp_", // prefix for storage keys
  events: ["change"], // only save on change events
});
```

This saves all fields that have a `name="..."` or an `id="..."`.

## API

### saveform(element, options)

Creates a new saveform instance and immediately restores any saved values.

#### element

Type: `HTMLElement` | `string`

The form element or selector string.

#### options

Type: `Object`

| Option      | Type                   | Default                              | Description                          |
| ----------- | ---------------------- | ------------------------------------ | ------------------------------------ |
| `storage`   | `Storage`              | `localStorage`                       | Storage mechanism to use             |
| `prefix`    | `string`               | `'saveform_'`                        | Prefix for storage keys              |
| `events`    | `string[]`             | `['input', 'change']`                | Events that trigger saving           |
| `fields`    | `string` \| `Function` | `'*'`                                | Fields to include (`*` includes all) |
| `exclude`   | `string` \| `Function` | `'[type="password"], [type="file"]'` | Fields to exclude                    |
| `accessors` | `Object`               | `{}`                                 | Custom value getters                 |
| `setters`   | `Object`               | `{}`                                 | Custom value setters                 |

### Methods

Each saveform instance returns an object with these methods:

#### save()

Manually save current form values.

```js
const form = saveform("#my-form");
form.save();
```

#### restore()

Manually restore saved values.

```js
form.restore();
```

#### clear()

Clear all saved values.

```js
form.clear();
```

#### destroy()

Remove all event listeners and stop tracking.

```js
form.destroy();
```

## Advanced Usage

### Field Selection

Control which fields are saved:

```js
// Only save text and email inputs
saveform("#my-form", {
  fields: 'input[type="text"], input[type="email"]',
});

// Exclude specific fields
saveform("#my-form", {
  exclude: ".sensitive, [data-no-save]",
});

// Use functions for complex logic
saveform("#my-form", {
  fields: (field) => field.dataset.save === "true",
  exclude: (field) => field.name.startsWith("private_"),
});
```

### Custom Value Handlers

Define custom ways to get/set values:

```js
saveform("#my-form", {
  accessors: {
    // Custom getter for tag inputs (comma-separated values)
    ".tag-input": (field) => field.value.split(",").map((t) => t.trim()),

    // Get selected options from multi-select
    "select[multiple]": (field) => Array.from(field.selectedOptions).map((opt) => opt.value),
  },

  setters: {
    // Custom setter for tag inputs
    ".tag-input": (field, value) => (field.value = Array.isArray(value) ? value.join(", ") : value),
  },
});
```

## Browser Support

Supports all modern browsers with ES modules support.

## License

[MIT](LICENSE)
