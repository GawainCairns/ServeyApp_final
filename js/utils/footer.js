/* Footer injector: builds a site footer, fetches up to 2 admins and shows features list */
(function(){
  'use strict';

  const ADMIN_ENDPOINT = 'localhost:3000/user/admin/info';
  const MAX_ADMINS = 2;

  function createEl(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  async function fetchAdmins() {
    try {
      const res = await fetch(ADMIN_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      if (Array.isArray(data)) return data.slice(0, MAX_ADMINS);
      // If API returns object with list property, try to extract
      if (data && Array.isArray(data.admins)) return data.admins.slice(0, MAX_ADMINS);
      return [];
    } catch (e) {
      return [];
    }
  }

  function buildFooter(admins) {
    const footer = createEl('footer', 'site-footer');
    const container = createEl('div', 'container');
    footer.appendChild(container);

    const left = createEl('div', 'col');
    const title = createEl('div', 'card-title', 'Survey System — Features');
    left.appendChild(title);
    const feat = createEl('ul', 'feature-list');
    const features = [
      'Create and publish surveys',
      'Share surveys via code or link',
      'Collect and view responses',
      'Basic analytics and export',
      'User and admin management'
    ];
    features.forEach(f => {
      const li = createEl('li', '', f);
      feat.appendChild(li);
    });
    left.appendChild(feat);

    const right = createEl('div', 'col');
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

    container.appendChild(left);
    container.appendChild(right);

    const small = createEl('div', 'col');
    const copyright = createEl('div', 'card-sub', `© ${new Date().getFullYear()} Survey System`);
    small.appendChild(copyright);
    container.appendChild(small);

    return footer;
  }

  // Inject footer at end of body. If a .site-footer already exists, replace it.
  async function init() {
    const admins = await fetchAdmins();
    const newFooter = buildFooter(admins);
    const existing = document.querySelector('.site-footer');
    if (existing) {
      existing.replaceWith(newFooter);
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
