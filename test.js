/**
 * Test suite for saveform library
 */
import tap from "tap";
import { JSDOM } from "jsdom";
import saveform from "./saveform.js";

// Set up global document for JSDOM
const setupDOM = (html) => {
  const dom = new JSDOM(html, { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.localStorage = {
    items: {},
    getItem(key) {
      return this.items[key] || null;
    },
    setItem(key, value) {
      this.items[key] = value;
    },
    removeItem(key) {
      delete this.items[key];
    },
    clear() {
      this.items = {};
    },
  };
  global.sessionStorage = {
    items: {},
    getItem(key) {
      return this.items[key] || null;
    },
    setItem(key, value) {
      this.items[key] = value;
    },
    removeItem(key) {
      delete this.items[key];
    },
    clear() {
      this.items = {};
    },
  };
  return dom;
};

// Basic form for testing
const basicFormHTML = `
  <form id="test-form">
    <input type="text" name="username" value="initial">
    <input type="email" name="email" value="test@example.com">
    <input type="password" name="password" value="secret">
    <textarea name="comments">Some text</textarea>
    <input type="checkbox" name="subscribe" checked>
    <select name="country">
      <option value="us">United States</option>
      <option value="ca" selected>Canada</option>
      <option value="uk">United Kingdom</option>
    </select>
    <select name="languages" multiple>
      <option value="js" selected>JavaScript</option>
      <option value="py">Python</option>
      <option value="rb" selected>Ruby</option>
    </select>
    <input type="radio" name="gender" value="male" checked>
    <input type="radio" name="gender" value="female">
    <input type="radio" name="gender" value="other">
    <button type="submit">Submit</button>
  </form>
`;

tap.test("saveform - basic initialization", (t) => {
  setupDOM(basicFormHTML);

  const form = saveform("#test-form");
  t.ok(form, "should return an object");
  t.type(form.save, "function", "should have save method");
  t.type(form.restore, "function", "should have restore method");
  t.type(form.clear, "function", "should have clear method");
  t.type(form.destroy, "function", "should have destroy method");

  t.end();
});

tap.test("saveform - form with no input elements", (t) => {
  const emptyFormHTML = `<form id="empty-form"></form>`;
  setupDOM(emptyFormHTML);
  global.localStorage.clear();

  const formInstance = saveform("#empty-form", {
    // Using a function for 'fields' to ensure related logic paths are tested,
    // though it won't be called if there are no fields.
    fields: (field) => field.name === "nonexistent",
  });

  const savedData = formInstance.save();
  t.same(savedData, {}, "should return an empty object for a form with no fields");

  const storedJson = global.localStorage.getItem("saveform_empty-form");
  t.equal(storedJson, "{}", "localStorage should contain an empty JSON object string");

  // Also test restore path
  const restoredFields = formInstance.restore();
  t.same(restoredFields, [], "restore should return empty array for form with no fields and empty storage");
  
  global.localStorage.setItem("saveform_empty-form", JSON.stringify({ somekey: "somevalue"}));
  const restoredFieldsWithData = formInstance.restore();
  t.same(restoredFieldsWithData, [], "restore should return empty array for form with no fields even if storage has data");


  t.end();
});

tap.test("saveform - initialization with invalid selector", (t) => {
  setupDOM(basicFormHTML);

  t.throws(
    () => saveform("#non-existent-form"),
    { message: "saveform: Invalid form element" },
    "should throw with invalid form selector",
  );

  t.end();
});

tap.test("saveform - initialization with element", (t) => {
  setupDOM(basicFormHTML);

  const formEl = document.getElementById("test-form");
  const form = saveform(formEl);
  t.ok(form, "should initialize with DOM element");

  t.end();
});

tap.test("saveform - save and restore basic fields", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form");

  // Verify save
  const savedData = form.save();
  t.ok(savedData, "should return saved data object");
  t.equal(savedData.username, "initial", "should save text input value");
  t.equal(savedData.email, "test@example.com", "should save email input value");
  t.equal(savedData.comments, "Some text", "should save textarea value");
  t.equal(savedData.country, "ca", "should save select value");
  t.same(savedData.languages, ["js", "rb"], "should save multiple select values");
  t.equal(savedData.subscribe, true, "should save checkbox state");
  t.equal(savedData.gender, "male", "should save radio button value");

  // Verify data is in localStorage
  const storedJson = global.localStorage.getItem("saveform_test-form");
  t.ok(storedJson, "should store data in localStorage");
  const storedData = JSON.parse(storedJson);
  t.same(storedData, savedData, "stored data should match returned data");

  // Change form values
  document.querySelector('[name="username"]').value = "changed";
  document.querySelector('[name="email"]').value = "new@example.com";
  document.querySelector('[name="country"]').value = "uk";
  document.querySelector('[name="subscribe"]').checked = false;
  document.querySelector('[name="gender"][value="female"]').checked = true;
  document.querySelector('[name="gender"][value="male"]').checked = false;

  // Restore from storage
  const restoredFields = form.restore();
  t.ok(restoredFields, "should return list of restored fields");

  // Verify values were restored
  t.equal(document.querySelector('[name="username"]').value, "initial", "should restore text input");
  t.equal(document.querySelector('[name="email"]').value, "test@example.com", "should restore email input");
  t.equal(document.querySelector('[name="country"]').value, "ca", "should restore select value");
  t.equal(document.querySelector('[name="subscribe"]').checked, true, "should restore checkbox state");
  t.equal(document.querySelector('[name="gender"][value="male"]').checked, true, "should restore radio button state");
  t.equal(
    document.querySelector('[name="gender"][value="female"]').checked,
    false,
    "should uncheck other radio buttons",
  );

  t.end();
});

tap.test("saveform - password fields exclusion", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form");
  form.save();

  const storedJson = global.localStorage.getItem("saveform_test-form");
  const storedData = JSON.parse(storedJson);

  t.notOk(storedData.hasOwnProperty("password"), "should not save password fields by default");

  t.end();
});

