document.addEventListener('DOMContentLoaded', initDataPage);

const API_BASE = 'http://localhost:3000';

async function initDataPage() {
	const params = new URLSearchParams(window.location.search);
	const s_code = params.get('s_code');

	const nameEl = document.getElementById('survey-name');
	const descEl = document.getElementById('survey-desc');
	const questionsList = document.getElementById('questions-list');
	const questionDetail = document.getElementById('question-detail');

	if (!s_code) {
		nameEl.textContent = 'No survey selected';
		descEl.textContent = 'Open the dashboard and select a survey.';
		return;
	}

	try {
		const surveysResp = await fetch(`${API_BASE}/survey/`);
		if(!surveysResp.ok) throw new Error('Failed to load surveys: ' + surveysResp.status);
		const surveys = await surveysResp.json();
		const survey = surveys.find(s => String(s.s_code) === String(s_code));

		if (!survey) {
			nameEl.textContent = 'Survey not found';
			descEl.textContent = `No survey found for code ${s_code}`;
			return;
		}

		nameEl.textContent = survey.name || 'Unnamed survey';
		descEl.textContent = survey.discription || survey.description || '';

		const surveyId = survey.id;

		const [qRes, aRes, rRes] = await Promise.all([
			fetch(`${API_BASE}/survey/${surveyId}/question`),
			fetch(`${API_BASE}/survey/${surveyId}/answer`),
			fetch(`${API_BASE}/response/survey/${surveyId}`)
		]);

		const questions = (qRes && qRes.ok) ? await qRes.json() : [];
		const answers = (aRes && aRes.ok) ? await aRes.json() : [];
		const responses = (rRes && rRes.ok) ? await rRes.json() : [];

		if (!Array.isArray(questions)) {
			questionsList.textContent = 'No questions found for this survey.';
			return;
		}

		// Render questions as a table similar to admin survey table
		questionsList.innerHTML = '';
		const table = document.createElement('table');
		table.className = 'survey-table';

		const thead = document.createElement('thead');
		const headRow = document.createElement('tr');
		['#', 'Question', 'Type', 'Actions'].forEach(h => { const th = document.createElement('th'); th.textContent = h; headRow.appendChild(th); });
		thead.appendChild(headRow);
		table.appendChild(thead);

		const tbody = document.createElement('tbody');

		questions.forEach((q, idx) => {
			const tr = document.createElement('tr');
			const tdIdx = document.createElement('td'); tdIdx.textContent = String(idx + 1);
			const tdQ = document.createElement('td'); tdQ.textContent = q.question || '';
			const tdType = document.createElement('td'); tdType.textContent = q.type || '';
			const tdActions = document.createElement('td');

			const selectBtn = document.createElement('button');
			selectBtn.type = 'button';
			selectBtn.className = 'btn small';
			selectBtn.setAttribute('title', 'Select');
			selectBtn.setAttribute('aria-label', 'Select');
			selectBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2-square" viewBox="0 0 16 16">\n  <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>\n  <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>\n</svg>';
			selectBtn.addEventListener('click', () => showQuestionDetail(q, answers, responses, questionDetail));

			tdActions.appendChild(selectBtn);

			tr.appendChild(tdIdx);
			tr.appendChild(tdQ);
			tr.appendChild(tdType);
			tr.appendChild(tdActions);

			// allow row click to also select question
			tr.style.cursor = 'pointer';
			tr.addEventListener('click', (ev) => {
				// avoid double-trigger when clicking the button
				if (ev.target && ev.target.closest('button')) return;
				showQuestionDetail(q, answers, responses, questionDetail);
			});

			tbody.appendChild(tr);
		});

		table.appendChild(tbody);
		questionsList.appendChild(table);

		// Show first question automatically
		if (questions.length) showQuestionDetail(questions[0], answers, responses, questionDetail);

	} catch (err) {
		console.error('data page error', err);
		nameEl.textContent = 'Error loading survey';
		descEl.textContent = err.message || String(err);
	}
}

