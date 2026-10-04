import { scramjet, ensureProxy } from "./proxy.js";
import { getSettings, SEARCH_ENGINES } from "./settings.js";

const tabStrip = document.getElementById("tabs");
const newTabButton = document.getElementById("new-tab");
const tabView = document.getElementById("tab-view");

let openTabs = [];
let activeTab = null;
let nextTabId = 0;

const changeListeners = new Set();

export function onTabsChange(listener) {
  changeListeners.add(listener);
}

export function getActiveTab() {
  return activeTab;
}

let draggedTab = null;

document.addEventListener("dragend", () => {
  if (draggedTab) draggedTab.button.classList.remove("dragging");
  draggedTab = null;
  for (const tab of openTabs) {
    tab.button.classList.remove("drop-before", "drop-after");
  }
});

function syncOrderFromDom() {
  const ordered = [];
  for (const child of tabStrip.children) {
    if (child === newTabButton) continue;
    const found = openTabs.find((tab) => tab.button === child);
    if (found) ordered.push(found);
  }
  openTabs = ordered;
  notifyTabsChanged();
}

function notifyTabsChanged() {
  for (const listener of changeListeners) listener(activeTab);
}

function resolveInputToUrl(input) {
  if (URL.canParse(input)) return new URL(input).toString();
  const prefixed = `http://${input}`;
  if (URL.canParse(prefixed) && new URL(prefixed).hostname.includes("."))
    return new URL(prefixed).toString();
  const engine = SEARCH_ENGINES[getSettings().searchEngine];
  return engine.template.replace("%s", encodeURIComponent(input));
}

function titleForUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "New Tab";
  }
}

function readPageTitle(tab) {
  try {
    return tab.proxyFrame?.frame.contentDocument?.title?.trim() || "";
  } catch {
    return "";
  }
}

function updateTabTitle(tab, url) {
  tab.button.querySelector(".title").textContent =
    readPageTitle(tab) || titleForUrl(url);
}

export function setActiveTab(tab) {
  activeTab = tab;

  for (const other of openTabs) {
    other.button.classList.toggle("active", other === tab);
    other.page.classList.toggle("active", other === tab);
  }

  notifyTabsChanged();
}

export function newTab() {
  const tab = { id: ++nextTabId, proxyFrame: null, url: "", loading: false };

  tab.button = document.createElement("button");
  tab.button.className = "tab";
  tab.button.innerHTML = `<span class="title">New Tab</span>`;
  tab.favicon = document.createElement("img");
  tab.favicon.className = "favicon";
  tab.favicon.alt = "";
  tab.favicon.hidden = true;
  tab.favicon.onload = () => (tab.favicon.hidden = false);
  tab.favicon.onerror = () => (tab.favicon.hidden = true);
  tab.button.prepend(tab.favicon);

  const closeButton = document.createElement("span");

  closeButton.className = "close";
  closeButton.textContent = "\u00d7";
  closeButton.title = "Close tab";
  closeButton.onclick = (event) => {
    event.stopPropagation();
    closeTab(tab);
  };

  tab.button.appendChild(closeButton);
  tab.button.onclick = () => setActiveTab(tab);
  tab.button.draggable = true;
  tab.button.addEventListener("dragstart", (event) => {
    draggedTab = tab;
    tab.button.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(tab.id));
  });
  tab.button.addEventListener("dragover", (event) => {
    if (!draggedTab || draggedTab === tab) return;
    event.preventDefault();
    const bounds = tab.button.getBoundingClientRect();
    const after = event.clientX > bounds.left + bounds.width / 2;
    tab.button.classList.toggle("drop-after", after);
    tab.button.classList.toggle("drop-before", !after);
  });
  tab.button.addEventListener("dragleave", () => {
    tab.button.classList.remove("drop-before", "drop-after");
  });
  tab.button.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedTab || draggedTab === tab) return;
    const bounds = tab.button.getBoundingClientRect();
    if (event.clientX > bounds.left + bounds.width / 2) {
      tab.button.after(draggedTab.button);
    } else {
      tab.button.before(draggedTab.button);
    }
    syncOrderFromDom();
  });
  tab.page = document.createElement("div");
  tab.page.className = "page";
  tab.homeFrame = document.createElement("iframe");
  tab.homeFrame.src = "/home.html";
  tab.homeFrame.title = "New tab";
  tab.page.appendChild(tab.homeFrame);

  tabStrip.insertBefore(tab.button, newTabButton);
  tabView.appendChild(tab.page);
  openTabs.push(tab);

  setActiveTab(tab);

  return tab;
}

