let memory = {
  semanticProfile: {}, // type → {value, confidence, samples}
  siteMappings: {}, // host → fieldKey → {type, confidence}
  learnedFields: {}, // fieldKey → {type, confidence, count}
};

const STORAGE_KEY = "MinAppyr";

async function loadMemory() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  if (data[STORAGE_KEY]) memory = data[STORAGE_KEY];
}

async function saveMemory() {
  await browser.storage.local.set({
    [STORAGE_KEY]: memory,
  });
}

const FIELD_PATTERNS = {
  email: ["email", "mail"],
  phone: ["phone", "mobile", "contact"],
  name: ["name", "full name"],
  linkedin: ["linkedin"],
  github: ["github"],
  portfolio: ["portfolio", "website"],
  company: ["company", "employer"],
  role: ["role", "title", "position"],
  salary: ["salary", "ctc", "compensation"],
  notice: ["notice", "notice period"],
  city: ["city"],
  state: ["state"],
  country: ["country"],
  address: ["address"],
  education: ["education", "degree"],
  experience: ["experience"],
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function updateConfidence(oldConf = 0, inc = 1) {
  // diminishing returns so it stabilizes over time
  return clamp(oldConf + inc * (1 / (1 + oldConf * 0.1)), 0, 100);
}

function getFormContext() {
  const text = document.body.innerText.toLowerCase();

  const jobSignals = [
    "apply",
    "resume",
    "cv",
    "job",
    "experience",
    "education",
  ];
  const score = jobSignals.reduce(
    (acc, k) => acc + (text.includes(k) ? 1 : 0),
    0,
  );

  return {
    host: location.hostname,
    path: location.pathname,
    isJobForm: score >= 2,
    score,
  };
}

function getFieldText(field) {
  const labelText = field.labels?.length
    ? Array.from(field.labels)
        .map((l) => l.innerText)
        .join(" ")
    : "";

  const ariaLabel = field.getAttribute("aria-label") || "";

  const ariaLabelledBy = field.getAttribute("aria-labelledby")
    ? document.getElementById(field.getAttribute("aria-labelledby"))?.innerText
    : "";

  const autocomplete = field.getAttribute("autocomplete") || "";

  return [
    field.name,
    field.id,
    field.placeholder,
    labelText,
    ariaLabel,
    ariaLabelledBy,
    autocomplete,
  ]
    .join(" ")
    .toLowerCase()
    .trim();
}

function getFieldKey(field) {
  return [
    field.name,
    field.id,
    field.placeholder,
    field.getAttribute("aria-label"),
    field.getAttribute("autocomplete"),
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase()
    .trim();
}

function detectType(field) {
  const text = getFieldText(field);

  let bestType = null;
  let bestScore = 0;

  for (const type in FIELD_PATTERNS) {
    let score = 0;

    for (const keyword of FIELD_PATTERNS[type]) {
      if (text.includes(keyword)) {
        score += keyword.length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return bestScore > 0 ? bestType : null;
}

async function learnField(field) {
  const value = field.value?.trim();
  if (!value) return;

  const host = location.hostname;
  const key = getFieldKey(field);
  const context = getFormContext();

  let type = detectType(field);

  if (!type) {
    type = memory.learnedFields[key]?.type || null;
  }

  if (!type) return;

  const prevGlobal = memory.semanticProfile[type] || {
    value: "",
    confidence: 0,
    samples: 0,
  };

  memory.semanticProfile[type] = {
    value,
    confidence: updateConfidence(prevGlobal.confidence, 1),
    samples: prevGlobal.samples + 1,
    lastUpdated: Date.now(),
  };

  if (!memory.siteMappings[host]) {
    memory.siteMappings[host] = {};
  }

  const prevSite = memory.siteMappings[host][key] || {
    type,
    confidence: 0,
  };

  memory.siteMappings[host][key] = {
    type,
    confidence: updateConfidence(
      prevSite.confidence,
      context.isJobForm ? 2 : 1,
    ),
  };

  const prevField = memory.learnedFields[key] || {
    type,
    count: 0,
    confidence: 0,
  };

  memory.learnedFields[key] = {
    type,
    count: prevField.count + 1,
    confidence: updateConfidence(prevField.confidence, 1),
  };

  await saveMemory();
}

function observeInputs() {
  document.addEventListener(
    "change",
    async (e) => {
      const el = e.target;
      if (el.matches("input, textarea, select")) {
        await learnField(el);
      }
    },
    true,
  );
}

function observeForms() {
  document.addEventListener(
    "submit",
    async (e) => {
      const form = e.target;
      const fields = form.querySelectorAll("input, textarea, select");

      for (const f of fields) {
        await learnField(f);
      }
    },
    true,
  );
}

function detectValue(field) {
  const key = getFieldKey(field);
  const host = location.hostname;

  const siteMatch = memory.siteMappings[host]?.[key];

  if (siteMatch && siteMatch.confidence > 2) {
    return memory.semanticProfile[siteMatch.type]?.value || "";
  }

  const globalMatch = memory.learnedFields[key];

  if (globalMatch && globalMatch.confidence > 3) {
    return memory.semanticProfile[globalMatch.type]?.value || "";
  }

  const type = detectType(field);
  if (!type) return "";

  return memory.semanticProfile[type]?.value || "";
}

function setNativeValue(el, value) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;

  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  desc?.set?.call(el, value);
}

function fillForm() {
  const fields = document.querySelectorAll("input, textarea, select");

  let count = 0;

  fields.forEach((f) => {
    const value = detectValue(f);
    if (!value) return;

    setNativeValue(f, value);

    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.dispatchEvent(new Event("change", { bubbles: true }));

    count++;
  });

  alert(`Filled ${count} fields`);
}

function injectButton() {
  if (document.getElementById("smart-fill-btn")) return;

  const btn = document.createElement("button");
  btn.id = "smart-fill-btn";
  btn.innerText = "⚡ Smart Fill";

  btn.style.cssText = `
    position:fixed;
    bottom:20px;
    right:20px;
    z-index:999999;
    padding:12px 16px;
    background:#1a73e8;
    color:white;
    border:none;
    border-radius:10px;
    cursor:pointer;
  `;

  btn.onclick = fillForm;

  document.body.appendChild(btn);
}

function isJobPage() {
  const text = document.body.innerText.toLowerCase();

  return ["apply", "resume", "cv", "experience", "education", "job"].some((k) =>
    text.includes(k),
  );
}

(async function init() {
  await loadMemory();

  observeInputs();
  observeForms();

  if (isJobPage()) {
    injectButton();
  }

  console.log("Smart Form Filler ready");
})();
