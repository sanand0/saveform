/**
 * saveform - Lightweight solution to persist form field values across page reloads
 *
 * @param {HTMLElement|string} element - Form element or CSS selector
 * @param {Object} options - Configuration options
 * @returns {Object} Public API methods
 */
export default function saveform(element, options = {}) {
  // Default options
  const defaults = {
    storage: localStorage,
    prefix: "saveform_",
    events: ["input", "change"],
    fields: "*",
    exclude: '[type="password"], [type="file"]',
    accessors: {},
    setters: {},
  };

  // Merge options with defaults
  const config = { ...defaults, ...options };

  // Normalize element (convert string selector to element)
  const form = typeof element === "string" ? document.querySelector(element) : element;

  if (!form || !(form instanceof HTMLElement)) {
    throw new Error("saveform: Invalid form element");
  }

  // Get unique ID for the form
  const formId = form.id || form.name || generateFormId(form);

  // Storage key for this form
  const storageKey = `${config.prefix}${formId}`;

  // Default field accessors
  const defaultAccessors = {
    'input[type="checkbox"]': (field) => field.checked,
    'input[type="radio"]': (field) => (field.checked ? field.value : undefined),
    "select[multiple]": (field) => Array.from(field.selectedOptions).map((opt) => opt.value),
    default: (field) => field.value,
  };

  // Default field setters
  const defaultSetters = {
    'input[type="checkbox"]': (field, value) => {
      field.checked = !!value;
    },
    'input[type="radio"]': (field, value) => {
      if (field.value === value) field.checked = true;
    },
    "select[multiple]": (field, values) => {
      if (Array.isArray(values)) {
        Array.from(field.options).forEach((opt) => {
          opt.selected = values.includes(opt.value);
        });
      }
    },
    default: (field, value) => {
      field.value = value ?? "";
    },
  };

  // Combine default accessors/setters with custom ones
  const accessors = { ...defaultAccessors, ...config.accessors };
  const setters = { ...defaultSetters, ...config.setters };

  // Get appropriate accessor for a field
  function getAccessor(field) {
    for (const selector in accessors) {
      if (selector === "default") continue;
      if (field.matches(selector)) return accessors[selector];
    }
    return accessors.default;
  }

  // Get appropriate setter for a field
  function getSetter(field) {
    for (const selector in setters) {
      if (selector === "default") continue;
      if (field.matches(selector)) return setters[selector];
    }
    return setters.default;
  }

  // Find all fields to track
  function findFields() {
    const allFields = Array.from(form.elements);

    return allFields.filter((field) => {
      // Skip fields without name or ID
      if (!field.name && !field.id) return false;

      // Handle inclusion criteria
      if (config.fields !== "*") {
        if (typeof config.fields === "string" && !field.matches(config.fields)) return false;
        if (typeof config.fields === "function" && !config.fields(field)) return false;
      }

      // Handle exclusion criteria
      if (config.exclude) {
        if (typeof config.exclude === "string" && field.matches(config.exclude)) return false;
        if (typeof config.exclude === "function" && config.exclude(field)) return false;
      }

      return true;
    });
  }

  // Generate a unique ID for forms without id/name
  function generateFormId(form) {
    const formIndex = Array.from(document.forms).indexOf(form);
    return `form_${formIndex >= 0 ? formIndex : Math.random().toString(36).substring(2, 7)}`;
  }

  // Save values to storage
  function save() {
    const fields = findFields();
    let data = {};
    try {
      data = JSON.parse(config.storage.getItem(storageKey) || "{}");
    } catch {}

    // Collect values from all fields
    fields.forEach((field) => {
      const accessor = getAccessor(field);
      const value = accessor(field);

      // Skip undefined values (unselected radio buttons)
      if (value === undefined) return;

      data[field.name || field.id] = value;
    });

    // Save to storage
    config.storage.setItem(storageKey, JSON.stringify(data));
    return data;
  }

  // Restore values from storage
  function restore() {
    const storedJson = config.storage.getItem(storageKey);
    if (!storedJson) return null;

    let data;
    try {
      data = JSON.parse(storedJson);
    } catch (e) {
      // Invalid JSON, clear it
      config.storage.removeItem(storageKey);
      return null;
    }

    // Apply values to fields
    const fields = findFields();
    const restoredFields = [];

    fields.forEach((field) => {
      if (data[field.name || field.id] !== undefined) {
        const setter = getSetter(field);
        setter(field, data[field.name || field.id]);
        restoredFields.push(field.name || field.id);
      }
    });

    return restoredFields;
  }

  // Clear stored values
  function clear() {
    config.storage.removeItem(storageKey);
  }

  // Set up event listeners
  const handlers = {};

  // Initialize
  config.events.forEach((eventType) => {
    handlers[eventType] = save;
    form.addEventListener(eventType, save);
  });

  // Remove event listeners
  function destroy() {
    Object.entries(handlers).forEach(([eventType, handler]) => {
      form.removeEventListener(eventType, handler);
    });
  }

  // Restore values immediately
  restore();

  // Public API
  return {
    save,
    restore,
    clear,
    destroy,
  };
}
