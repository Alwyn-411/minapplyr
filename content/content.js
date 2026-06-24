const STORAGE_KEY = "MinAppyr";
const ENABLED_KEY = "MinAppyrEnabled";
const BLOCKED_DOMAINS_KEY = "MinAppyrBlockedDomains";
const MAX_RECORDS_PER_DOMAIN = 20;

let lastFocusedElement = null;

document.addEventListener("focusin", (event) => {
  lastFocusedElement = event.target;
});

const getElementText = (el) =>
  [
    el.name || "",
    el.id || "",
    String(el.className || ""),
    el.placeholder || "",
    el.getAttribute?.("aria-label") || "",
  ]
    .join(" ")
    .toLowerCase();

const isPassword = (el) => el.type === "password";

const isCaptcha = (el) => {
  const s = getElementText(el);
  return (
    s.includes("captcha") || s.includes("recaptcha") || s.includes("hcaptcha")
  );
};

const isLoginNoise = (el) => {
  const s = getElementText(el);
  return (
    s.includes("otp") ||
    s.includes("one-time") ||
    s.includes("verification") ||
    s.includes("2fa") ||
    s.includes("login")
  );
};

const shouldIgnoreField = (el) =>
  isPassword(el) || isCaptcha(el) || isLoginNoise(el);

const getDomain = () => window.location.hostname;

const loadData = async () => {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
};

const saveData = async (data) => {
  await browser.storage.local.set({
    [STORAGE_KEY]: data,
  });
};

const loadBlockedDomains = async () => {
  const result = await browser.storage.local.get(BLOCKED_DOMAINS_KEY);
  return result[BLOCKED_DOMAINS_KEY] || [];
};

const saveBlockedDomains = async (domains) => {
  await browser.storage.local.set({
    [BLOCKED_DOMAINS_KEY]: domains,
  });
};

const isBlockedDomain = async (domain) => {
  const blocked = await loadBlockedDomains();
  return blocked.includes(domain);
};

const addBlockedDomain = async (domain) => {
  const blocked = await loadBlockedDomains();
  if (!blocked.includes(domain)) {
    blocked.push(domain);
    await saveBlockedDomains(blocked);
  }
};

const removeBlockedDomain = async (domain) => {
  let blocked = await loadBlockedDomains();
  blocked = blocked.filter((d) => d !== domain);
  await saveBlockedDomains(blocked);
};

const getKey = (el) =>
  el.name ||
  el.id ||
  el.getAttribute("autocomplete") ||
  el.getAttribute("aria-label") ||
  el.placeholder;

const extractFormData = (form) => {
  const data = {};

  form.querySelectorAll("input, textarea, select").forEach((el) => {
    if (shouldIgnoreField(el)) return;

    const key = getKey(el);
    if (!key) return;

    if (el.type === "checkbox" || el.type === "radio") {
      data[key] = el.checked;
    } else if (el.type !== "file") {
      data[key] = el.value;
    }
  });

  return data;
};

const fillForm = (form, data) => {
  form.querySelectorAll("input, textarea, select").forEach((el) => {
    if (shouldIgnoreField(el)) return;

    const key = getKey(el);
    if (!key || !(key in data)) return;

    const value = data[key];

    if (el.type === "checkbox" || el.type === "radio") {
      el.checked = Boolean(value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    el.value = value;

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const attachSubmitListeners = () => {
  document.querySelectorAll("form").forEach((form) => {
    if (form.__minappyr_attached) return;

    form.__minappyr_attached = true;

    form.addEventListener("submit", async () => {
      try {
        const formData = extractFormData(form);
        if (!Object.keys(formData).length) return;

        const domain = getDomain();
        const allData = await loadData();

        if (!allData[domain]) {
          allData[domain] = [];
        }

        allData[domain].push({
          time: Date.now(),
          data: formData,
        });

        allData[domain] = allData[domain].slice(-MAX_RECORDS_PER_DOMAIN);

        await saveData(allData);

        console.log("[MinAppyr] Form saved");
      } catch (error) {
        console.error("[MinAppyr] Failed to save form:", error);
      }
    });
  });
};

const handleFillRequest = async () => {
  const domain = getDomain();
  const allData = await loadData();

  const records = allData[domain];

  if (!records?.length) {
    console.warn("[MinAppyr] No saved data found for this domain.");
    return;
  }

  const latest = records[records.length - 1];

  const targetForm = lastFocusedElement?.closest?.("form");

  if (targetForm) {
    fillForm(targetForm, latest.data);
    console.log("[MinAppyr] Filled focused form");
    return;
  }

  const forms = document.querySelectorAll("form");

  if (!forms.length) {
    console.warn("[MinAppyr] No forms found on page.");
    return;
  }

  forms.forEach((form) => {
    fillForm(form, latest.data);
  });

  console.log("[MinAppyr] Filled all forms on page");
};

const isEnabled = async () => {
  const result = await browser.storage.local.get(ENABLED_KEY);
  return result[ENABLED_KEY] ?? true;
};

const init = async () => {
  const enabled = await isEnabled();
  if (!enabled) return;

  const domain = getDomain();

  const blocked = await isBlockedDomain(domain);
  if (blocked) {
    return;
  }

  attachSubmitListeners();

  const observer = new MutationObserver(() => {
    attachSubmitListeners();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  browser.runtime.onMessage.addListener(async (message) => {
    const domain = getDomain();

    if (message.type === "MINAPPYR_BLOCK_DOMAIN") {
      await addBlockedDomain(domain);
      console.log("[MinAppyr] Domain blocked:", domain);
      return;
    }

    if (message.type === "MINAPPYR_UNBLOCK_DOMAIN") {
      await removeBlockedDomain(domain);
      console.log("[MinAppyr] Domain unblocked:", domain);
      return;
    }

    if (message.type === "MINAPPYR_FILL") {
      await handleFillRequest();
    }
  });
};

init();
