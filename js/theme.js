(function() {
  const THEME_KEY = 'topdik_theme';
  
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  function applyTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') theme = 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }
  
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: next } }));
  }
  
  // Apply immediately (before paint) to prevent flash
  applyTheme(getPreferredTheme());
  
  // System preference only if user never chose
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
  
  window.TopdikTheme = {
    toggle: toggleTheme,
    apply: applyTheme,
    get: () => document.documentElement.getAttribute('data-theme') || 'light'
  };
  
  // Event delegation — works for header injected later by UI.initCommon
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (btn) {
      e.preventDefault();
      toggleTheme();
    }
  });
})();
