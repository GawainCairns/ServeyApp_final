(function(){
    'use strict';

    const API_BASE = 'http://localhost:3000';

    function createEl(tag, cls, text){
        const el = document.createElement(tag);
        if(cls) el.className = cls;
        if(text !== undefined) el.textContent = text;
        return el;
    }

    async function fetchJson(url, opts){
        opts = opts || {};
        opts.headers = opts.headers || {};
        const token = (window.Session && window.Session.getToken) ? window.Session.getToken() : localStorage.getItem('token');
        if(token){ opts.headers['Authorization'] = 'Bearer ' + token; }

        try{
            const res = await fetch(url, Object.assign({ cache: 'no-store' }, opts));
            if(!res.ok) return null;
            const txt = await res.text();
            if(!txt) return null;
            try{ return JSON.parse(txt); }catch(e){ return txt; }
        }catch(e){ console.error('fetchJson error', e); return null; }
    }

    // Render table of all users with Select and Delete actions
    let usersList = null;
    async function loadUsers(){
        const root = document.getElementById('users-root');
        if(!root) return;
        root.innerHTML = 'Loading users...';

        const list = await fetchJson(API_BASE + '/admin/users');
        if(!Array.isArray(list) || list.length === 0){
            root.textContent = 'No users found.';
            return;
        }

        usersList = list.slice();

        const card = createEl('div', 'card');

        // Search bar
        const searchWrap = createEl('div','search-wrap');
        const searchInput = createEl('input','search-input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search users by email...';
        searchInput.addEventListener('input', ()=> renderUsers(usersList.filter(u => {
            const q = searchInput.value.trim().toLowerCase();
            if(!q) return true;
            return String(u.email || '').toLowerCase().indexOf(q) !== -1 || String(u.name || '').toLowerCase().indexOf(q) !== -1;
        })));
        searchWrap.appendChild(searchInput);
        card.appendChild(searchWrap);

        const table = createEl('table', 'survey-table');

        const thead = createEl('thead');
        const headRow = createEl('tr');
        ['ID','Name','Email','Role','Actions'].forEach(h=>{ const th=createEl('th','',h); headRow.appendChild(th); });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = createEl('tbody');

        list.forEach(u=>{
            const tr = createEl('tr');
            const tdId = createEl('td','', String(u.id || ''));
            const tdName = createEl('td','', u.name || '');
            const tdEmail = createEl('td','', u.email || '');
            const tdRole = createEl('td','', u.role || '');
            const tdActions = createEl('td');

            const selectBtn = createEl('button','btn small');
            selectBtn.type = 'button';
            selectBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2-square" viewBox="0 0 16 16">\n  <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>\n  <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>\n</svg>';
            selectBtn.setAttribute('title', 'Select');
            selectBtn.setAttribute('aria-label', 'Select');
            selectBtn.addEventListener('click', ()=> selectUser(u.id));

            const delBtn = createEl('button','btn btn-danger small');
            delBtn.type = 'button';
            delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">\n  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>\n  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>\n</svg>';
            delBtn.setAttribute('title', 'Delete');
            delBtn.setAttribute('aria-label', 'Delete');
            delBtn.addEventListener('click', ()=> deleteUser(u.id, u.name || u.email || 'this user'));

            tdActions.appendChild(selectBtn);
            tdActions.appendChild(delBtn);

            tr.appendChild(tdId);
            tr.appendChild(tdName);
            tr.appendChild(tdEmail);
            tr.appendChild(tdRole);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        card.appendChild(table);
        root.innerHTML = '';
        root.appendChild(card);

        // expose a render function for filtering
        function renderUsers(filtered){
            const tbodyNew = createEl('tbody');
            (Array.isArray(filtered) ? filtered : []).forEach(u=>{
                const tr = createEl('tr');
                const tdId = createEl('td','', String(u.id || ''));
                const tdName = createEl('td','', u.name || '');
                const tdEmail = createEl('td','', u.email || '');
                const tdRole = createEl('td','', u.role || '');
                const tdActions = createEl('td');

                const selectBtn = createEl('button','btn small');
                selectBtn.type = 'button';
                selectBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2-square" viewBox="0 0 16 16">\n  <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>\n  <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>\n</svg>';
                selectBtn.setAttribute('title', 'Select');
                selectBtn.setAttribute('aria-label', 'Select');
                selectBtn.addEventListener('click', ()=> selectUser(u.id));

                const delBtn = createEl('button','btn btn-danger small');
                delBtn.type = 'button';
                delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">\n  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>\n  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>\n</svg>';
                delBtn.setAttribute('title', 'Delete');
                delBtn.setAttribute('aria-label', 'Delete');
                delBtn.addEventListener('click', ()=> deleteUser(u.id, u.name || u.email || 'this user'));

                tdActions.appendChild(selectBtn);
                tdActions.appendChild(delBtn);

                tr.appendChild(tdId);
                tr.appendChild(tdName);
                tr.appendChild(tdEmail);
                tr.appendChild(tdRole);
                tr.appendChild(tdActions);

                tbodyNew.appendChild(tr);
            });
            // replace old tbody
            const oldTbody = card.querySelector('table tbody');
            if(oldTbody) oldTbody.replaceWith(tbodyNew);
            else card.querySelector('table').appendChild(tbodyNew);
        }

        // initial render
        renderUsers(usersList);
    }

    async function deleteUser(id, displayName){
        if(!confirm(`Delete ${displayName}? This action cannot be undone.`)) return;
        try{
            const token = (window.Session && window.Session.getToken) ? window.Session.getToken() : localStorage.getItem('token');
            const headers = {};
            if(token) headers['Authorization'] = 'Bearer ' + token;

            // First, fetch surveys for this user and delete them
            try{
                const surveys = await fetchJson(API_BASE + '/user/' + encodeURIComponent(id) + '/survey');
                if(Array.isArray(surveys) && surveys.length){
                    await Promise.all(surveys.map(async s => {
                        try{
                            const resS = await fetch(API_BASE + '/survey/' + encodeURIComponent(s.id), { method: 'DELETE', headers });
                            if(!resS.ok) console.error('Failed to delete survey', s.id);
                        }catch(e){ console.error('Error deleting survey', s.id, e); }
                    }));
                }
            }catch(e){ console.error('Error fetching/deleting user surveys', e); }

            // Then delete the user
            const res = await fetch(API_BASE + '/admin/user/' + encodeURIComponent(id), { method: 'DELETE', headers });
            if(!res.ok){
                alert('Failed to delete user.');
                return;
            }

            // Refresh lists
            await loadUsers();
            if(typeof loadAllSurveysAdmin === 'function') await loadAllSurveysAdmin();

            // Clear selected dashboard if it referenced the deleted user
            const sel = document.getElementById('selected-dashboard');
            if(sel && sel.style.display !== 'none'){
                const sub = document.getElementById('selected-user-sub');
                if(sub && sub.textContent && sub.textContent.indexOf(String(id)) !== -1){
                    document.getElementById('selected-dashboard').style.display = 'none';
                    document.getElementById('selected-dashboard-body').innerHTML = '';
                }
            }
        }catch(e){ console.error('deleteUser error', e); alert('Failed to delete user.'); }
    }

    // Select a user and render their dashboard (surveys, stats)
    async function selectUser(id){
        const info = await fetchJson(API_BASE + '/admin/user/' + encodeURIComponent(id));
        if(!info){ alert('Failed to load user.'); return; }
        renderSelectedHeader(info);
        await renderSelectedSurveys(id);
    }

    function renderSelectedHeader(user){
        const sel = document.getElementById('selected-dashboard');
        const sub = document.getElementById('selected-user-sub');
        if(!sel || !sub) return;
        sub.textContent = `${user.name || 'Unknown'} — ${user.email || ''} (id: ${user.id})`;
        sel.style.display = '';
    }

    async function renderSelectedSurveys(userId){
        const body = document.getElementById('selected-dashboard-body');
        if(!body) return;
        body.innerHTML = 'Loading surveys...';

        const surveys = await fetchJson(API_BASE + '/user/' + encodeURIComponent(userId) + '/survey');
        if(!Array.isArray(surveys) || surveys.length === 0){
            body.innerHTML = '<div class="card-sub">No surveys for this user.</div>';
            return;
        }

        // Enrich surveys with question and response counts in parallel
        const enriched = await Promise.all(surveys.map(async s => {
            const q = await fetchJson(API_BASE + '/survey/' + encodeURIComponent(s.id) + '/question');
            const r = await fetchJson(API_BASE + '/response/survey/' + encodeURIComponent(s.id));
            return { survey: s, questions: Array.isArray(q) ? q.length : 0, responses: Array.isArray(r) ? r.length : 0 };
        }));

        // Build grid of cards similar to user dashboard
        const grid = createEl('div','dashboard-grid');

        enriched.forEach(item=>{
            const s = item.survey;
            const card = createEl('div','card');
            const header = createEl('div','card-header');
            const title = createEl('div','card-title', s.name || 'Untitled survey');
            const meta = createEl('div','card-sub', `Questions: ${item.questions} Responses: ${item.responses}`);
            header.appendChild(title);
            header.appendChild(meta);

            const desc = createEl('div','card-sub', s.discription || '');
            const actions = createEl('div','actions');

            const origin = (window.location.origin || '');

            const edit = createEl('button','btn btn-outline');
            edit.type = 'button';
            edit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">\n  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>\n  <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>\n</svg>';
            edit.setAttribute('title', 'Edit');
            edit.setAttribute('aria-label', 'Edit');
            edit.addEventListener('click', ()=>{
                const code = s.s_code || s.code || s.id;
                window.location.href = origin + '/html/survey_edit.html?code=' + encodeURIComponent(code);
            });

            const view = createEl('button','btn');
            view.type = 'button';
            view.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">\n  <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>\n  <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>\n</svg>';
            view.setAttribute('title', 'View Survey');
            view.setAttribute('aria-label', 'View Survey');
            view.addEventListener('click', ()=>{
                const code = s.s_code || s.code || s.id;
                window.location.href = origin + '/html/view_survey.html?code=' + encodeURIComponent(code);
            });

            const dataBtn = createEl('button','btn btn-secondary');
            dataBtn.type = 'button';
            dataBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bar-chart-line" viewBox="0 0 16 16">\n  <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1zm1 12h2V2h-2zm-3 0V7H7v7zm-5 0v-3H2v3z"/>\n</svg>';
            dataBtn.setAttribute('title', 'View Survey Data');
            dataBtn.setAttribute('aria-label', 'View Survey Data');
            dataBtn.addEventListener('click', ()=>{
                window.location.href = origin + '/html/data.html?id=' + encodeURIComponent(s.id);
            });

            actions.appendChild(edit);
            actions.appendChild(view);
            actions.appendChild(dataBtn);

            card.appendChild(header);
            card.appendChild(desc);
            card.appendChild(actions);
            grid.appendChild(card);
        });

        body.innerHTML = '';
        body.appendChild(grid);

        // update simple stats in the selected header if needed
        const statsEl = document.getElementById('selected-stats');
        if(statsEl){
            const totalSurveys = enriched.length;
            const totalQuestions = enriched.reduce((a,i)=>a + (i.questions||0), 0);
            const totalResponses = enriched.reduce((a,i)=>a + (i.responses||0), 0);
            statsEl.innerHTML = `Surveys: ${totalSurveys} Questions: ${totalQuestions} Responses: ${totalResponses}`;
        }
    }

    function init(){
        // Ensure only admins can stay on this page; states.enforcePage already runs in the HTML, but double-check
        if(!(window.SiteState && window.SiteState.canAccessPage && window.SiteState.canAccessPage('admin'))){
            // If not allowed, redirect (states.enforcePage already handles this normally)
            if(window.SiteState && window.SiteState.enforcePage) window.SiteState.enforcePage('admin');
            return;
        }

        loadUsers();
        loadAllSurveysAdmin();
    }

    // Load all surveys for admin view
    let surveysList = null;
    async function loadAllSurveysAdmin(){
        const root = document.getElementById('surveys-root');
        if(!root) return;
        root.innerHTML = 'Loading surveys...';

        const list = await fetchJson(API_BASE + '/survey/');
        if(!Array.isArray(list) || list.length === 0){
            root.textContent = 'No surveys found.';
            return;
        }

        surveysList = list.slice();

        const card = createEl('div', 'card');

        // Search bar for surveys
        const searchWrap = createEl('div','search-wrap');
        const searchInput = createEl('input','search-input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search surveys by name...';
        searchInput.addEventListener('input', ()=> renderSurveys(surveysList.filter(s => {
            const q = searchInput.value.trim().toLowerCase();
            if(!q) return true;
            return String(s.name || '').toLowerCase().indexOf(q) !== -1 || String(s.creator || '').toLowerCase().indexOf(q) !== -1;
        })));
        searchWrap.appendChild(searchInput);
        card.appendChild(searchWrap);

        const table = createEl('table', 'survey-table');

        const thead = createEl('thead');
        const headRow = createEl('tr');
        ['ID','Survey','Creator','Actions'].forEach(h=>{ const th=createEl('th','',h); headRow.appendChild(th); });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = createEl('tbody');

        list.forEach(survey=>{
            const tr = createEl('tr');
            const tdId = createEl('td','', String(survey.id || ''));
            const tdTitle = createEl('td','', survey.name || 'Untitled survey');
            const tdCreator = createEl('td','', survey.creator || '');
            const tdActions = createEl('td');

            const selectBtn = createEl('button','btn small');
            selectBtn.type = 'button';
            selectBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2-square" viewBox="0 0 16 16">\n  <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>\n  <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>\n</svg>';
            selectBtn.setAttribute('title', 'Select');
            selectBtn.setAttribute('aria-label', 'Select');
            selectBtn.addEventListener('click', ()=>{
                const code = survey.s_code || survey.code || survey.id;
                const origin = (window.location.origin || '');
                // open edit configuration for this survey
                window.location.href = origin + '/html/survey_edit.html?code=' + encodeURIComponent(code);
            });

            const delBtn = createEl('button','btn btn-danger small');
            delBtn.type = 'button';
            delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">\n  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>\n  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>\n</svg>';
            delBtn.setAttribute('title', 'Delete');
            delBtn.setAttribute('aria-label', 'Delete');
            delBtn.addEventListener('click', ()=> deleteSurvey(survey.id, survey.name || 'this survey'));

            tdActions.appendChild(selectBtn);
            tdActions.appendChild(delBtn);

            tr.appendChild(tdId);
            tr.appendChild(tdTitle);
            tr.appendChild(tdCreator);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        card.appendChild(table);
        root.innerHTML = '';
        root.appendChild(card);

        function renderSurveys(filtered){
            const tbodyNew = createEl('tbody');
            (Array.isArray(filtered) ? filtered : []).forEach(survey=>{
                const tr = createEl('tr');
                const tdId = createEl('td','', String(survey.id || ''));
                const tdTitle = createEl('td','', survey.name || 'Untitled survey');
                const tdCreator = createEl('td','', survey.creator || '');
                const tdActions = createEl('td');

                const selectBtn = createEl('button','btn small');
                selectBtn.type = 'button';
                selectBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2-square" viewBox="0 0 16 16">\n  <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>\n  <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>\n</svg>';
                selectBtn.setAttribute('title', 'Select');
                selectBtn.setAttribute('aria-label', 'Select');
                selectBtn.addEventListener('click', ()=>{
                    const code = survey.s_code || survey.code || survey.id;
                    const origin = (window.location.origin || '');
                    window.location.href = origin + '/html/survey_edit.html?code=' + encodeURIComponent(code);
                });

                const delBtn = createEl('button','btn btn-danger small');
                delBtn.type = 'button';
                delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">\n  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>\n  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>\n</svg>';
                delBtn.setAttribute('title', 'Delete');
                delBtn.setAttribute('aria-label', 'Delete');
                delBtn.addEventListener('click', ()=> deleteSurvey(survey.id, survey.name || 'this survey'));

                tdActions.appendChild(selectBtn);
                tdActions.appendChild(delBtn);

                tr.appendChild(tdId);
                tr.appendChild(tdTitle);
                tr.appendChild(tdCreator);
                tr.appendChild(tdActions);

                tbodyNew.appendChild(tr);
            });
            const oldTbody = card.querySelector('table tbody');
            if(oldTbody) oldTbody.replaceWith(tbodyNew);
            else card.querySelector('table').appendChild(tbodyNew);
        }

        // initial render
        renderSurveys(surveysList);
    }

    async function deleteSurvey(id, displayName){
        if(!confirm(`Delete ${displayName}? This action cannot be undone.`)) return;
        try{
            const token = (window.Session && window.Session.getToken) ? window.Session.getToken() : localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if(token) headers['Authorization'] = 'Bearer ' + token;

            // Attempt to delete answers for questions (best-effort)
            try{
                const questions = await fetchJson(API_BASE + '/survey/' + encodeURIComponent(id) + '/question');
                if(Array.isArray(questions) && questions.length){
                    for(const q of questions){
                        try{
                            const answers = await fetchJson(API_BASE + '/survey/' + encodeURIComponent(id) + '/answer');
                            if(Array.isArray(answers) && answers.length){
                                for(const a of answers){
                                    try{
                                        const resA = await fetch(API_BASE + '/survey/' + encodeURIComponent(id) + '/answer/' + encodeURIComponent(a.id), { method: 'DELETE', headers });
                                        if(!resA.ok) console.error('Failed to delete answer', a.id);
                                    }catch(e){ console.error('Error deleting answer', a.id, e); }
                                }
                            }
                        }catch(e){ console.error('Error fetching answers for question', q && q.id, e); }
                    }
                }
            }catch(e){ console.error('Error fetching questions for survey', id, e); }

            // Attempt to delete responses for this survey (best-effort)
            try{
                const responses = await fetchJson(API_BASE + '/response/survey/' + encodeURIComponent(id));
                if(Array.isArray(responses) && responses.length){
                    for(const r of responses){
                        try{
                            // Try a conventional delete endpoint for individual response
                            const resR = await fetch(API_BASE + '/response/' + encodeURIComponent(r.id), { method: 'DELETE', headers });
                            if(!resR.ok) console.error('Failed to delete response', r.id);
                        }catch(e){ console.error('Error deleting response', r && r.id, e); }
                    }
                }
            }catch(e){ console.error('Error fetching responses for survey', id, e); }

            // Finally delete the survey itself
            const res = await fetch(API_BASE + '/survey/' + encodeURIComponent(id), { method: 'DELETE', headers });
            if(!res.ok){
                alert('Failed to delete survey.');
                return;
            }
            await loadAllSurveysAdmin();
        }catch(e){ console.error('deleteSurvey error', e); alert('Failed to delete survey.'); }
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