tap.test("saveform - sessionStorage option", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();
  global.sessionStorage.clear();

  const form = saveform("#test-form", {
    storage: global.sessionStorage,
  });

  form.save();

  const localStorageData = global.localStorage.getItem("saveform_test-form");
  t.notOk(localStorageData, "should not save to localStorage");

  const sessionStorageData = global.sessionStorage.getItem("saveform_test-form");
  t.ok(sessionStorageData, "should save to sessionStorage");

  t.end();
});

tap.test("saveform - prefix option", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form", {
    prefix: "custom_",
  });

  form.save();

  const defaultPrefixData = global.localStorage.getItem("saveform_test-form");
  t.notOk(defaultPrefixData, "should not use default prefix");

  const customPrefixData = global.localStorage.getItem("custom_test-form");
  t.ok(customPrefixData, "should use custom prefix");

  t.end();
});

tap.test("saveform - fields inclusion option with string selector", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form", {
    fields: 'input[type="text"], input[type="email"]',
  });

  form.save();

  const storedJson = global.localStorage.getItem("saveform_test-form");
  const storedData = JSON.parse(storedJson);

  t.ok(storedData.hasOwnProperty("username"), "should save text input");
  t.ok(storedData.hasOwnProperty("email"), "should save email input");
  t.notOk(storedData.hasOwnProperty("comments"), "should not save textarea");
  t.notOk(storedData.hasOwnProperty("country"), "should not save select");

  t.end();
});

tap.test("saveform - fields inclusion option with function", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form", {
    fields: (field) => ["username", "email"].includes(field.name),
  });

  form.save();

  const storedJson = global.localStorage.getItem("saveform_test-form");
  const storedData = JSON.parse(storedJson);

  t.ok(storedData.hasOwnProperty("username"), "should save fields that match function");
  t.ok(storedData.hasOwnProperty("email"), "should save fields that match function");
  t.notOk(storedData.hasOwnProperty("comments"), "should not save fields that don't match function");

  t.end();
});

