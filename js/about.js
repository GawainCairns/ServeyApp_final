/* about.js — fetches admin contact info and renders it on the About page */
(function(){
  'use strict';

  function createEl(tag, cls, text){
    const el = document.createElement(tag);
    if(cls) el.className = cls;
    if(text !== undefined) el.textContent = text;
    return el;
  }

  function normalizeEndpoint(e){
    if(!e) return e;
    // If endpoint lacks protocol, prefix http:// to localhost-like hosts
    if(e.startsWith('http://') || e.startsWith('https://')) return e;
    return 'http://' + e;
  }

  async function fetchAdmins(){
    // Mirror footer's endpoint if present; otherwise use same-origin /user/admin/info
    const DEFAULT = '/user/admin/info';
    // Attempt to use known host-based endpoint from footer if available
    let endpoint = typeof ADMIN_ENDPOINT !== 'undefined' ? ADMIN_ENDPOINT : null;
    if(endpoint && !endpoint.includes('://')) endpoint = normalizeEndpoint(endpoint);
    if(!endpoint) endpoint = (window.location.origin || '') + DEFAULT;

    try{
      const res = await fetch(endpoint, { cache: 'no-store' });
      if(!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      if(Array.isArray(data)) return data;
      if(data && Array.isArray(data.admins)) return data.admins;
      // If single object returned, wrap it
      if(data && data.email) return [data];
      return [];
    }catch(e){
      console.error('fetchAdmins error', e);
      return [];
    }
  }

  function renderAdmins(container, admins){
    container.innerHTML = '';
    if(!admins || !admins.length){
      container.textContent = 'No admin contact information available.';
      return;
    }
    const list = createEl('ul', 'admin-list');
    admins.forEach(a => {
      const li = createEl('li', 'admin-item');
      const name = createEl('div', 'admin-name', a.name || 'Unknown');
      const email = createEl('a', 'admin-email', a.email || '');
      if(a.email) email.href = `mailto:${a.email}`;
      li.appendChild(name);
      li.appendChild(email);
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  async function init(){
    const container = document.getElementById('admin-contacts');
    if(!container) return;
    container.textContent = 'Loading admin contacts...';
    const admins = await fetchAdmins();
    renderAdmins(container, admins);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
