/* Dashboard logic: fetch user surveys, questions and responses, render cards and list view */
(function(){
	'use strict';

	const API_BASE = 'http://localhost:3000';
	const surveysRoot = document.getElementById('surveys');
	const surveysEmpty = document.getElementById('surveys-empty');
	const userInfo = document.getElementById('user-info');
	const createBtn = document.getElementById('create-survey-btn');
	const toggleBtn = document.getElementById('toggle-view');

	let viewMode = 'grid'; // or 'list'
	let surveysData = [];

	function createEl(tag, cls, text){
		const el = document.createElement(tag);
		if(cls) el.className = cls;
		if(text !== undefined) el.textContent = text;
		return el;
	}

	function showUser(u){
		if(!u){ userInfo.textContent = 'Not signed in'; return; }
		userInfo.innerHTML = '';
		const name = createEl('div', '', u.name || 'Unnamed');
		const email = createEl('div', 'card-sub', u.email || '');
		userInfo.appendChild(name);
		userInfo.appendChild(email);
	}

	async function fetchJson(url){
		try{
			const res = await fetch(url, { cache: 'no-store' });
			if(!res.ok) return null;
			return await res.json();
		}catch(e){ return null; }
	}

	async function loadSurveys(userId){
		surveysRoot.innerHTML = '';
		surveysEmpty.style.display = 'none';
		const list = await fetchJson(`${API_BASE}/user/${encodeURIComponent(userId)}/survey`);
		if(!Array.isArray(list) || list.length === 0){
			surveysData = [];
			surveysEmpty.style.display = '';
			return;
		}

		// Enrich each survey with question and response counts in parallel
		const enriched = await Promise.all(list.map(async s => {
			const q = await fetchJson(`${API_BASE}/survey/${encodeURIComponent(s.id)}/question`);
			const r = await fetchJson(`${API_BASE}/response/survey/${encodeURIComponent(s.id)}`);
			const qCount = Array.isArray(q) ? q.length : 0;
			const rCount = Array.isArray(r) ? r.length : 0;
			return { survey: s, questions: qCount, responses: rCount };
		}));

			surveysData = enriched;
			updateStats();
			renderSurveys();
	}

		function updateStats(){
			const totalSurveys = surveysData.length || 0;
			const totalQuestions = surveysData.reduce((acc,i)=> acc + (i.questions || 0), 0);
			const totalResponses = surveysData.reduce((acc,i)=> acc + (i.responses || 0), 0);
			const elSurveys = document.getElementById('stat-surveys');
			const elQuestions = document.getElementById('stat-questions');
			const elResponses = document.getElementById('stat-responses');
			if(elSurveys) elSurveys.textContent = totalSurveys;
			if(elQuestions) elQuestions.textContent = totalQuestions;
			if(elResponses) elResponses.textContent = totalResponses;
		}

	function buildCard(item){
		const s = item.survey;
		const card = createEl('div', 'card', undefined);

		const header = createEl('div', 'card-header');
		const title = createEl('div', 'card-title', s.name || 'Untitled survey');
		const meta = createEl('div', 'card-sub', `Questions: ${item.questions} Responses: ${item.responses}`);
		header.appendChild(title);
		header.appendChild(meta);

		const desc = createEl('div', 'card-sub', s.discription || '');

		const actions = createEl('div', 'actions');

		const origin = (window.location.origin || '');

		const edit = createEl('button', 'btn btn-outline');
		edit.type = 'button';
		edit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">\n  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>\n  <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>\n</svg>';
		edit.setAttribute('title', 'Edit');
		edit.setAttribute('aria-label', 'Edit');
		edit.addEventListener('click', ()=>{
			const code = s.s_code || s.code || s.id;
			window.location.href = origin + '/html/survey_edit.html?code=' + encodeURIComponent(code);
		});

		const view = createEl('button', 'btn');
		view.type = 'button';
		view.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">\n  <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>\n  <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>\n</svg>';
		view.setAttribute('title', 'View Survey');
		view.setAttribute('aria-label', 'View Survey');
		view.addEventListener('click', ()=>{
			// redirect to the view survey page; prefer survey code if available
			const code = s.s_code || s.code || s.id;
			window.location.href = origin + '/html/view_survey.html?code=' + encodeURIComponent(code);
		});

		const dataBtn = createEl('button', 'btn btn-secondary');
		dataBtn.type = 'button';
		dataBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bar-chart-line" viewBox="0 0 16 16">\n  <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1zm1 12h2V2h-2zm-3 0V7H7v7zm-5 0v-3H2v3z"/>\n</svg>';
		dataBtn.setAttribute('title', 'View Survey Data');
		dataBtn.setAttribute('aria-label', 'View Survey Data');
		dataBtn.addEventListener('click', ()=>{
			const code = s.s_code || s.code || s.id;
			window.location.href = origin + '/html/data.html?s_code=' + encodeURIComponent(code);
		});

		actions.appendChild(edit);
		actions.appendChild(view);
		actions.appendChild(dataBtn);

		card.appendChild(header);
		card.appendChild(desc);
		card.appendChild(actions);

		return card;
	}

	function renderSurveys(){
		surveysRoot.innerHTML = '';
		if(!surveysData || surveysData.length === 0){
			surveysEmpty.style.display = '';
			return;
		}
		surveysEmpty.style.display = 'none';

		if(viewMode === 'grid'){
			// render as grid of cards (original appearance)
			surveysData.forEach(item=>{
				const c = buildCard(item);
				surveysRoot.appendChild(c);
			});
		} else {
			// render as a table inside a card listing all surveys with action buttons
			const listCard = createEl('div', 'card');
			const header = createEl('div', 'card-header');
			const title = createEl('div', 'card-title', 'My Surveys');
			header.appendChild(title);
			listCard.appendChild(header);

			const table = createEl('table', 'survey-table');
			const thead = createEl('thead');
			const headRow = createEl('tr');
			const th1 = createEl('th', '', 'Survey');
			const th2 = createEl('th', '', 'Questions');
			const th3 = createEl('th', '', 'Responses');
			const th4 = createEl('th', '', 'Actions');
			headRow.appendChild(th1);
			headRow.appendChild(th2);
			headRow.appendChild(th3);
			headRow.appendChild(th4);
			thead.appendChild(headRow);
			table.appendChild(thead);

			const tbody = createEl('tbody');
			const origin = (window.location.origin || '');

			surveysData.forEach(item=>{
				const s = item.survey;
				const tr = createEl('tr');

				const tdTitle = createEl('td', '', s.name || 'Untitled survey');
				const tdQ = createEl('td', '', String(item.questions || 0));
				const tdR = createEl('td', '', String(item.responses || 0));

				const tdActions = createEl('td');

				const edit = createEl('button', 'btn btn-outline');
				edit.type = 'button';
				edit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">\n  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>\n  <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>\n</svg>';
				edit.setAttribute('title', 'Edit');
				edit.setAttribute('aria-label', 'Edit');
				edit.addEventListener('click', ()=>{
					const code = s.s_code || s.code || s.id;
					window.location.href = origin + '/html/survey_edit.html?code=' + encodeURIComponent(code);
				});

				const view = createEl('button', 'btn');
				view.type = 'button';
				view.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">\n  <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>\n  <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>\n</svg>';
				view.setAttribute('title', 'View Survey');
				view.setAttribute('aria-label', 'View Survey');
				view.addEventListener('click', ()=>{
					const code = s.s_code || s.code || s.id;
					window.location.href = origin + '/html/view_survey.html?code=' + encodeURIComponent(code);
				});

				const dataBtn = createEl('button', 'btn btn-secondary');
				dataBtn.type = 'button';
				dataBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bar-chart-line" viewBox="0 0 16 16">\n  <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1zm1 12h2V2h-2zm-3 0V7H7v7zm-5 0v-3H2v3z"/>\n</svg>';
				dataBtn.setAttribute('title', 'View Survey Data');
				dataBtn.setAttribute('aria-label', 'View Survey Data');
				dataBtn.addEventListener('click', ()=>{
					const code = s.s_code || s.code || s.id;
					window.location.href = origin + '/html/data.html?s_code=' + encodeURIComponent(code);
				});

				tdActions.appendChild(edit);
				tdActions.appendChild(view);
				tdActions.appendChild(dataBtn);

				tr.appendChild(tdTitle);
				tr.appendChild(tdQ);
				tr.appendChild(tdR);
				tr.appendChild(tdActions);

				tbody.appendChild(tr);
			});

			table.appendChild(tbody);
			listCard.appendChild(table);
			surveysRoot.appendChild(listCard);
		}
	}

	function setup(){
		const user = (window.Session && window.Session.getUser) ? window.Session.getUser() : null;
		showUser(user);

		if(!user || !user.id){
			// no user, show message and stop
			surveysEmpty.textContent = 'Please sign in to see your surveys.';
			surveysEmpty.style.display = '';
			return;
		}

		loadSurveys(user.id);

		createBtn.addEventListener('click', ()=>{
			const origin = (window.location.origin || '');
			window.location.href = origin + '/html/survey_create.html';
		});

		toggleBtn.addEventListener('click', ()=>{
			viewMode = viewMode === 'grid' ? 'list' : 'grid';
			toggleBtn.textContent = viewMode === 'grid' ? 'Switch to List' : 'Switch to Grid';
			renderSurveys();
		});
	}

	if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
	else setup();

})();
