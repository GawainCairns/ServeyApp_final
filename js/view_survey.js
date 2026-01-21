// View Survey page script
// Fetch survey by s_code, render questions and answers, submit responses

(function () {
	const API_BASE = 'http://localhost:3000';

	const el = {
		name: document.getElementById('servey-name'),
		desc: document.getElementById('servey-desc'),
		questions: document.getElementById('questions'),
		form: document.getElementById('respond-form'),
		message: document.getElementById('respond-message'),
		submit: document.getElementById('submit-responses'),
	};

	// Get s_code from query string ?code= or fallback to example code
	function getCodeFromUrl() {
		const params = new URLSearchParams(window.location.search);
		return params.get('code');
	}

	async function fetchJson(url, opts) {
		const res = await fetch(url, opts);
		if (!res.ok) throw new Error(`Request failed: ${res.status}`);
		return res.json();
	}

	function showMessage(text, isError) {
		if (!el.message) return;
		el.message.textContent = text;
		el.message.classList.remove('error','success');
		if (isError) el.message.classList.add('error');
		else el.message.classList.add('success');
	}

	function createTextQuestion(q) {
		const wrapper = document.createElement('div');
		wrapper.className = 'question question-text';
		const label = document.createElement('label');
		label.textContent = q.question;
		label.htmlFor = `q_${q.id}`;
		const textarea = document.createElement('textarea');
		textarea.name = `q_${q.id}`;
		textarea.id = `q_${q.id}`;
		textarea.rows = 4;
		wrapper.appendChild(label);
		wrapper.appendChild(textarea);
		return wrapper;
	}

	function createOptionsQuestion(q, answers) {
		const wrapper = document.createElement('fieldset');
		wrapper.className = 'question question-options';
		const legend = document.createElement('legend');
		legend.textContent = q.question;
		wrapper.appendChild(legend);

		(answers || []).forEach((ans) => {
			const id = `q_${q.id}_a_${ans.id}`;
			const label = document.createElement('label');
			label.htmlFor = id;
			const input = document.createElement('input');
			input.type = 'radio';
			input.name = `q_${q.id}`;
			input.id = id;
			input.value = ans.answer;
			label.appendChild(input);
			label.appendChild(document.createTextNode(' ' + ans.answer));
			const div = document.createElement('div');
			div.appendChild(label);
			wrapper.appendChild(div);
		});

		return wrapper;
	}

	async function init() {
		try {
			const s_code = getCodeFromUrl();
			// fetch survey by code
			const survey = await fetchJson(`${API_BASE}/survey/code/${s_code}`);
			// API might return array or object
			const s = Array.isArray(survey) ? survey[0] : survey;
			if (!s || !s.id) throw new Error('Survey not found');

			el.name.textContent = s.name || 'Untitled survey';
			if (el.name && el.name.classList) el.name.classList.add('accent');
			el.desc.textContent = s.discription || s.description || '';

			// fetch questions and answers
			const questions = await fetchJson(`${API_BASE}/survey/${s.id}/question`);
			const allAnswers = await fetchJson(`${API_BASE}/survey/${s.id}/answer`);

			// group answers by question_id
			const answersByQ = {};
			(allAnswers || []).forEach((a) => {
				if (!answersByQ[a.question_id]) answersByQ[a.question_id] = [];
				answersByQ[a.question_id].push(a);
			});

			// render questions
			el.questions.innerHTML = '';
			(questions || []).forEach((q, idx) => {
				let node;
				const t = (q.type || '').toLowerCase();
				if (t === 'text') {
					node = createTextQuestion(q);
				} else if (t === 'multiple' || t === 'boolean') {
					node = createOptionsQuestion(q, answersByQ[q.id]);
				} else {
					// fallback to text
					node = createTextQuestion(q);
				}

				// wrap each question in a styled card
				const card = document.createElement('div');
				card.className = 'card';
				// header with short meta
				const header = document.createElement('div');
				header.className = 'card-header';
				const title = document.createElement('div');
				title.className = 'card-title';
				title.textContent = `Question ${idx + 1}`;
				const sub = document.createElement('div');
				sub.className = 'card-sub';
				sub.textContent = q.type || '';
				header.appendChild(title);
				header.appendChild(sub);

				// card body
				const body = document.createElement('div');
				body.className = 'card-body';
				body.appendChild(node);

				card.appendChild(header);
				card.appendChild(body);

				// attach question id as data attribute for submit on the card
				card.dataset.qid = q.id;
				el.questions.appendChild(card);
			});

			// add action card for survey actions (delete / edit)
			const actionCard = document.createElement('div');
			actionCard.className = 'card action-card';
			const actionHeader = document.createElement('div');
			actionHeader.className = 'card-header';
			const actionTitle = document.createElement('div');
			actionTitle.className = 'card-title';
			actionTitle.textContent = 'Survey Actions';
			actionHeader.appendChild(actionTitle);
			const actionBody = document.createElement('div');
			actionBody.className = 'card-body';

			const deleteBtn = document.createElement('button');
			deleteBtn.className = 'btn btn-danger';
			deleteBtn.type = 'button';
			deleteBtn.textContent = 'Delete Survey';
			deleteBtn.style.marginRight = '8px';

			const editBtn = document.createElement('button');
			editBtn.className = 'btn btn-primary';
			editBtn.type = 'button';
			editBtn.textContent = 'Edit Survey';

			actionBody.appendChild(deleteBtn);
			actionBody.appendChild(editBtn);
			actionCard.appendChild(actionHeader);
			actionCard.appendChild(actionBody);
			el.questions.appendChild(actionCard);

			// delete handler with confirmation (include auth bearer token)
			deleteBtn.addEventListener('click', async () => {
				if (!s || !s.id) return showMessage('Survey ID missing', true);
				if (!confirm('Are you sure you want to delete this survey? This cannot be undone.')) return;
				try {
					const token = (window.Session && typeof Session.getToken === 'function') ? Session.getToken() : localStorage.getItem('token');
					const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
					const res = await fetch(`${API_BASE}/survey/${s.id}`, { method: 'DELETE', headers });
					if (!res.ok) {
						// try to read error message from body
						let msg = res.statusText || res.status;
						try { const body = await res.json(); if (body && body.error) msg = body.error; } catch(e){}
						throw new Error('Delete failed: ' + msg);
					}
					showMessage('Survey deleted.', false);
					setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
				} catch (err) {
					console.error(err);
					showMessage('Delete failed: ' + err.message, true);
				}
			});

			// edit handler: navigate to survey_create with id query
			editBtn.addEventListener('click', () => {
				if (!s || !s.id) return showMessage('Survey ID missing', true);
				window.location.href = `survey_create.html?id=${s.id}`;
			});

		} catch (err) {
			console.error(err);
			showMessage('Error loading survey: ' + err.message, true);
		}
	}

	// initialize on DOM ready
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();

})();