function showQuestionDetail(question, allAnswers, allResponses, container) {
	container.innerHTML = '';
	const title = document.createElement('h3');
	title.textContent = question.question;
	container.appendChild(title);

	const type = (question.type || '').toLowerCase();

	if (type === 'text' || type === 'textarea' || type === 'string') {
		// show navigable text responses
		const qResponses = (allResponses || []).filter(r => String(r.question_id) === String(question.id));
		if (!qResponses.length) {
			const p = document.createElement('p'); p.textContent = 'No text responses yet.'; container.appendChild(p); return;
		}

		let idx = 0;
		const wrapper = document.createElement('div');
		wrapper.className = 'text-response-view';

		const nav = document.createElement('div');
		nav.className = 'nav-controls';
		const left = document.createElement('button'); left.textContent = '◀';
		const right = document.createElement('button'); right.textContent = '▶';
		const counter = document.createElement('span'); counter.style.margin = '0 8px';

		const textBox = document.createElement('div');
		textBox.className = 'text-response-box';
		textBox.style.border = '1px solid #ddd';
		textBox.style.padding = '1rem';
		textBox.style.minHeight = '4rem';

		function renderIdx() {
			const r = qResponses[idx];
			textBox.textContent = r.answer || r.response || '[empty]';
			counter.textContent = `${idx + 1} / ${qResponses.length}`;
		}

		left.addEventListener('click', () => { idx = (idx - 1 + qResponses.length) % qResponses.length; renderIdx(); });
		right.addEventListener('click', () => { idx = (idx + 1) % qResponses.length; renderIdx(); });

		nav.appendChild(left); nav.appendChild(counter); nav.appendChild(right);
		wrapper.appendChild(nav); wrapper.appendChild(textBox);
		container.appendChild(wrapper);
		renderIdx();
		return;
	}

	// non-text: aggregate and draw a chart
	const qAnswers = (allAnswers || []).filter(a => String(a.question_id) === String(question.id));
	const qResponses = (allResponses || []).filter(r => String(r.question_id) === String(question.id));

	// Build labels and counts
	const labels = qAnswers.length ? qAnswers.map(a => a.answer) : Array.from(new Set(qResponses.map(r => r.answer))).filter(Boolean);
	const counts = labels.map(label => qResponses.filter(r => String(r.answer) === String(label)).length);

	// improved graph type picker (segmented buttons)
	const controls = document.createElement('div'); controls.className = 'chart-controls graph-toggle';
	const barBtn = document.createElement('button'); barBtn.type = 'button'; barBtn.className = 'btn btn-toggle'; barBtn.textContent = 'Bar';
	const pieBtn = document.createElement('button'); pieBtn.type = 'button'; pieBtn.className = 'btn btn-toggle'; pieBtn.textContent = 'Pie';

	const chartDiv = document.createElement('div');
	chartDiv.style.width = '100%';
	chartDiv.style.minHeight = '320px';
	container.appendChild(controls); container.appendChild(chartDiv);

	const graphTypes = ['pie','bar'];
	let graphIdx = 0; // 0 -> pie, 1 -> bar

	let chart = null;
	function drawCurrent() {
		const t = graphTypes[graphIdx];
		if (chart && typeof chart.destroy === 'function') {
			try { chart.destroy(); } catch (e) { /* ignore */ }
			chart = null;
		}

		if (t === 'bar') {
			const options = {
				chart: { type: 'bar', height: 360, animations: { enabled: false }, toolbar: { show: false } },
				series: [{ name: question.question, data: counts }],
				xaxis: { categories: labels },
				colors: generateColors(labels.length),
				tooltip: { enabled: false },
				dataLabels: { enabled: false },
				states: { hover: { filter: { type: 'none' } } }
			};
			chart = new ApexCharts(chartDiv, options);
			chart.render();
			return;
		}

		// pie
		const options = {
			chart: { type: 'pie', height: 360, animations: { enabled: false }, toolbar: { show: false } },
			series: counts,
			labels: labels,
			colors: generateColors(labels.length),
			legend: { position: 'bottom' },
			states: { hover: { filter: { type: 'none' } } },
			tooltip: { enabled: false }
		};
		chart = new ApexCharts(chartDiv, options);
		chart.render();
	}

	function setActiveBtn() {
		const isBar = graphTypes[graphIdx] === 'bar';
		barBtn.classList.toggle('active', isBar);
		pieBtn.classList.toggle('active', !isBar);
		barBtn.setAttribute('aria-pressed', String(isBar));
		pieBtn.setAttribute('aria-pressed', String(!isBar));
	}

	barBtn.addEventListener('click', (ev) => {
		ev.stopPropagation();
		// if bar already selected, toggle to pie; otherwise select bar
		if (graphTypes[graphIdx] === 'bar') {
			graphIdx = graphTypes.indexOf('pie');
		} else {
			graphIdx = graphTypes.indexOf('bar');
		}
		setActiveBtn();
		drawCurrent();
	});

	pieBtn.addEventListener('click', (ev) => {
		ev.stopPropagation();
		// if pie already selected, toggle to bar; otherwise select pie
		if (graphTypes[graphIdx] === 'pie') {
			graphIdx = graphTypes.indexOf('bar');
		} else {
			graphIdx = graphTypes.indexOf('pie');
		}
		setActiveBtn();
		drawCurrent();
	});

	controls.appendChild(barBtn); controls.appendChild(pieBtn);
	// reflect initial state
	setActiveBtn();
	drawCurrent();
}

function generateColors(n) {
	const palette = [ '#4dc9f6', '#f67019', '#f53794', '#537bc4', '#acc236', '#166a8f', '#00a950', '#58595b', '#8549ba' ];
	return Array.from({length: n}, (_, i) => palette[i % palette.length]);
}

