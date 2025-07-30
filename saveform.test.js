import { describe, it, beforeEach, beforeAll, afterAll, expect, vi } from "vitest";
import { Browser } from "happy-dom";

const browser = new Browser({
  console,
  settings: { fetch: { virtualServers: [{ url: "https://test/", directory: "." }] } },
});

function basicForm() {
  return `
    <form id="test-form">
      <input type="text" name="username" value="initial">
      <input type="email" name="email" value="test@example.com">
      <input type="password" name="password" value="secret">
      <textarea name="comments">Some text</textarea>
      <input type="checkbox" name="subscribe" checked>
      <select name="country">
        <option value="us">US</option>
        <option value="ca" selected>CA</option>
        <option value="uk">UK</option>
      </select>
      <select name="languages" multiple>
        <option value="js" selected>JS</option>
        <option value="py">PY</option>
        <option value="rb" selected>RB</option>
      </select>
      <input type="radio" name="gender" value="male" checked>
      <input type="radio" name="gender" value="female">
    </form>`;
}

describe("saveform", () => {
  let page, document, window;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    page = browser.newPage();
    await page.goto("https://test/saveform-test.html");
    await page.waitUntilComplete();
    document = page.mainFrame.document;
    window = page.mainFrame.window;
    window.setTimeout = setTimeout;
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.getElementById("root").innerHTML = basicForm();
  });

  function initForm(selector = "#test-form", opts) {
    return window.saveform(selector, opts);
  }

  function field(name) {
    return document.querySelector(`[name="${name}"]`);
  }

  it("initializes and exposes api", () => {
    const f = initForm();
    ["save", "restore", "clear", "destroy"].forEach((m) => expect(typeof f[m]).toBe("function"));
  });

  it("saves and restores fields", () => {
    const f = initForm();
    const saved = f.save();
    expect(saved.username).toBe("initial");
    field("username").value = "changed";
    field("country").value = "uk";
    f.restore();
    expect(field("username").value).toBe("initial");
    expect(field("country").value).toBe("ca");
  });

  it("excludes password field", () => {
    const f = initForm();
    const data = f.save();
    expect(data.password).toBeUndefined();
  });

  it("supports sessionStorage and prefix", () => {
    const f = initForm("#test-form", { storage: window.sessionStorage, prefix: "x_" });
    f.save();
    expect(window.localStorage.getItem("x_test-form")).toBeNull();
    expect(window.sessionStorage.getItem("x_test-form")).toBeTruthy();
  });

  it("handles fields inclusion/exclusion", () => {
    const tests = [
      { opts: { fields: 'input[type="text"]' }, expect: ["username"] },
      {
        opts: { exclude: "textarea" },
        expect: ["username", "email", "password", "subscribe", "country", "languages", "gender"],
      },
    ];
    tests.forEach(({ opts, expect: names }) => {
      window.localStorage.clear();
      const f = initForm("#test-form", opts);
      f.save();
      const stored = JSON.parse(window.localStorage.getItem("saveform_test-form"));
      expect(Object.keys(stored)).toEqual(names);
    });
  });

  it("custom accessors and setters", () => {
    const f = initForm("#test-form", {
      accessors: { '[name="username"]': (el) => el.value.toUpperCase() },
      setters: { '[name="username"]': (el, v) => (el.value = v.toLowerCase()) },
    });
    f.save();
    field("username").value = "x";
    f.restore();
    expect(field("username").value).toBe("initial");
  });

  it("listens to specified events", () => {
    initForm("#test-form", { events: ["change"] });
    field("username").value = "x";
    field("username").dispatchEvent(new window.Event("input", { bubbles: true }));
    expect(window.localStorage.getItem("saveform_test-form")).toBeNull();
    field("username").dispatchEvent(new window.Event("change", { bubbles: true }));
    expect(JSON.parse(window.localStorage.getItem("saveform_test-form")).username).toBe("x");
  });

  it("clear and destroy", () => {
    const f = initForm();
    f.save();
    expect(window.localStorage.getItem("saveform_test-form")).toBeTruthy();
    f.clear();
    expect(window.localStorage.getItem("saveform_test-form")).toBeNull();
    f.save();
    f.destroy();
    field("username").value = "z";
    field("username").dispatchEvent(new window.Event("input", { bubbles: true }));
    expect(JSON.parse(window.localStorage.getItem("saveform_test-form")).username).not.toBe("z");
  });

  it("generates id for unnamed forms", () => {
    document.getElementById("root").innerHTML = `<form><input name="a" value="1"></form>`;
    const f = initForm("form");
    f.save();
    const keys = Object.keys(window.localStorage);
    expect(keys.some((k) => k.startsWith("saveform_form_"))).toBe(true);
  });

  it("handles invalid json", () => {
    window.localStorage.setItem("saveform_test-form", "{bad}");
    const f = initForm();
    expect(f.restore()).toBeNull();
    expect(window.localStorage.getItem("saveform_test-form")).toBeNull();
  });

  it("multiple forms isolated", () => {
    document.getElementById("root").innerHTML = `
      <form id="f1"><input name="n" value="1"></form>
      <form id="f2"><input name="n" value="2"></form>`;
    const s1 = initForm("#f1");
    const s2 = initForm("#f2");
    s1.save();
    s2.save();
    field("n").value = "x";
    s1.restore();
    expect(JSON.parse(window.localStorage.getItem("saveform_f1")).n).toBe("1");
    expect(document.querySelector("#f1 [name=n]").value).toBe("1");
    expect(document.querySelector("#f2 [name=n]").value).toBe("2");
  });

  it("dynamic fields retain values", () => {
    document.getElementById("root").innerHTML =
      `<form id="dyn"><input name="a" value="1"><input name="b" value="2"></form>`;
    const f = initForm("#dyn");
    f.save();
    document.querySelector("#dyn [name=b]").remove();
    document.querySelector("#dyn [name=a]").value = "x";
    expect(f.save()).toEqual({ a: "x", b: "2" });
    const b = document.createElement("input");
    b.name = "b";
    document.querySelector("#dyn").appendChild(b);
    f.restore();
    expect(document.querySelector("#dyn [name=b]").value).toBe("2");
  });
});
