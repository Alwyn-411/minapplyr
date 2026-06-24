const STORAGE_KEY = "MinAppyr";
const ENABLE_KEY = "MinAppyrEnabled";
const BLOCKED_KEY = "MinAppyrBlockedDomains";

const toggleEnabled = document.getElementById("toggleEnabled");
const status = document.getElementById("status");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

const domainInput = document.getElementById("domainInput");
const addDomainBtn = document.getElementById("addDomainBtn");
const blockedList = document.getElementById("blockedList");

init();

async function init() {
  await loadToggle();
  await renderBlockedDomains();

  toggleEnabled.addEventListener("change", toggleExtension);
  exportBtn.addEventListener("click", exportData);
  clearBtn.addEventListener("click", clearData);

  addDomainBtn.addEventListener("click", addDomain);
}

async function loadToggle() {
  const res = await browser.storage.local.get(ENABLE_KEY);
  toggleEnabled.checked = res[ENABLE_KEY] ?? true;
}

async function toggleExtension() {
  await browser.storage.local.set({
    [ENABLE_KEY]: toggleEnabled.checked,
  });

  setStatus("Settings updated");
}

async function getData() {
  const res = await browser.storage.local.get(STORAGE_KEY);
  return res[STORAGE_KEY] || {};
}

async function exportData() {
  const data = await getData();

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "minapplyr-data.json";
  a.click();

  URL.revokeObjectURL(url);

  setStatus("Data exported");
}

async function clearData() {
  if (!confirm("Delete all MinApplyr data?")) return;

  await browser.storage.local.remove(STORAGE_KEY);

  setStatus("All data cleared");
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
  const domain = domainInput.value.trim().toLowerCase();
  if (!domain) return;

  const list = await getBlockedDomains();

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
    blockedList.innerHTML = `<li style="opacity:0.6">No blocked domains</li>`;
    return;
  }

  list.forEach((domain) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span>${domain}</span>
      <button data-domain="${domain}">Remove</button>
    `;

    li.querySelector("button").addEventListener("click", () => {
      removeDomain(domain);
    });

    blockedList.appendChild(li);
  });
}

function setStatus(msg) {
  status.textContent = msg;

  setTimeout(() => {
    status.textContent = "";
  }, 3000);
}
