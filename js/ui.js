/**
 * UI Helpers: toast, modal, formatters, rendering
 */

const UI = {
  toast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="flex:1">${message}</span>
      <button onclick="this.parentElement.remove()" style="opacity:0.6;font-size:1.1rem">×</button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(currentLang === 'uz' ? 'uz-UZ' : currentLang === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  },
  
  formatDateTime(dateStr, timeStr) {
    let s = this.formatDate(dateStr);
    if (timeStr) s += `, ${timeStr}`;
    return s;
  },
  
  timeAgo(iso) {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return currentLang === 'en' ? 'just now' : 'hozirgina';
    if (diff < 3600) return Math.floor(diff / 60) + (currentLang === 'en' ? 'm ago' : ' daqiqa oldin');
    if (diff < 86400) return Math.floor(diff / 3600) + (currentLang === 'en' ? 'h ago' : ' soat oldin');
    return this.formatDate(iso);
  },
  
  categoryName(id) {
    return t('cat_' + id) || id;
  },
  
  statusBadge(status) {
    const map = {
      active: { cls: 'badge-success', key: 'status_active' },
      returned: { cls: 'badge', key: 'status_returned' },
      pending: { cls: 'badge-warning', key: 'status_pending' }
    };
    const m = map[status] || map.active;
    return `<span class="badge ${m.cls}">${t(m.key)}</span>`;
  },
  
  itemCard(item, { showSave = true } = {}) {
    const session = DataStore.getSession();
    const saved = session ? DataStore.isCollected(session.id, item.id) : false;
    const img = item.images?.[0] || this.placeholderImg(item.category);
    
    return `
      <article class="glass-card item-card" data-id="${item.id}">
        <a href="item.html?id=${item.id}" class="item-card__image">
          <img src="${img}" alt="${item.title}" loading="lazy" onerror="this.src='${this.placeholderImg(item.category)}'">
          <span style="position:absolute;top:0.75rem;left:0.75rem">${this.statusBadge(item.status)}</span>
          <span class="badge" style="position:absolute;top:0.75rem;right:0.75rem;background:rgba(0,0,0,0.5);color:white">
            ${item.type === 'found' ? t('filter_found') : t('filter_lost')}
          </span>
        </a>
        <div class="item-card__body">
          <h3 class="item-card__title">
            <a href="item.html?id=${item.id}">${this.escape(item.title)}</a>
          </h3>
          <div class="item-card__meta">
            <span>
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px;margin-right:2px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${this.escape(item.city || item.location)}
            </span>
            <span>
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px;margin-right:2px"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              ${this.formatDate(item.date)}
            </span>
          </div>
          <p class="item-card__desc">${this.escape(item.description)}</p>
          <div class="item-card__footer">
            <a href="item.html?id=${item.id}" class="btn btn-sm btn-secondary" data-i18n="btn_view">${t('btn_view')}</a>
            ${showSave && session ? `
              <button class="btn btn-sm btn-ghost btn-save" data-id="${item.id}" title="${saved ? t('btn_saved') : t('btn_save')}">
                <svg width="18" height="18" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            ` : ''}
          </div>
        </div>
      </article>
    `;
  },
  
  placeholderImg(category) {
    const colors = {
      electronics: '2563eb', documents: '0ea5e9', keys: 'f59e0b',
      bags: '8b5cf6', clothes: 'ec4899', jewelry: 'eab308',
      pets: '10b981', other: '64748b'
    };
    const c = colors[category] || '64748b';
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23${c}' opacity='0.12' width='400' height='300'/%3E%3Crect x='150' y='100' width='100' height='100' rx='16' fill='%23${c}' opacity='0.25'/%3E%3C/svg%3E`;
  },
  
  escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  renderHeader(active = '') {
    const session = DataStore.getSession();
    return `
      <header class="header">
        <div class="container header__inner">
          <a href="index.html" class="logo">
            <div class="logo-icon">
              <svg width="20" height="20" fill="none" stroke="white" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            </div>
            <span>Topdik-KU</span>
          </a>
          
          <nav class="nav">
            <a href="index.html" class="nav__link ${active==='home'?'active':''}" data-i18n="nav_home">${t('nav_home')}</a>
            <a href="found.html" class="nav__link ${active==='found'?'active':''}" data-i18n="nav_found">${t('nav_found')}</a>
            <a href="lost.html" class="nav__link ${active==='lost'?'active':''}" data-i18n="nav_lost">${t('nav_lost')}</a>
            <a href="report.html" class="nav__link ${active==='report'?'active':''}" data-i18n="nav_report">${t('nav_report')}</a>
            <a href="support.html" class="nav__link ${active==='support'?'active':''}" data-i18n="nav_support">${t('nav_support')}</a>
            <a href="messages.html" class="nav__link ${active==='messages'?'active':''}" data-i18n="nav_messages">${t('nav_messages')}</a>
            ${session ? `
              <a href="collects.html" class="nav__link ${active==='collects'?'active':''}" data-i18n="nav_collects">${t('nav_collects')}</a>
            ` : ''}
          </nav>
          
          <div class="header__actions">
            <select id="langSelect" class="lang-select" aria-label="Language">
              <option value="uz">UZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
            
            <button class="theme-toggle" data-theme-toggle aria-label="Toggle theme">
              <svg class="moon" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <svg class="sun" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            </button>
            
            ${session ? `
              <a href="profile.html" class="btn btn-sm btn-secondary">${session.name?.split(' ')[0] || 'User'}</a>
              <button class="btn btn-sm btn-ghost" id="logoutBtn" data-i18n="nav_logout">${t('nav_logout')}</button>
            ` : `
              <a href="auth.html?mode=login" class="btn btn-sm btn-secondary" data-i18n="nav_login">${t('nav_login')}</a>
              <a href="auth.html?mode=register" class="btn btn-sm btn-primary" data-i18n="nav_register">${t('nav_register')}</a>
            `}
            
            <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Menu">
              <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
        </div>
      </header>
      
      <div class="mobile-nav" id="mobileNav">
        <a href="index.html" class="nav__link" data-i18n="nav_home">${t('nav_home')}</a>
        <a href="found.html" class="nav__link" data-i18n="nav_found">${t('nav_found')}</a>
        <a href="lost.html" class="nav__link" data-i18n="nav_lost">${t('nav_lost')}</a>
        <a href="report.html" class="nav__link" data-i18n="nav_report">${t('nav_report')}</a>
        <a href="support.html" class="nav__link" data-i18n="nav_support">${t('nav_support')}</a>
        <a href="messages.html" class="nav__link" data-i18n="nav_messages">${t('nav_messages')}</a>
        ${session ? `
          <a href="collects.html" class="nav__link" data-i18n="nav_collects">${t('nav_collects')}</a>
          <a href="profile.html" class="nav__link" data-i18n="nav_profile">${t('nav_profile')}</a>
          <button class="nav__link" id="logoutBtnMobile" data-i18n="nav_logout">${t('nav_logout')}</button>
        ` : `
          <a href="auth.html?mode=login" class="nav__link" data-i18n="nav_login">${t('nav_login')}</a>
          <a href="auth.html?mode=register" class="nav__link" data-i18n="nav_register">${t('nav_register')}</a>
        `}
      </div>
    `;
  },
  
  renderFooter() {
    return `
      <footer class="footer">
        <div class="container">
          <div class="footer__grid">
            <div class="footer__brand">
              <a href="index.html" class="logo">
                <div class="logo-icon">
                  <svg width="20" height="20" fill="none" stroke="white" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                </div>
                <span>Topdik-KU</span>
              </a>
              <p data-i18n="hero_subtitle">${t('hero_subtitle')}</p>
            </div>
            <div class="footer__col">
              <h4 data-i18n="nav_found">${t('nav_found')}</h4>
              <a href="found.html" data-i18n="filter_found">${t('filter_found')}</a>
              <a href="lost.html" data-i18n="filter_lost">${t('filter_lost')}</a>
              <a href="report.html" data-i18n="nav_report">${t('nav_report')}</a>
            </div>
            <div class="footer__col">
              <h4 data-i18n="footer_about">${t('footer_about')}</h4>
              <a href="#" data-i18n="footer_privacy">${t('footer_privacy')}</a>
              <a href="#" data-i18n="footer_terms">${t('footer_terms')}</a>
              <a href="support.html" data-i18n="footer_contact">${t('footer_contact')}</a>
            </div>
            <div class="footer__col">
              <h4>Topdik-KU</h4>
              <a href="index.html" data-i18n="nav_home">${t('nav_home')}</a>
              <a href="auth.html" data-i18n="nav_login">${t('nav_login')}</a>
            </div>
          </div>
          <div class="footer__bottom">
            <span data-i18n="footer_rights">${t('footer_rights')}</span>
            <span>Made in Uzbekistan</span>
          </div>
        </div>
      </footer>
    `;
  },
  
  initCommon(activePage = '') {
    // Start cloud sync so other devices see listings
    if (window.Cloud && !Cloud._ready) {
      Cloud.init().catch(e => console.warn('Cloud init failed', e));
    }

    // Inject header/footer if placeholders exist
    const headerEl = document.getElementById('app-header');
    if (headerEl) headerEl.innerHTML = this.renderHeader(activePage);
    
    const footerEl = document.getElementById('app-footer');
    if (footerEl) footerEl.innerHTML = this.renderFooter();
    
    // Lang select
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.value = currentLang;
      langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
    }
    
    // Mobile menu
    const menuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    if (menuBtn && mobileNav) {
      menuBtn.addEventListener('click', () => mobileNav.classList.toggle('active'));
    }
    
    // Logout
    ['logoutBtn', 'logoutBtnMobile'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => {
        DataStore.logout();
        UI.toast(t('nav_logout'), 'info');
        setTimeout(() => location.href = 'index.html', 500);
      });
    });
    
    // Save buttons (delegation)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-save');
      if (!btn) return;
      const session = DataStore.getSession();
      if (!session) {
        UI.toast(t('nav_login'), 'info');
        return;
      }
      const id = btn.dataset.id;
      const saved = DataStore.toggleCollect(session.id, id);
      btn.innerHTML = `<svg width="18" height="18" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      btn.title = saved ? t('btn_saved') : t('btn_save');
      UI.toast(saved ? t('success_saved') : t('btn_save'), 'success');
    });
    
    updatePageTranslations();
  }
};

window.UI = UI;
