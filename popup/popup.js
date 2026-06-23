const textarea = document.getElementById("profileData");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const resetBtn = document.getElementById("resetBtn");

const status = document.getElementById("status");

loadProfile();

saveBtn.addEventListener("click", saveProfile);
loadBtn.addEventListener("click", loadProfile);
resetBtn.addEventListener("click", resetMemory);

async function saveProfile() {
  try {
    const profile = JSON.parse(textarea.value);

    await browser.storage.local.set({
      profile,
    });

    status.textContent = "Profile saved.";
    status.style.color = "green";
  } catch (err) {
    status.textContent = "Invalid JSON";
    status.style.color = "red";
  }
}

async function loadProfile() {
  const result = await browser.storage.local.get("profile");

  if (result.profile) {
    textarea.value = JSON.stringify(result.profile, null, 2);
  }
}

async function resetMemory() {
  await browser.storage.local.clear();
  console.log("Memory reset");
}
