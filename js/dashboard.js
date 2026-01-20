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
		const meta = createEl('div', 'card-sub', `Questions: ${item.questions} · Responses: ${item.responses}`);
		header.appendChild(title);
		header.appendChild(meta);

		const desc = createEl('div', 'card-sub', s.discription || '');

		const actions = createEl('div', 'actions');

		const origin = (window.location.origin || '');

		const edit = createEl('button', 'btn btn-outline', 'Edit');
		edit.addEventListener('click', ()=>{
			window.location.href = origin + '/html/survey_create.html?id=' + encodeURIComponent(s.id);
		});

		const view = createEl('button', 'btn', 'View');
		view.addEventListener('click', ()=>{
			window.location.href = origin + '/html/respond.html?id=' + encodeURIComponent(s.id);
		});

		const dataBtn = createEl('button', 'btn btn-secondary', 'View Data');
		dataBtn.addEventListener('click', ()=>{
			window.location.href = origin + '/html/data.html?id=' + encodeURIComponent(s.id);
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
			// render as grid of cards
			surveysData.forEach(item=>{
				const c = buildCard(item);
				surveysRoot.appendChild(c);
			});
		} else {
			// render as list: full-width cards stacked
			surveysData.forEach(item=>{
				const wrapper = createEl('div', 'col');
				const c = buildCard(item);
				c.style.width = '100%';
				wrapper.appendChild(c);
				surveysRoot.appendChild(wrapper);
			});
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
