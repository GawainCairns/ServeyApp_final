/* Footer injector: builds a site footer, fetches up to 2 admins and shows features list */
(function(){
  'use strict';

  const ADMIN_ENDPOINT = 'http://localhost:3000/user/admin/info';
  const MAX_ADMINS = 2;
  function createEl(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  async function fetchAdmins() {
    try {
      const res = await fetch(ADMIN_ENDPOINT, { cache: 'no-cache' });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data.slice(0, MAX_ADMINS);
      if (data && Array.isArray(data.admins)) return data.admins.slice(0, MAX_ADMINS);
      return [];
    } catch (e) {
      return [];
    }
  }

  function buildFooter(admins) {
    const footer = createEl('footer', 'site-footer');
    footer.id = 'site-footer';
    const container = createEl('div', 'container');
    footer.appendChild(container);

    // Brand column
    const brandCol = createEl('div', 'col footer-brand');
    const logo = createEl('div', 'logo');
    logo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="site-logo-svg">\n  <path d="M4.318 2.687C5.234 2.271 6.536 2 8 2s2.766.27 3.682.687C12.644 3.125 13 3.627 13 4c0 .374-.356.875-1.318 1.313C10.766 5.729 9.464 6 8 6s-2.766-.27-3.682-.687C3.356 4.875 3 4.373 3 4c0-.374.356-.875 1.318-1.313M13 5.698V7c0 .374-.356.875-1.318 1.313C10.766 8.729 9.464 9 8 9s-2.766-.27-3.682-.687C3.356 7.875 3 7.373 3 7V5.698c.271.202.58.378.904.525C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777A5 5 0 0 0 13 5.698M14 4c0-1.007-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1s-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4v9c0 1.007.875 1.755 1.904 2.223C4.978 15.71 6.427 16 8 16s3.022-.289 4.096-.777C13.125 14.755 14 14.007 14 13zm-1 4.698V10c0 .374-.356.875-1.318 1.313C10.766 11.729 9.464 12 8 12s-2.766-.27-3.682-.687C3.356 10.875 3 10.373 3 10V8.698c.271.202.58.378.904.525C4.978 9.71 6.427 10 8 10s3.022-.289 4.096-.777A5 5 0 0 0 13 8.698m0 3V13c0 .374-.356.875-1.318 1.313C10.766 14.729 9.464 15 8 15s-2.766-.27-3.682-.687C3.356 13.875 3 13.373 3 13v-1.302c.271.202.58.378.904.525C4.978 12.71 6.427 13 8 13s3.022-.289 4.096-.777c.324-.147.633-.323.904-.525"/>\n</svg>';
    const brandTitle = createEl('div', 'brand-title', 'SurveyApp');
    brandCol.appendChild(logo);
    brandCol.appendChild(brandTitle);

    // Features column
    const left = createEl('div', 'col features-col');
    const title = createEl('div', 'card-title', 'Features');
    left.appendChild(title);
    const feat = createEl('ul', 'feature-list');
    const features = [
      'Create surveys',
      'Share surveys',
      'Collect responses',
      'Basic analytics'
    ];
    features.forEach(f => {
      const li = createEl('li', '', f);
      feat.appendChild(li);
    });
    left.appendChild(feat);

    // Admins column
    const right = createEl('div', 'col admins-col');
    const adminTitle = createEl('div', 'card-title', 'Admins');
    right.appendChild(adminTitle);
    if (admins && admins.length) {
      admins.forEach(a => {
        const aWrap = createEl('div', 'admin-item');
        const name = createEl('div', 'admin-name', a.name || 'Unknown');
        const email = createEl('a', 'admin-email', a.email || '');
        if (a.email) email.href = `mailto:${a.email}`;
        aWrap.appendChild(name);
        aWrap.appendChild(email);
        right.appendChild(aWrap);
      });
    } else {
      right.appendChild(createEl('div', 'admin-none', 'No admin info available'));
    }

    // Main row
    const main = createEl('div', 'footer-main');
    main.appendChild(brandCol);
    main.appendChild(left);
    main.appendChild(right);
    container.appendChild(main);

    // Separator and bottom row with copyright
    const sep = document.createElement('hr');
    sep.className = 'footer-sep';
    container.appendChild(sep);

    const bottom = createEl('div', 'footer-bottom');
    const copyright = createEl('div', 'card-sub', `© ${new Date().getFullYear()} SurveyApp`);
    bottom.appendChild(copyright);
    container.appendChild(bottom);

    return footer;
  }

  // Inject footer at end of body. If a .site-footer already exists, replace it.
  async function init() {
    const admins = await fetchAdmins();
    const newFooter = buildFooter(admins);
    const existing = document.querySelector('.site-footer') || document.getElementById('site-footer');
    if (existing) {
      try { existing.replaceWith(newFooter); }
      catch (e) { existing.parentNode && existing.parentNode.insertBefore(newFooter, existing.nextSibling); }
    } else {
      document.body.appendChild(newFooter);
    }
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
