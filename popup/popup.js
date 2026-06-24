const STORAGE_KEY = "MinAppyr";
const ENABLE_KEY = "MinAppyrEnabled";
const BLOCKED_KEY = "MinAppyrBlockedDomains";

const toggleEnabled = document.getElementById("toggleEnabled");

const status = document.getElementById("status");

const openStorageBtn = document.getElementById("openStorage");
const clearStorageBtn = document.getElementById("clearStorage");

const domainInput = document.getElementById("domainInput");
const addDomainBtn = document.getElementById("addDomainBtn");
const blockedList = document.getElementById("blockedList");

init();

async function init() {
  try {
    await loadSettings();
    await renderBlockedDomains();

    toggleEnabled?.addEventListener("change", handleToggle);
    openStorageBtn?.addEventListener("click", exportData);
    clearStorageBtn?.addEventListener("click", clearData);

    addDomainBtn?.addEventListener("click", addDomain);
  } catch (error) {
    console.error(error);
    setStatus("Failed to initialize popup", "error");
  }
}

async function loadSettings() {
  const result = await browser.storage.local.get(ENABLE_KEY);
  toggleEnabled.checked = result[ENABLE_KEY] ?? true;
}

async function handleToggle() {
  try {
    await browser.storage.local.set({
      [ENABLE_KEY]: toggleEnabled.checked,
    });

    setStatus(
      toggleEnabled.checked ? "Extension enabled" : "Extension disabled",
      "success",
    );
  } catch (error) {
    setStatus("Failed to update setting", "error");
  }
}

async function getStoredData() {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
}

async function exportData() {
  try {
    const data = await getStoredData();

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "minapplyr-data.json";

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    setStatus("Data exported", "success");
  } catch (error) {
    setStatus("Export failed", "error");
  }
}

async function clearData() {
  if (!confirm("Delete all saved MinApplyr data?")) return;

  try {
    await browser.storage.local.remove(STORAGE_KEY);
    setStatus("All data removed", "success");
  } catch (error) {
    setStatus("Failed to clear data", "error");
  }
}

async function getBlockedDomains() {
  const res = await browser.storage.local.get(BLOCKED_KEY);
  return res[BLOCKED_KEY] || [];
}

async function saveBlockedDomains(list) {
  await browser.storage.local.set({
    [BLOCKED_KEY]: list,
  });
}

async function addDomain() {
  const domain = (domainInput.value || "").trim().toLowerCase();
  if (!domain) return;

  let list = await getBlockedDomains();

  if (!list.includes(domain)) {
    list.push(domain);
    await saveBlockedDomains(list);
  }

  domainInput.value = "";
  await renderBlockedDomains();
}

async function removeDomain(domain) {
  let list = await getBlockedDomains();
  list = list.filter((d) => d !== domain);

  await saveBlockedDomains(list);
  await renderBlockedDomains();
}

async function renderBlockedDomains() {
  const list = await getBlockedDomains();

  blockedList.innerHTML = "";

  if (!list.length) {
    blockedList.innerHTML = `
      <li style="color:var(--minapplyr-muted); font-size:12px;">
        No blocked domains
      </li>`;
    return;
  }

  list.forEach((domain) => {
    const li = document.createElement("li");

    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "6px 0";

    li.innerHTML = `
      <span>${domain}</span>
      <button data-domain="${domain}" style="
        border:none;
        background:transparent;
        color:var(--minapplyr-danger);
        cursor:pointer;
        font-size:12px;
      ">Remove</button>
    `;

    li.querySelector("button").addEventListener("click", () => {
      removeDomain(domain);
    });

    blockedList.appendChild(li);
  });
}

function setStatus(message, type = "info") {
  status.textContent = message;

  status.style.color =
    type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "";

  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(() => {
    status.textContent = "";
  }, 3000);
}