tap.test("saveform - exclude option with string selector", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form", {
    exclude: "textarea, select",
  });

  form.save();

  const storedJson = global.localStorage.getItem("saveform_test-form");
  const storedData = JSON.parse(storedJson);

  t.ok(storedData.hasOwnProperty("username"), "should save non-excluded fields");
  t.ok(storedData.hasOwnProperty("email"), "should save non-excluded fields");
  t.notOk(storedData.hasOwnProperty("comments"), "should not save excluded textarea");
  t.notOk(storedData.hasOwnProperty("country"), "should not save excluded select");

  t.end();
});

tap.test("saveform - exclude option with function", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form", {
    exclude: (field) => ["comments", "country"].includes(field.name),
  });

  form.save();

  const storedJson = global.localStorage.getItem("saveform_test-form");
  const storedData = JSON.parse(storedJson);

  t.ok(storedData.hasOwnProperty("username"), "should save non-excluded fields");
  t.notOk(storedData.hasOwnProperty("comments"), "should not save fields that match exclude function");
  t.notOk(storedData.hasOwnProperty("country"), "should not save fields that match exclude function");

  t.end();
});

tap.test("saveform - custom accessors and setters", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form", {
    accessors: {
      '[name="username"]': (field) => field.value.toUpperCase(),
      '[name="email"]': (field) => ({ address: field.value, verified: false }),
    },
    setters: {
      '[name="username"]': (field, value) => (field.value = value.toLowerCase()),
      '[name="email"]': (field, value) => (field.value = value.address || value),
    },
  });

  form.save();

  const storedJson = global.localStorage.getItem("saveform_test-form");
  const storedData = JSON.parse(storedJson);

  t.equal(storedData.username, "INITIAL", "should use custom accessor for username");
  t.same(storedData.email, { address: "test@example.com", verified: false }, "should use custom accessor for email");

  // Change form values and save again to test restore with custom setters
  document.querySelector('[name="username"]').value = "changed";
  document.querySelector('[name="email"]').value = "new@example.com";

  form.restore();

  t.equal(document.querySelector('[name="username"]').value, "initial", "should use custom setter for username");
  t.equal(document.querySelector('[name="email"]').value, "test@example.com", "should use custom setter for email");

  t.end();
});

tap.test("saveform - events option", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  // Setup with only 'change' event
  const form = saveform("#test-form", {
    events: ["change"],
  });

  // Change value and dispatch input event
  const usernameField = document.querySelector('[name="username"]');
  usernameField.value = "changed-input";
  usernameField.dispatchEvent(new window.Event("input", { bubbles: true }));

  // Check if value was saved (it shouldn't be since we're only listening for 'change')
  let storedJson = global.localStorage.getItem("saveform_test-form");
  let storedData = JSON.parse(storedJson);

  t.notOk(storedData?.username, "should not save on input event when only change is specified");

  // Now dispatch change event
  usernameField.dispatchEvent(new window.Event("change", { bubbles: true }));

  // Check if value was saved now
  storedJson = global.localStorage.getItem("saveform_test-form");
  storedData = JSON.parse(storedJson);

  t.equal(storedData.username, "changed-input", "should save on change event");

  t.end();
});

tap.test("saveform - clear method", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form");

  form.save();

  // Verify data was saved
  let storedJson = global.localStorage.getItem("saveform_test-form");
  t.ok(storedJson, "should have saved data");

  // Clear the data
  form.clear();

  // Verify data was cleared
  storedJson = global.localStorage.getItem("saveform_test-form");
  t.notOk(storedJson, "should have cleared data");

  t.end();
});

