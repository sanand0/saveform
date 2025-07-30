# saveform

[![npm version](https://img.shields.io/npm/v/saveform.svg)](https://www.npmjs.com/package/saveform)
[![license](https://img.shields.io/npm/l/saveform.svg)](https://github.com/sanand0/saveform/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/saveform)](https://bundlephobia.com/package/saveform)

> Lightweight solution to persist form field values across page reloads

Automatically save HTML form field values to localStorage or sessionStorage and restore them when the user returns to the page.

- Tiny footprint (~2KB minified and gzipped)
- No dependencies
- Modern ESM format
- Works with all form elements (input, select, textarea, etc.)
- Flexible field selection/exclusion
- Custom storage triggers (input, change, or both)
- Support for custom value accessors and setters
- Configurable storage key prefix

## Installation

Install via `npm`:

```bash
npm install saveform
```

Use locally as an ES module:

```html
<script type="module">
  import saveform from "./node_modules/saveform/dist/saveform.min.js";
  saveform("#my-form");
</script>
```

Use via CDN as an ES Module:

```html
<script type="module">
  import saveform from "https://cdn.jsdelivr.net/npm/saveform@1.3";
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
  prefix: "myapp_", // prefix for storage keys. Default: "saveform_"
  events: ["change"], // only save on change events
});
```

On any form `change`, this persists all fields that have a `name="..."` or an `id="..."` in `sessionStorage` (default: `localStorage`) as a JSON object with the key `${prefix}${formId}`, e.g. `myapp_my-form`. `formId` is the form's `id=` else `name=` else a random key.

By default, `type="password"` and `type="file"` fields are excluded. To include password fields, use:

```js
saveform("#my-form", { exclude: '[type="file"]' });
```

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

`save()` merges the current form values with any data already in storage. This ensures values
from fields that were removed from the DOM (for example, in dynamic forms) remain intact.

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

## Development

```bash
git clone https://github.com/sanand0/saveform.git
cd saveform

npm install
npm run lint && npm run build && npm test

npm publish
git commit . -m"$COMMIT_MSG"; git tag $VERSION; git push --follow-tags
```

## Release notes

- [1.3.0](https://npmjs.com/package/saveform/v/1.3.0): 30 Jul 2025. Standardized package.json & README.md, move saveform.min.js into dist/
- [1.2.2](https://npmjs.com/package/saveform/v/1.2.2): 5 Jun 2025. Document how to save password / hidden fields, expand test coverage
- [1.2.0](https://npmjs.com/package/saveform/v/1.2.0): 22 May 2025. Fall back to `id` attribute if `name` is missing
- [1.1.1](https://npmjs.com/package/saveform/v/1.1.1): 21 May 2025. Renamed `"all"` option to `"*"`. Added tests and docs
- [1.0.0](https://npmjs.com/package/saveform/v/1.0.0): 21 May 2025. Initial release

## License

[MIT](LICENSE)