export function closeTab(tab) {
  openTabs = openTabs.filter((other) => other !== tab);

  tab.button.remove();
  tab.page.remove();

  if (activeTab === tab) {
    setActiveTab(openTabs[openTabs.length - 1] || newTab());
  } else {
    notifyTabsChanged();
  }
}

function readContentWindow(tab) {
  try {
    return tab.proxyFrame.frame.contentWindow;
  } catch {
    return null;
  }
}

function decodeProxiedUrl(url) {
  try {
    return scramjet.decodeUrl(url);
  } catch {
    return url;
  }
}

function trapPopups(tab) {
  const popupWindow = readContentWindow(tab);

  if (!popupWindow || popupWindow.__baileyPopupTrap) {
    return;
  }

  popupWindow.__baileyPopupTrap = true;
  popupWindow.open = (url) => {
    if (url) {
      navigate(newTab(), url).catch(() => undefined);
    }

    return null;
  };

  popupWindow.document.addEventListener(
    "click",
    (event) => {
      const anchor = event.target.closest?.("a[target]");

      if (!anchor || anchor.target.toLowerCase() !== "_blank") {
        return;
      }

      const destination = decodeProxiedUrl(anchor.href);

      event.preventDefault();
      event.stopPropagation();
      navigate(newTab(), destination).catch(() => undefined);
    },
    true,
  );
}

function readIconLink(tab) {
  try {
    return (
      tab.proxyFrame.frame.contentDocument?.querySelector('link[rel~="icon"]')
        ?.href || ""
    );
  } catch {
    return "";
  }
}

function readFallbackIcon(tab) {
  try {
    return scramjet.encodeUrl(new URL("/favicon.ico", tab.url).toString());
  } catch {
    return "";
  }
}

function updateFavicon(tab) {
  const iconUrl = readIconLink(tab) || readFallbackIcon(tab);
  if (!iconUrl || tab.favicon.getAttribute("src") === iconUrl) return;
  tab.favicon.hidden = true;
  tab.favicon.src = iconUrl;
}

export async function navigate(tab, input) {
  if (input.trim().toLowerCase() === "about:config") {
    return showSettingsPage(tab);
  }

  await ensureProxy();
  const url = resolveInputToUrl(input);

  if (!tab.proxyFrame) {
    tab.proxyFrame = scramjet.createFrame();
    tab.proxyFrame.addEventListener("urlchange", (event) => {
      tab.url = event.url;
      updateTabTitle(tab, event.url);
      updateFavicon(tab);
      notifyTabsChanged();
    });

    tab.page.appendChild(tab.proxyFrame.frame);
    tab.proxyFrame.frame.addEventListener("load", () => {
      trapPopups(tab);
      updateFavicon(tab);
      updateTabTitle(tab, tab.url);
      tab.loading = false;
      notifyTabsChanged();
    });

    trapPopups(tab);
  }

  tab.homeFrame.style.display = "none";

  if (tab.settingsFrame) {
    tab.settingsFrame.style.display = "none";
  }

  tab.proxyFrame.frame.style.display = "block";
  tab.url = url;

  updateTabTitle(tab, url);

  tab.loading = true;
  tab.proxyFrame.go(url);

  notifyTabsChanged();
}

function stopTabLoad(tab) {
  tab.loading = false;
  const frameWindow = readContentWindow(tab);
  if (frameWindow) frameWindow.stop();
}

export function showHomePage(tab = activeTab) {
  if (!tab) return;
  if (tab.proxyFrame) tab.proxyFrame.frame.style.display = "none";
  if (tab.settingsFrame) tab.settingsFrame.style.display = "none";

  tab.homeFrame.style.display = "block";
  tab.favicon.hidden = true;
  tab.url = "";
  stopTabLoad(tab);
  tab.button.querySelector(".title").textContent = "New Tab";

  notifyTabsChanged();
}

export function showSettingsPage(tab) {
  if (!tab) {
    return;
  }

  if (!tab.settingsFrame) {
    tab.settingsFrame = document.createElement("iframe");
    tab.settingsFrame.src = "/settings.html";
    tab.settingsFrame.title = "Settings";
    tab.page.appendChild(tab.settingsFrame);
  }

  tab.homeFrame.style.display = "none";

  if (tab.proxyFrame) {
    tab.proxyFrame.frame.style.display = "none";
  }

  tab.settingsFrame.style.display = "block";
  tab.favicon.hidden = true;
  tab.url = "about:config";
  stopTabLoad(tab);
  tab.button.querySelector(".title").textContent = "Settings";

  notifyTabsChanged();
}