tap.test("saveform - destroy method", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form");

  // Save initial state
  form.save();
  const initialJson = global.localStorage.getItem("saveform_test-form");

  // Call destroy
  form.destroy();

  // Change field value and trigger input event
  const usernameField = document.querySelector('[name="username"]');
  usernameField.value = "changed-after-destroy";
  usernameField.dispatchEvent(new window.Event("input", { bubbles: true }));

  // Check if value was updated in storage (it shouldn't be since we called destroy)
  const afterJson = global.localStorage.getItem("saveform_test-form");

  t.equal(initialJson, afterJson, "should not update storage after destroy");

  t.end();
});

tap.test("saveform - form without id or name", (t) => {
  // Setup DOM with a form without id or name
  setupDOM(`
    <form>
      <input type="text" name="username" value="test">
    </form>
  `);
  global.localStorage.clear();

  const form = saveform("form");

  form.save();

  // The library should generate a unique ID
  // Check if there's any item in localStorage that starts with the default prefix
  const keys = Object.keys(global.localStorage.items);
  const saveformKeys = keys.filter((key) => key.startsWith("saveform_form_"));

  t.equal(saveformKeys.length, 1, "should generate a key for a form without id");

  t.end();
});

tap.test("saveform - invalid JSON in storage", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  // Set corrupted data
  global.localStorage.setItem("saveform_test-form", "{invalid:json}");

  const form = saveform("#test-form");

  // Restore should handle invalid JSON gracefully
  const result = form.restore();

  t.equal(result, null, "should return null when stored JSON is invalid");

  // Storage should be cleared
  const storedJson = global.localStorage.getItem("saveform_test-form");
  t.notOk(storedJson, "should remove invalid JSON from storage");

  t.end();
});

tap.test("saveform - multiple forms on page", (t) => {
  // Setup DOM with multiple forms
  setupDOM(`
    <form id="form1">
      <input type="text" name="username" value="user1">
    </form>
    <form id="form2">
      <input type="text" name="username" value="user2">
    </form>
  `);
  global.localStorage.clear();

  const form1 = saveform("#form1");
  const form2 = saveform("#form2");

  form1.save();
  form2.save();

  // Check that both forms saved their data separately
  const data1 = JSON.parse(global.localStorage.getItem("saveform_form1"));
  const data2 = JSON.parse(global.localStorage.getItem("saveform_form2"));

  t.equal(data1.username, "user1", "should save first form data");
  t.equal(data2.username, "user2", "should save second form data");

  // Change values
  document.querySelector('#form1 [name="username"]').value = "changed1";
  document.querySelector('#form2 [name="username"]').value = "changed2";

  // Restore only form1
  form1.restore();

  t.equal(document.querySelector('#form1 [name="username"]').value, "user1", "should restore first form");
  t.equal(document.querySelector('#form2 [name="username"]').value, "changed2", "should not affect second form");

  t.end();
});

