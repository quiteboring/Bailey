import { registerWorkerEarly } from "./proxy.js";
import { applyTheme } from "./settings.js";
import {
  getActiveTab,
  navigate,
  newTab,
  onTabsChange,
  showHomePage,
} from "./tabs.js";

const getElement = (id) => document.getElementById(id);
const addressInput = getElement("address-input");
const errorMessage = getElement("error-message");
const addressForm = getElement("address-form");
const backButton = getElement("nav-back");
const forwardButton = getElement("nav-forward");
const reloadButton = getElement("nav-reload");
const homeButton = getElement("nav-home");
const loadingBar = getElement("loading-bar");
const progressFill = loadingBar.firstElementChild;
let progressTimer = null;

function setProgressBar(loading) {
  if (loading) {
    clearInterval(progressTimer);
    clearTimeout(progressTimer);
    loadingBar.classList.add("loading");
    progressFill.style.transition = "none";
    progressFill.style.width = "0%";
    progressFill.getBoundingClientRect();
    progressFill.style.transition = "";
    requestAnimationFrame(() => {
      progressFill.style.width = "80%";
    });
    progressTimer = setInterval(() => {
      const current = parseFloat(progressFill.style.width) || 0;
      if (current < 95)
        progressFill.style.width = `${Math.min(95, current + (95 - current) * 0.08 + 0.5)}%`;
    }, 200);
  } else {
    if (!loadingBar.classList.contains("loading")) return;
    clearInterval(progressTimer);
    clearTimeout(progressTimer);
    progressFill.style.width = "100%";
    progressTimer = setTimeout(() => {
      loadingBar.classList.remove("loading");
      progressFill.style.width = "0%";
    }, 350);
  }
}

registerWorkerEarly(
  (err) => (errorMessage.textContent = "SW registration failed: " + err),
);

function syncToolbar(tab) {
  addressInput.value = tab ? tab.url : "";
  const hasProxyFrame = !!(tab && tab.proxyFrame);

  backButton.disabled =
    forwardButton.disabled =
    reloadButton.disabled =
      !hasProxyFrame;

  setProgressBar(!!(tab && tab.loading));
}
onTabsChange(syncToolbar);

async function navigateActiveTab(input) {
  const tab = getActiveTab();
  if (!tab || !input.trim()) return;
  errorMessage.textContent = "";
  try {
    await navigate(tab, input.trim());
  } catch (err) {
    errorMessage.textContent = "Failed to start proxy: " + err;
  }
}

addressForm.addEventListener("submit", (event) => {
  event.preventDefault();
  navigateActiveTab(addressInput.value);
});

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || !event.data) return;
  if (event.data.type === "bailey:navigate")
    navigateActiveTab(event.data.value);
  if (event.data.type === "bailey:open-settings")
    navigateActiveTab("about:config");
});

backButton.onclick = () => getActiveTab()?.proxyFrame?.back();
forwardButton.onclick = () => getActiveTab()?.proxyFrame?.forward();
reloadButton.onclick = () => getActiveTab()?.proxyFrame?.reload();
homeButton.onclick = () => showHomePage();
getElement("new-tab").onclick = () => newTab();

applyTheme();
newTab();
