browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "minappyr-fill",
    title: "Auto Fill Application",
    contexts: ["editable"],
  });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "minappyr-fill") return;
  if (!tab?.id) return;

  browser.tabs.sendMessage(tab.id, {
    type: "MINAPPYR_FILL",
  });
});
