document.addEventListener('DOMContentLoaded', initDataPage);

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
		const surveysResp = await fetch('/survey/');
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
			fetch(`/survey/${surveyId}/question`),
			fetch(`/survey/${surveyId}/answer`),
			fetch(`/response/survey/${surveyId}`)
		]);

		const questions = await qRes.json();
		const answers = await aRes.json();
		const responses = await rRes.json();

		if (!Array.isArray(questions)) {
			questionsList.textContent = 'No questions found for this survey.';
			return;
		}

		questions.forEach(q => {
			const item = document.createElement('div');
			item.className = 'question-item';
			item.innerHTML = `<strong>${q.question}</strong> <small>(${q.type})</small>`;
			item.style.cursor = 'pointer';
			item.addEventListener('click', () => showQuestionDetail(q, answers, responses, questionDetail));
			questionsList.appendChild(item);
		});

		// Show first question automatically
		if (questions.length) showQuestionDetail(questions[0], answers, responses, questionDetail);

	} catch (err) {
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

	const controls = document.createElement('div'); controls.className = 'chart-controls';
	const leftArrow = document.createElement('button'); leftArrow.textContent = '◀';
	const rightArrow = document.createElement('button'); rightArrow.textContent = '▶';
	const typeLabel = document.createElement('span'); typeLabel.style.margin = '0 8px';

	const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 400;
	container.appendChild(controls); container.appendChild(canvas);

	const graphTypes = ['bar','pie','doughnut','line'];
	let graphIdx = 0;

	let chart = null;
	function drawCurrent() {
		const t = graphTypes[graphIdx];
		typeLabel.textContent = t;
		if (chart) chart.destroy();
		chart = new Chart(canvas.getContext('2d'), {
			type: t,
			data: {
				labels,
				datasets: [{ label: question.question, data: counts, backgroundColor: generateColors(labels.length) }]
			},
			options: { responsive: true }
		});
	}

	leftArrow.addEventListener('click', () => { graphIdx = (graphIdx - 1 + graphTypes.length) % graphTypes.length; drawCurrent(); });
	rightArrow.addEventListener('click', () => { graphIdx = (graphIdx + 1) % graphTypes.length; drawCurrent(); });

	controls.appendChild(leftArrow); controls.appendChild(typeLabel); controls.appendChild(rightArrow);
	drawCurrent();
}

function generateColors(n) {
	const palette = [ '#4dc9f6', '#f67019', '#f53794', '#537bc4', '#acc236', '#166a8f', '#00a950', '#58595b', '#8549ba' ];
	return Array.from({length: n}, (_, i) => palette[i % palette.length]);
}

