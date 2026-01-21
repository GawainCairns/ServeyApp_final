
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
		// inject site SVG logo (external file used as source for favicon too)
		logo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="site-logo-svg">\n  <path d="M4.318 2.687C5.234 2.271 6.536 2 8 2s2.766.27 3.682.687C12.644 3.125 13 3.627 13 4c0 .374-.356.875-1.318 1.313C10.766 5.729 9.464 6 8 6s-2.766-.27-3.682-.687C3.356 4.875 3 4.373 3 4c0-.374.356-.875 1.318-1.313M13 5.698V7c0 .374-.356.875-1.318 1.313C10.766 8.729 9.464 9 8 9s-2.766-.27-3.682-.687C3.356 7.875 3 7.373 3 7V5.698c.271.202.58.378.904.525C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777A5 5 0 0 0 13 5.698M14 4c0-1.007-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1s-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4v9c0 1.007.875 1.755 1.904 2.223C4.978 15.71 6.427 16 8 16s3.022-.289 4.096-.777C13.125 14.755 14 14.007 14 13zm-1 4.698V10c0 .374-.356.875-1.318 1.313C10.766 11.729 9.464 12 8 12s-2.766-.27-3.682-.687C3.356 10.875 3 10.373 3 10V8.698c.271.202.58.378.904.525C4.978 9.71 6.427 10 8 10s3.022-.289 4.096-.777A5 5 0 0 0 13 8.698m0 3V13c0 .374-.356.875-1.318 1.313C10.766 14.729 9.464 15 8 15s-2.766-.27-3.682-.687C3.356 13.875 3 13.373 3 13v-1.302c.271.202.58.378.904.525C4.978 12.71 6.427 13 8 13s3.022-.289 4.096-.777c.324-.147.633-.323.904-.525"/>\n</svg>';
		brand.appendChild(logo);
		const title = createEl('div', '', 'SurveyApp');
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
			const profileText = user && user.name ? `${user.name}` : 'Profile';
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

		// ensure a favicon link exists using the svg file
		try{
			const origin = (window.location.origin || '');
			const href = origin + '/img/logo.svg';
			let link = document.querySelector('link[rel="icon"][data-generated="true"]');
			if(!link){
				// remove any existing inline favicon we manage
				const old = document.querySelector('link[rel="icon"][data-generated]');
				if(old) old.remove();
				link = document.createElement('link');
				link.rel = 'icon';
				link.type = 'image/svg+xml';
				link.href = href;
				link.setAttribute('data-generated', 'true');
				document.head.appendChild(link);
			} else {
				link.href = href;
			}
		}catch(e){ /* ignore if DOM head not available */ }
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

