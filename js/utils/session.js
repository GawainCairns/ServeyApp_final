// Session helper for SurveyApp — centralizes user/token storage
(function(){
    const KEY_USER = 'survey_user';
    const KEY_TOKEN = 'survey_token';

    function createSession(user, token){
        try{
            if(token) localStorage.setItem(KEY_TOKEN, token);
            if(user) localStorage.setItem(KEY_USER, JSON.stringify(user));
        }catch(e){ console.error('createSession error', e); }
    }

    function getUser(){
        try{
            const raw = localStorage.getItem(KEY_USER);
            return raw ? JSON.parse(raw) : null;
        }catch(e){ console.error('getUser parse error', e); return null; }
    }

    function getToken(){
        return localStorage.getItem(KEY_TOKEN);
    }

    function clearSession(){
        localStorage.removeItem(KEY_USER);
        localStorage.removeItem(KEY_TOKEN);
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
