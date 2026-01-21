// Respond page script
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
		return params.get('code') || '09e6Nj1597';
	}

	async function fetchJson(url, opts) {
		const res = await fetch(url, opts);
		const txt = await res.text();
		let parsed;
		try { parsed = txt ? JSON.parse(txt) : null; } catch (e) { parsed = txt; }
		if (!res.ok) throw new Error(`Request failed: ${res.status} ${txt}`);
		return parsed;
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
			// use the answer id as the value so we can include answer_id in the POST
			input.value = ans.id;
			// keep the visible text on dataset for mapping later
			input.dataset.answer = ans.answer;
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
				header.appendChild(title);

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

			// handle submit
			el.form.addEventListener('submit', async (ev) => {
				ev.preventDefault();
				try {
					if (el.submit) { el.submit.disabled = true; el.submit.textContent = 'Submitting...'; }
					showMessage('Submitting responses...', false);
					// get next responder id (be defensive about server response shape)
					const r = await fetchJson(`${API_BASE}/response/r_id`);
					let lastR = 0;
					if (r !== null && r !== undefined) {
						if (typeof r === 'object') {
							if ('r_id' in r) lastR = Number(r.r_id) || 0;
							else if ('rId' in r) lastR = Number(r.rId) || 0;
							else {
								// sometimes server may return a bare number inside an object or empty object
								const keys = Object.keys(r);
								if (keys.length === 1) lastR = Number(r[keys[0]]) || 0;
							}
						} else if (typeof r === 'number') lastR = r;
						else if (typeof r === 'string') lastR = Number(r) || 0;
					}
					const responderId = Number(lastR) + 1;
					console.log('Responder id resolved:', { raw: r, lastR, responderId });

					// collect responses
					const formData = new FormData(el.form);
					const posts = [];
					// for each question element
					const qNodes = el.questions.querySelectorAll('[data-qid]');
					qNodes.forEach((qn) => {
						const qid = qn.dataset.qid;
						const name = `q_${qid}`;
						const value = formData.get(name);
						// only post if there is an answer
						if (value !== null && value !== undefined && String(value).trim() !== '') {
							let answerText = String(value);
							let answerId = null;
							// if we have answers mapped for this question, try to resolve id->text
							if (answersByQ && answersByQ[qid]) {
								const found = answersByQ[qid].find(a => String(a.id) === String(value));
								if (found) { answerText = found.answer; answerId = Number(found.id); }
							}

							const body = {
								id: 0,
								question_id: Number(qid),
								answer: answerText,
								responder_id: Number(responderId),
							};
							if (answerId !== null) body.answer_id = answerId;
							posts.push(body);
						}
					});

					if (posts.length === 0) {
						showMessage('Please answer at least one question before submitting.', true);
						if (el.submit) { el.submit.disabled = false; el.submit.textContent = 'Submit Responses'; }
						return;
					}

					// validate posts before sending
					for (const p of posts) {
						if (!p.question_id || !p.answer || !p.responder_id) {
							console.error('Invalid response payload, aborting:', p);
							showMessage('Invalid response payload; submission aborted. See console.', true);
							if (el.submit) { el.submit.disabled = false; el.submit.textContent = 'Submit Responses'; }
							return;
						}
					}

					// send posts sequentially (log payloads for debugging)
					for (const p of posts) {
						console.log('Posting response to', `${API_BASE}/response/${s.id}`, p);
						try {
							await fetchJson(`${API_BASE}/response/${s.id}`, {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify(p),
							});
						} catch (err) {
							console.error('Server rejected payload:', p, err.message);
							showMessage('Server error: ' + err.message, true);
							if (el.submit) { el.submit.disabled = false; el.submit.textContent = 'Submit Responses'; }
							return;
						}
					}

					showMessage('Responses submitted. Thank you!', false);
					el.form.reset();
					if (el.submit) { el.submit.disabled = false; el.submit.textContent = 'Submit Responses'; }
				} catch (err) {
					console.error(err);
					showMessage('Failed to submit responses: ' + err.message, true);
					if (el.submit) { el.submit.disabled = false; el.submit.textContent = 'Submit Responses'; }
				}
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
