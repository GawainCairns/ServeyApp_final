
/* Header injector: builds a site header and updates links based on auth state (uses SiteState) */
(function(){
	'use strict';

	function createEl(tag, cls, text){
		const el = document.createElement(tag);
		if(cls) el.className = cls;
		if(text !== undefined) el.textContent = text;
		return el;
	}

	function buildNav(){
		const nav = createEl('header', 'navbar');
		const container = createEl('div', 'container');
		nav.appendChild(container);

		const brand = createEl('div', 'brand');
		const logo = createEl('div', 'logo');
		brand.appendChild(logo);
		const title = createEl('div', '', 'Survey System');
		brand.appendChild(title);
		container.appendChild(brand);

		const links = createEl('nav', 'nav-links');

		const s = window.SiteState || { isLoggedIn: ()=>false, isAdmin: ()=>false, getUser: ()=>null };
		const logged = !!s.isLoggedIn();
		const admin = !!s.isAdmin();
		const user = s.getUser ? s.getUser() : null;

		function addLink(text, href){
			const a = createEl('a', '', text);
			a.href = href;
			links.appendChild(a);
		}

		// Common: Home
		addLink('Home', (window.location.origin || '') + '/html/index.html');

		if(!logged){
			addLink('About', (window.location.origin || '') + '/html/about.html');
			addLink('Login', (window.location.origin || '') + '/html/login.html');
			addLink('Register', (window.location.origin || '') + '/html/register.html');
		} else {
			addLink('Dashboard', (window.location.origin || '') + '/html/dashboard.html');
			addLink('Create', (window.location.origin || '') + '/html/survey_create.html');
			if(admin){
				addLink('Admin', (window.location.origin || '') + '/html/admin.html');
			}
			// Profile with user name
			const profileText = user && user.name ? `Profile - ${user.name}` : 'Profile';
			addLink(profileText, (window.location.origin || '') + '/html/profile.html');

			// Logout as a button-like link
			const logout = createEl('a', 'cta', 'Logout');
			logout.href = '#';
			logout.addEventListener('click', function(ev){
				ev.preventDefault();
				// Clear auth and user info
				try{ localStorage.removeItem('token'); localStorage.removeItem('user'); }catch(e){}
				// Notify other windows
				try{ window.localStorage.setItem('logout', Date.now()); }catch(e){}
				// Redirect to home
				window.location.href = (window.location.origin || '') + '/html/index.html';
			});
			links.appendChild(logout);
		}

		container.appendChild(links);
		return nav;
	}

	function init(){
		const newHeader = buildNav();
		const existing = document.querySelector('.navbar');
		if(existing){ existing.replaceWith(newHeader); }
		else { document.body.insertBefore(newHeader, document.body.firstChild); }
	}

	// Update header when storage changes (login/logout in another tab)
	window.addEventListener('storage', function(e){
		if(e.key === 'token' || e.key === 'user' || e.key === 'logout'){ init(); }
	});

	if(document.readyState === 'loading'){
		document.addEventListener('DOMContentLoaded', init);
	} else { init(); }

})();

