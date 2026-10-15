// Apply the saved preference before React hydrates to avoid a theme flash.
(function () {
  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var storageKey = "alokasi-theme";
  var preference = "system";

  try {
    var stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark") preference = stored;
  } catch {
    // Private browsing or blocked storage still allows a system theme.
  }

  function applyTheme() {
    preference = root.dataset.theme || "system";
    var isDark =
      preference === "dark" || (preference === "system" && media.matches);
    root.classList.toggle("dark", isDark);
    updateThemeColor();
  }

  function updateThemeColor() {
    var color = root.classList.contains("dark") ? "#131b20" : "#176b56";
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach(function (meta) {
        if (meta.getAttribute("content") !== color)
          meta.setAttribute("content", color);
      });
  }

  root.dataset.theme = preference;
  applyTheme();
  media.addEventListener("change", applyTheme);
  window.addEventListener("alokasi:theme-change", applyTheme);
  new MutationObserver(updateThemeColor).observe(document.head, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("storage", function (event) {
    if (event.key !== storageKey) return;
    root.dataset.theme =
      event.newValue === "light" || event.newValue === "dark"
        ? event.newValue
        : "system";
    applyTheme();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyTheme, { once: true });
  }
})();
