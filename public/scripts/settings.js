export const SEARCH_ENGINES = {
  google: {
    label: "Google",
    template: "https://www.google.com/search?q=%s",
  },
  bing: { label: "Bing", template: "https://www.bing.com/search?q=%s" },
  duckduckgo: {
    label: "DuckDuckGo",
    template: "https://duckduckgo.com/?q=%s",
  },
  brave: {
    label: "Brave",
    template: "https://search.brave.com/search?q=%s",
  },
};

const STORAGE_KEY = "bailey.settings";
const DEFAULTS = { searchEngine: "google", theme: "dark" };

export function getSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      searchEngine: SEARCH_ENGINES[data?.searchEngine]
        ? data.searchEngine
        : DEFAULTS.searchEngine,
      theme:
        data?.theme === "light" || data?.theme === "dark"
          ? data.theme
          : DEFAULTS.theme,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  writeStorage(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetSettings() {
  removeStorage(STORAGE_KEY);
  return { ...DEFAULTS };
}

export function applyTheme(targetDocument = document) {
  targetDocument.documentElement.dataset.theme = getSettings().theme;
}
