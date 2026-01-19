// Session helper for SurveyApp — centralizes user/token storage
(function(){
    // Primary keys used by the app (kept for compatibility with existing code)
    const KEY_USER = 'user';
    const KEY_TOKEN = 'token';
    // Legacy/alternative keys (preserve if other code uses them)
    const LEGACY_USER = 'survey_user';
    const LEGACY_TOKEN = 'survey_token';

    function createSession(user, token){
        try{
            if(token){
                localStorage.setItem(KEY_TOKEN, token);
                localStorage.setItem(LEGACY_TOKEN, token);
            }
            if(user){
                localStorage.setItem(KEY_USER, JSON.stringify(user));
                localStorage.setItem(LEGACY_USER, JSON.stringify(user));
            }
        }catch(e){ console.error('createSession error', e); }
    }

    function getUser(){
        try{
            const raw = localStorage.getItem(KEY_USER) || localStorage.getItem(LEGACY_USER);
            return raw ? JSON.parse(raw) : null;
        }catch(e){ console.error('getUser parse error', e); return null; }
    }

    function getToken(){
        return localStorage.getItem(KEY_TOKEN) || localStorage.getItem(LEGACY_TOKEN);
    }

    function clearSession(){
        localStorage.removeItem(KEY_USER);
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(LEGACY_USER);
        localStorage.removeItem(LEGACY_TOKEN);
    }

    function isLoggedIn(){
        return !!getToken();
    }

    // Expose as global `Session` for existing scripts to call
    window.Session = {
        createSession,
        getUser,
        getToken,
        clearSession,
        isLoggedIn
    };
})();
