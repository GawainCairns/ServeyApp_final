// Role & page access helpers for SurveyApp
(function(window){
	'use strict';

	function getUser(){
		try{
			const raw = localStorage.getItem('user');
			if(!raw) return null;
			return JSON.parse(raw);
		}catch(e){ return null; }
	}

	function getRole(){
		const u = getUser();
		return (u && u.role) ? u.role : 'guest';
	}

	function isLoggedIn(){
		return !!(localStorage.getItem('token') && getUser());
	}

	function isAdmin(){
		return getRole() === 'admin';
	}

	// pageName values: 'admin', 'dashboard', 'login', 'register', 'respond', others
	function canAccessPage(pageName){
		const logged = isLoggedIn();
		const admin = isAdmin();

		switch((pageName||'').toLowerCase()){
			case 'admin':
				return admin;
			case 'dashboard':
				return logged; // admin and normal logged users
			case 'login':
			case 'register':
				return !logged; // only when NOT logged in
			case 'respond':
				return true; // public survey response
			default:
				// By default require login (pages like profile, create survey, etc.)
				return logged;
		}
	}

	// Convenience: enforce access on page load. If unauthorized, redirect.
	function enforcePage(pageName, opts){
		opts = opts || {};
		const redirectTo = opts.redirectTo || (isLoggedIn() ? '../html/dashboard.html' : '../html/login.html');
		if(!canAccessPage(pageName)){
			window.location.href = opts.redirectTo || redirectTo;
			return false;
		}
		return true;
	}

	// Expose API
	window.SiteState = {
		getUser,
		getRole,
		isLoggedIn,
		isAdmin,
		canAccessPage,
		enforcePage
	};

})(window);