tap.test("saveform - complex forms with varied elements", (t) => {
  // Setup DOM with a more complex form including radio groups
  setupDOM(`
    <form id="complex-form">
      <fieldset>
        <legend>Personal Info</legend>
        <input type="text" name="name" value="John Doe">
        <input type="number" name="age" value="30">
        <input type="date" name="birthdate" value="1990-01-01">
      </fieldset>

      <fieldset>
        <legend>Preferences</legend>
        <div>
          <input type="checkbox" name="notifications" id="notify" checked>
          <label for="notify">Receive notifications</label>
        </div>

        <div>
          <p>Theme:</p>
          <input type="radio" name="theme" value="light" id="light" checked>
          <label for="light">Light</label>
          <input type="radio" name="theme" value="dark" id="dark">
          <label for="dark">Dark</label>
          <input type="radio" name="theme" value="system" id="system">
          <label for="system">System</label>
        </div>

        <div>
          <p>Experience Level:</p>
          <input type="range" name="experience" min="1" max="10" value="5">
        </div>
      </fieldset>
    </form>
  `);
  global.localStorage.clear();

  const form = saveform("#complex-form");

  form.save();

  // Change all values
  document.querySelector('[name="name"]').value = "Jane Smith";
  document.querySelector('[name="age"]').value = "25";
  document.querySelector('[name="birthdate"]').value = "1995-02-02";
  document.querySelector('[name="notifications"]').checked = false;
  document.querySelector('[name="theme"][value="dark"]').checked = true;
  document.querySelector('[name="theme"][value="light"]').checked = false;
  document.querySelector('[name="experience"]').value = "8";

  // Restore
  form.restore();

  // Verify all values were restored
  t.equal(document.querySelector('[name="name"]').value, "John Doe", "should restore text input");
  t.equal(document.querySelector('[name="age"]').value, "30", "should restore number input");
  t.equal(document.querySelector('[name="birthdate"]').value, "1990-01-01", "should restore date input");
  t.equal(document.querySelector('[name="notifications"]').checked, true, "should restore checkbox");
  t.equal(document.querySelector('[name="theme"][value="light"]').checked, true, "should restore radio button");
  t.equal(document.querySelector('[name="theme"][value="dark"]').checked, false, "should uncheck other radio buttons");
  t.equal(document.querySelector('[name="experience"]').value, "5", "should restore range input");

  t.end();
});

tap.test("saveform - empty restore", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form");

  // Clear any existing data
  form.clear();

  // Try to restore without any saved data
  const result = form.restore();

  t.equal(result, null, "should return null when no data is found");

  t.end();
});

tap.test("saveform - fields without names", (t) => {
  // Setup DOM with fields without names
  setupDOM(`
    <form id="test-form">
      <input type="text" value="no-name">
      <input type="text" name="with-name" value="has-name">
    </form>
  `);
  global.localStorage.clear();

  const form = saveform("#test-form");

  form.save();

  const storedJson = global.localStorage.getItem("saveform_test-form");
  const storedData = JSON.parse(storedJson);

  t.notOk(storedData.hasOwnProperty("no-name"), "should not save fields without name");
  t.ok(storedData.hasOwnProperty("with-name"), "should save fields with name");

  t.end();
});

tap.test("saveform - fields with empty name or no name but with ID", (t) => {
  // Setup DOM with fields having empty name or no name but with ID
  setupDOM(`
    <form id="test-form">
      <input type="text" id="empty-name-field" name="" value="empty-name-value">
      <input type="text" id="no-name-field" value="no-name-value">
      <input type="text" value="no-name-no-id-value">
    </form>
  `);
  global.localStorage.clear();

  const form = saveform("#test-form");

  form.save();

  const storedJson = global.localStorage.getItem("saveform_test-form");
  const storedData = JSON.parse(storedJson);

  t.ok(storedData.hasOwnProperty("empty-name-field"), "should save fields with empty name using their ID");
  t.equal(storedData["empty-name-field"], "empty-name-value", "should store correct value for empty name field");

  t.ok(storedData.hasOwnProperty("no-name-field"), "should save fields without name but with ID using their ID");
  t.equal(storedData["no-name-field"], "no-name-value", "should store correct value for no name field with ID");

  t.notOk(storedData.hasOwnProperty("no-name-no-id-value"), "should not save fields without both name and ID");

  // Test restore functionality as well
  document.querySelector("#empty-name-field").value = "changed1";
  document.querySelector("#no-name-field").value = "changed2";

  form.restore();

  t.equal(
    document.querySelector("#empty-name-field").value,
    "empty-name-value",
    "should restore empty name field value",
  );
  t.equal(
    document.querySelector("#no-name-field").value,
    "no-name-value",
    "should restore no name field with ID value",
  );

  t.end();
});

