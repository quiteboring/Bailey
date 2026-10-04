import { applyTheme } from "../settings.js";

applyTheme();

document.getElementById("home-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = document.getElementById("home-search").value.trim();
  if (value) {
    parent.postMessage({ type: "bailey:navigate", value }, location.origin);
  }
});

document.getElementById("home-settings").onclick = () =>
  parent.postMessage({ type: "bailey:open-settings" }, location.origin);
