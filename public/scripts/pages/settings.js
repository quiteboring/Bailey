import {
  getSettings,
  saveSettings,
  resetSettings,
  applyTheme,
  SEARCH_ENGINES,
} from "../settings.js";

applyTheme();
const settings = getSettings();

const engineSelect = document.getElementById("engine-select");
for (const [key, engine] of Object.entries(SEARCH_ENGINES)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = engine.label;
  engineSelect.appendChild(option);
}
engineSelect.value = settings.searchEngine;
engineSelect.onchange = () =>
  saveSettings({ searchEngine: engineSelect.value });

const themeRow = document.getElementById("theme-row");
function syncThemeButtons(theme) {
  for (const button of themeRow.querySelectorAll("button")) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.themeValue === theme),
    );
  }
}
syncThemeButtons(settings.theme);
themeRow.onclick = (event) => {
  const theme = event.target.dataset?.themeValue;
  if (theme !== "dark" && theme !== "light") return;
  saveSettings({ theme });
  applyTheme();
  applyTheme(parent.document);
  syncThemeButtons(theme);
};

document.getElementById("reset-settings").onclick = () => {
  resetSettings();
  location.reload();
};