tap.test("saveform - fields selector with no matches", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form", {
    fields: "input.nonexistent", // selector matches nothing
  });

  const saved = form.save();
  t.same(saved, {}, "should return empty object when no fields match");

  const storedJson = global.localStorage.getItem("saveform_test-form");
  t.equal(storedJson, "{}", "should store empty JSON object");

  const restored = form.restore();
  t.same(restored, [], "should restore nothing and return empty array");

  t.end();
});

tap.test("saveform - fields universal selector '*'", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form", { fields: "*" });
  form.save();

  const storedJson = global.localStorage.getItem("saveform_test-form");
  const storedData = JSON.parse(storedJson);

  t.ok(storedData.username, "should save text input");
  t.ok(storedData.email, "should save email input");
  t.ok(storedData.comments, "should save textarea");
  t.ok(storedData.country, "should save select element");
  t.notOk(storedData.hasOwnProperty("password"), "should still respect default password exclusion");

  t.end();
});

tap.test("saveform - default setter handles nullish values", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const form = saveform("#test-form");
  form.save(); // initial save

  // Corrupt saved data: set textarea value to null
  const data = JSON.parse(global.localStorage.getItem("saveform_test-form"));
  data.comments = null;
  global.localStorage.setItem("saveform_test-form", JSON.stringify(data));

  // Change current value so we can see if restore overwrites it
  document.querySelector('[name="comments"]').value = "changed";

  form.restore();

  t.equal(
    document.querySelector('[name="comments"]').value,
    "",
    "default setter should write empty string when stored value is nullish",
  );
  t.end();
});

tap.test("saveform - generateFormId uniqueness for unnamed forms", (t) => {
  setupDOM(`
    <form><input name="first" value="1"></form>
    <form><input name="second" value="2"></form>
  `);
  global.localStorage.clear();

  const [f1, f2] = document.querySelectorAll("form");
  const s1 = saveform(f1);
  const s2 = saveform(f2);

  s1.save();
  s2.save();

  const keys = Object.keys(global.localStorage.items).filter((k) => k.startsWith("saveform_form_"));

  t.equal(keys.length, 2, "should create two separate storage keys");
  t.ok(keys[0] !== keys[1], "each unnamed form should get a unique id");
  t.end();
});

tap.test("saveform - config.fields function excluding all fields", (t) => {
  setupDOM(basicFormHTML);
  global.localStorage.clear();

  const formInstance = saveform("#test-form", {
    fields: (field) => false, // Exclude all fields
  });

  const savedData = formInstance.save();
  t.same(savedData, {}, "should return an empty object");

  const storedJson = global.localStorage.getItem("saveform_test-form");
  t.equal(storedJson, "{}", "localStorage should contain an empty JSON object string");

  t.end();
});

tap.test("saveform - custom accessors/setters with complex CSS selector", (t) => {
  const complexSelectorFormHTML = `
    <form id="complex-selector-form">
      <input type="text" name="setting1" data-saveable="true" value="val1">
      <input type="text" name="setting2" value="val2">
      <input type="text" name="setting3" data-saveable="true" value="val3">
    </form>
  `;
  setupDOM(complexSelectorFormHTML);
  global.localStorage.clear();

  const formInstance = saveform("#complex-selector-form", {
    accessors: {
      'input[data-saveable="true"]': (field) => field.value.toUpperCase(),
    },
    setters: {
      'input[data-saveable="true"]': (field, value) => {
        field.value = value.toLowerCase();
      },
    },
  });

  const savedData = formInstance.save();

  // Check saved data (transformed by accessors)
  t.equal(savedData.setting1, "VAL1", "setting1 should be uppercase in saved data");
  t.equal(savedData.setting2, "val2", "setting2 should be as-is in saved data (default accessor)");
  t.equal(savedData.setting3, "VAL3", "setting3 should be uppercase in saved data");

  // Verify localStorage content
  const storedJson = global.localStorage.getItem("saveform_complex-selector-form");
  const storedData = JSON.parse(storedJson);
  t.equal(storedData.setting1, "VAL1", "setting1 in localStorage should be uppercase");
  t.equal(storedData.setting2, "val2", "setting2 in localStorage should be as-is");
  t.equal(storedData.setting3, "VAL3", "setting3 in localStorage should be uppercase");

  // Modify values in DOM
  document.querySelector('[name="setting1"]').value = "newVal1";
  document.querySelector('[name="setting2"]').value = "newVal2";
  document.querySelector('[name="setting3"]').value = "newVal3";

  formInstance.restore();

  // Check restored values in DOM (transformed by setters)
  t.equal(document.querySelector('[name="setting1"]').value, "val1", "setting1 should be restored as lowercase");
  t.equal(document.querySelector('[name="setting2"]').value, "val2", "setting2 should be restored as-is");
  t.equal(document.querySelector('[name="setting3"]').value, "val3", "setting3 should be restored as lowercase");

  t.end();
});

tap.test("saveform - checkbox explicitly restoring a false value", (t) => {
  const checkboxFalseFormHTML = `
    <form id="checkbox-false-form">
      <input type="checkbox" name="mycheck" checked>
    </form>
  `;
  setupDOM(checkboxFalseFormHTML);
  global.localStorage.clear();

  const formInstance = saveform("#checkbox-false-form");
  const checkbox = document.querySelector('[name="mycheck"]');

  // Manually uncheck, then save
  checkbox.checked = false;
  formInstance.save();

  const storedJson = global.localStorage.getItem("saveform_checkbox-false-form");
  const storedData = JSON.parse(storedJson);
  t.equal(storedData.mycheck, false, "Saved data for mycheck should be false");

  // Manually check again
  checkbox.checked = true;
  t.equal(checkbox.checked, true, "Checkbox should be checked before restore");

  formInstance.restore();

  t.equal(checkbox.checked, false, "Checkbox should be restored to false");

  t.end();
});

tap.test("saveform - select[multiple] restoring an empty array", (t) => {
  // Use a relevant part of basicFormHTML or define a specific one
  const multiSelectFormHTML = `
    <form id="multiselect-empty-form">
      <select name="languages" multiple>
        <option value="js" selected>JavaScript</option>
        <option value="py" selected>Python</option>
        <option value="rb">Ruby</option>
      </select>
    </form>
  `;
  setupDOM(multiSelectFormHTML);
  global.localStorage.clear();

  const formInstance = saveform("#multiselect-empty-form");
  const selectElement = document.querySelector('[name="languages"]');

  // Store data with 'languages' as an empty array
  global.localStorage.setItem("saveform_multiselect-empty-form", JSON.stringify({ languages: [] }));

  // Ensure some options are selected before restore
  selectElement.options[0].selected = true; // js
  selectElement.options[1].selected = true; // py
  t.equal(selectElement.selectedOptions.length, 2, "Two options should be selected before restore");

  formInstance.restore();

  t.equal(selectElement.selectedOptions.length, 0, "Number of selected options should be 0 after restore");
  t.equal(selectElement.options[0].selected, false, "JavaScript option should be deselected");
  t.equal(selectElement.options[1].selected, false, "Python option should be deselected");
  t.equal(selectElement.options[2].selected, false, "Ruby option should be deselected");

  t.end();
});

tap.test("saveform - dynamic fields retain values", (t) => {
  setupDOM(`
    <form id="dyn">
      <input type="text" name="a" value="1">
      <input type="text" name="b" value="2">
    </form>
  `);
  localStorage.clear();
  const f = saveform("#dyn");

  f.save();
  document.querySelector('[name="b"]').remove();
  document.querySelector('[name="a"]').value = "x";

  t.same(f.save(), { a: "x", b: "2" }, "save() merges with stored values");

  const b = document.createElement("input");
  b.name = "b";
  document.querySelector("#dyn").appendChild(b);

  f.restore();
  t.equal(document.querySelector('[name="b"]').value, "2", "restore() reuses old value");
  t.end();
});
