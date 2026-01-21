const baseUrl = 'http://localhost:3000';

let currentSurveyId = null;

function el(id) { return document.getElementById(id); }

function getToken(){
    try{
        if(window.Session && Session.getToken) return Session.getToken();
        return localStorage.getItem('token');
    }catch(e){ return null; }
}

function show(elm) { elm.style.display = ''; }
function hide(elm) { elm.style.display = 'none'; }

function showMessage(msg) {
    alert(msg);
}

// Create survey
const editSurveyForm = el('editSurveyForm');
if (editSurveyForm) {
    editSurveyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = el('surveyName').value.trim();
        const description = el('surveyDescription').value.trim();
        // Creator comes from session / SiteState
        const suser = (window.SiteState && SiteState.getUser) ? SiteState.getUser() : (window.Session && Session.getUser ? Session.getUser() : null);
        const creator = suser && suser.id ? suser.id : null;
        if (!name) return showMessage('Please enter a survey name');

        // If a survey is already selected, switch to update flow
        if (currentSurveyId) {
            try {
                const uheaders = { 'Content-Type': 'application/json' };
                const utoken = getToken();
                if (utoken) uheaders['Authorization'] = `Bearer ${utoken}`;

                const updateRes = await fetch(`${baseUrl}/survey/${currentSurveyId}`, {
                    method: 'PUT',
                    headers: uheaders,
                    body: JSON.stringify({ name, description })
                });
                if (!updateRes.ok) {
                    const fallback = await fetch(`${baseUrl}/survey/${currentSurveyId}`, {
                        method: 'PATCH',
                        headers: uheaders,
                        body: JSON.stringify({ name, description })
                    });
                    if (!fallback.ok) throw new Error('Failed to update survey');
                }
                el('editSurveyTitle').textContent = name;
                showMessage('Survey updated');
                // keep UI in edit-locked state
                const nameInput = el('surveyName');
                const descInput = el('surveyDescription');
                nameInput.disabled = true;
                descInput.disabled = true;
                return;
            } catch (err) {
                return showMessage(err.message || 'Error updating survey');
            }
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = getToken();
            if(token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${baseUrl}/survey/create`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name, description, creator })
            });
            if (!res.ok) throw new Error('Failed creating survey');
            const data = await res.json();
            currentSurveyId = data.id;
            el('editSurveyTitle').textContent = name;
            el('editSurveyInfo').textContent = `Code: ${data.s_code || ''}`;

            // Keep the survey create form visible but make fields readonly
            const nameInput = el('surveyName');
            const descInput = el('surveyDescription');
            nameInput.disabled = true;
            descInput.disabled = true;

            // setup the edit/save behavior for the submit button
            const submitBtn = editSurveyForm.querySelector('button[type="submit"]');
            if (submitBtn) setupSurveyEditor(submitBtn, nameInput, descInput);

            // Show question management UI
            show(el('survey-management'));
            fetchQuestions();
        } catch (err) {
            showMessage(err.message || 'Error');
        }
    });
}

// Setup submit button to toggle Edit/Save for a created survey
function setupSurveyEditor(submitBtn, nameInput, descInput) {
    // make it a regular button so it doesn't re-submit the form
    submitBtn.type = 'button';
    submitBtn.textContent = 'Edit Survey';
    submitBtn.dataset.mode = 'edit';

    const handler = async () => {
        const mode = submitBtn.dataset.mode;
        if (mode === 'edit') {
            nameInput.disabled = false;
            descInput.disabled = false;
            nameInput.focus();
            submitBtn.textContent = 'Save Survey';
            submitBtn.dataset.mode = 'save';
        } else if (mode === 'save') {
            const newName = nameInput.value.trim();
            const newDesc = descInput.value.trim();
            if (!newName) return showMessage('Please enter a survey name');
            try {
                const uheaders = { 'Content-Type': 'application/json' };
                const utoken = getToken();
                if (utoken) uheaders['Authorization'] = `Bearer ${utoken}`;

                const updateRes = await fetch(`${baseUrl}/survey/${currentSurveyId}`, {
                    method: 'PUT',
                    headers: uheaders,
                    body: JSON.stringify({ name: newName, description: newDesc })
                });
                if (!updateRes.ok) {
                    // try PATCH as a fallback
                    const fallback = await fetch(`${baseUrl}/survey/${currentSurveyId}`, {
                        method: 'PATCH',
                        headers: uheaders,
                        body: JSON.stringify({ name: newName, description: newDesc })
                    });
                    if (!fallback.ok) throw new Error('Failed to update survey');
                }

                // success: lock fields again and update UI
                nameInput.disabled = true;
                descInput.disabled = true;
                submitBtn.textContent = 'Edit Survey';
                submitBtn.dataset.mode = 'edit';
                el('editSurveyTitle').textContent = newName;
            } catch (err) {
                showMessage(err.message || 'Error updating survey');
            }
        }
    };

    // Ensure we don't double-bind
    submitBtn._surveyEditHandler && submitBtn.removeEventListener('click', submitBtn._surveyEditHandler);
    submitBtn._surveyEditHandler = handler;
    submitBtn.addEventListener('click', handler);
}

// Load an existing survey into the editor (prefill name/description and questions)
async function loadSurvey(sid) {
    if (!sid) return;
    try {
        const headers = {};
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${baseUrl}/survey/${sid}`, { headers });
        if (!res.ok) throw new Error('Failed to load survey');
        const s = await res.json();
        currentSurveyId = s.id || sid;
        // populate fields
        el('surveyName').value = s.name || '';
        el('surveyDescription').value = s.discription || s.description || '';
        el('editSurveyTitle').textContent = s.name || '';
        el('editSurveyInfo').textContent = `Code: ${s.s_code || ''}`;

        // lock inputs and setup edit button
        const nameInput = el('surveyName');
        const descInput = el('surveyDescription');
        nameInput.disabled = true;
        descInput.disabled = true;
        let submitBtn = null;
        if (editSurveyForm) submitBtn = editSurveyForm.querySelector('button[type="submit"]');
        if (submitBtn) setupSurveyEditor(submitBtn, nameInput, descInput);

        // show management UI and load questions
        show(el('survey-management'));
        fetchQuestions();
    } catch (err) {
        console.error(err);
        showMessage(err.message || 'Error loading survey');
    }
}

// Question UI
const questionType = el('questionType');
const optionsArea = el('optionsArea');
const addOptionBtn = el('addOptionBtn');
const optionsList = el('optionsList');

if (questionType) {
    questionType.addEventListener('change', () => {
        if (questionType.value === 'multiple') {
            show(optionsArea);
            addOptionBtn.disabled = false;
        } else if (questionType.value === 'boolean') {
            show(optionsArea);
            addOptionBtn.disabled = true;
            const existing = optionsList.querySelectorAll('.option-input');
            if (existing.length !== 2) {
                optionsList.innerHTML = '';
                optionsList.appendChild(createOptionInput('Yes'));
                optionsList.appendChild(createOptionInput('No'));
            }
        } else {
            hide(optionsArea);
            optionsList.innerHTML = '';
            addOptionBtn.disabled = false;
        }
    });
}

function createOptionInput(value = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'option-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'option-input';
    input.value = value;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.addEventListener('click', () => wrapper.remove());
    wrapper.appendChild(input);
    wrapper.appendChild(remove);
    return wrapper;
}

if (addOptionBtn) {
    addOptionBtn.addEventListener('click', () => {
        if (questionType && questionType.value === 'boolean') return;
        optionsList.appendChild(createOptionInput());
    });
}

// Add question
const createQuestionForm = el('createQuestionForm');
if (createQuestionForm) {
    createQuestionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentSurveyId) return showMessage('Create a survey first');
        const question = el('questionText').value.trim();
        const type = el('questionType').value;
        if (!question) return showMessage('Enter question text');

        // validate options for multiple/boolean types before creating question
        const optionVals = [...optionsList.querySelectorAll('.option-input')].map(i => i.value.trim()).filter(v => v);
        if (type === 'multiple' && optionVals.length === 0) return showMessage('Please add at least one option for multiple choice');
        if (type === 'boolean' && optionVals.length < 2) return showMessage('Boolean questions require two answers');

        try {
            // If we're editing an existing question, do update flow
            if (createQuestionForm.dataset.editing) {
                const qid = createQuestionForm.dataset.editing;
                const uheaders = { 'Content-Type': 'application/json' };
                const utoken = getToken();
                if (utoken) uheaders['Authorization'] = `Bearer ${utoken}`;

                // update question
                const updateQ = await fetch(`${baseUrl}/survey/${currentSurveyId}/question/${qid}`, {
                    method: 'PUT',
                    headers: uheaders,
                    body: JSON.stringify({ question, type })
                });
                if (!updateQ.ok) throw new Error('Failed to update question');

                // update or create answers based on option inputs
                const optInputs = [...optionsList.querySelectorAll('.option-input')];
                for (const inp of optInputs) {
                    const val = inp.value.trim();
                    if (!val) continue;
                    const aid = inp.dataset.aid;
                    const aheaders = { 'Content-Type': 'application/json' };
                    const atoken = getToken();
                    if (atoken) aheaders['Authorization'] = `Bearer ${atoken}`;
                    if (aid) {
                        // update existing answer
                        await fetch(`${baseUrl}/survey/${currentSurveyId}/answer/${aid}`, {
                            method: 'PUT',
                            headers: aheaders,
                            body: JSON.stringify({ question_id: qid, answer: val })
                        });
                    } else {
                        // create new answer
                        await fetch(`${baseUrl}/survey/${currentSurveyId}/answer`, {
                            method: 'POST',
                            headers: aheaders,
                            body: JSON.stringify({ question_id: qid, answer: val })
                        });
                    }
                }

                // clear editing state and reset form
                delete createQuestionForm.dataset.editing;
                // restore submit button text
                const submitBtn = createQuestionForm.querySelector('button[type="submit"]');
                if (submitBtn && submitBtn.dataset.origText) {
                    submitBtn.textContent = submitBtn.dataset.origText;
                    delete submitBtn.dataset.origText;
                }
                // remove highlight from edited question
                const prev = document.querySelector('#questionsList li.accent');
                if (prev) prev.classList.remove('accent');

                el('questionText').value = '';
                optionsList.innerHTML = '';
                questionType.value = 'text';
                hide(optionsArea);
                fetchQuestions();
                return;
            }

            const headers = { 'Content-Type': 'application/json' };
            const token = getToken();
            if(token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${baseUrl}/survey/${currentSurveyId}/question`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ survey_id: currentSurveyId, question, type })
            });
            if (!res.ok) throw new Error('Failed to create question');
            const qdata = await res.json();
            const qid = qdata.id;

            if (type === 'multiple') {
                const optionInputs = [...optionsList.querySelectorAll('.option-input')].map(i => i.value.trim()).filter(v => v);
                const aheaders = { 'Content-Type': 'application/json' };
                const atoken = getToken();
                if(atoken) aheaders['Authorization'] = `Bearer ${atoken}`;
                for (const opt of optionInputs) {
                    await fetch(`${baseUrl}/survey/${currentSurveyId}/answer`, {
                        method: 'POST',
                        headers: aheaders,
                        body: JSON.stringify({ question_id: qid, answer: opt })
                    });
                }
            } else if (type === 'boolean') {
                const optionInputs = [...optionsList.querySelectorAll('.option-input')].map(i => i.value.trim()).filter(v => v);
                const aheaders = { 'Content-Type': 'application/json' };
                const atoken = getToken();
                if(atoken) aheaders['Authorization'] = `Bearer ${atoken}`;
                // only take first two
                for (let i = 0; i < Math.min(2, optionInputs.length); i++) {
                    const opt = optionInputs[i];
                    await fetch(`${baseUrl}/survey/${currentSurveyId}/answer`, {
                        method: 'POST',
                        headers: aheaders,
                        body: JSON.stringify({ question_id: qid, answer: opt })
                    });
                }
            }

            el('questionText').value = '';
            optionsList.innerHTML = '';
            questionType.value = 'text';
            hide(optionsArea);
            fetchQuestions();
        } catch (err) {
            showMessage(err.message || 'Error adding question');
        }
    });
}

// Fetch and render questions & answers
async function fetchQuestions() {
    if (!currentSurveyId) return;
    try {
    const headers = {};
    const token = getToken();
    if(token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}/survey/${currentSurveyId}/question`, { headers });
        if (!res.ok) throw new Error('Failed to fetch questions');
        const questions = await res.json();
        const list = el('questionsList');
        list.innerHTML = '';
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const li = document.createElement('li');
            // attach question id for later reference
            li.dataset.qid = q.id;
            // layout: put edit button first (left), then text, then view button
            li.style.display = 'flex';
            li.style.alignItems = 'center';

            // Label (flexible) with question text
            const label = document.createElement('span');
            label.textContent = `${i + 1}. ${q.question} — ${q.type}`;
            label.style.flex = '1';
            li.appendChild(label);

            // View answers (if applicable)
            if (q.type === 'multiple' || q.type === 'boolean') {
                const view = document.createElement('button');
                view.type = 'button';
                view.style.marginLeft = '8px';
                view.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">\n+  <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>\n+  <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>\n+</svg>';
                view.setAttribute('title', 'View Answers');
                view.setAttribute('aria-label', 'View Answers');
                view.addEventListener('click', () => showAnswersForQuestion(q.id, li));
                li.appendChild(view);
            }

            // Edit button (right-most)
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.style.marginLeft = '8px';
            edit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">\n+  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>\n+  <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>\n+</svg>';
            edit.setAttribute('title', 'Edit');
            edit.setAttribute('aria-label', 'Edit');
            edit.addEventListener('click', () => editQuestion(q.id));
            li.appendChild(edit);

            list.appendChild(li);
        }
    } catch (err) {
        console.error(err);
    }
}

// Populate the question creation form for editing an existing question
async function editQuestion(qid) {
    if (!currentSurveyId) return showMessage('No survey selected');
    try {
        const headers = {};
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // fetch question
        const qres = await fetch(`${baseUrl}/survey/${currentSurveyId}/question/${qid}`, { headers });
        if (!qres.ok) throw new Error('Failed to fetch question');
        const q = await qres.json();

        // fetch answers and filter for this question
        const ares = await fetch(`${baseUrl}/survey/${currentSurveyId}/answer`, { headers });
        if (!ares.ok) throw new Error('Failed to fetch answers');
        const answers = await ares.json();
        const forQ = answers.filter(a => a.question_id === qid || a.question_id == qid);

        // remove previous highlight
        const prev = document.querySelector('#questionsList li.accent');
        if (prev) prev.classList.remove('accent');

        // populate form
        el('questionText').value = q.question || '';
        el('questionType').value = q.type || 'text';
        // ensure options area visibility
        if (el('questionType').value === 'multiple') show(optionsArea);
        else if (el('questionType').value === 'boolean') show(optionsArea);
        else hide(optionsArea);

        optionsList.innerHTML = '';
        for (const a of forQ) {
            const row = createOptionInput(a.answer || '');
            const input = row.querySelector('.option-input');
            if (input) input.dataset.aid = a.id; // store answer id for updates
            optionsList.appendChild(row);
        }

        // mark form as editing this question id (if form exists)
        if (createQuestionForm) {
            createQuestionForm.dataset.editing = qid;

            // change the add button text to 'Submit' and remember original
            const submitBtn = createQuestionForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                if (!submitBtn.dataset.origText) submitBtn.dataset.origText = submitBtn.textContent;
                submitBtn.textContent = 'Submit';
            }
        }

        // highlight the question in the list
        const targetLi = document.querySelector(`#questionsList li[data-qid="${qid}"]`);
        if (targetLi) targetLi.classList.add('accent');

        // focus the question text
        el('questionText').focus();
    } catch (err) {
        console.error(err);
        showMessage(err.message || 'Error preparing edit');
    }
}

async function showAnswersForQuestion(qid, containerLi) {
    try {
        const headers = {};
        const token = getToken();
        if(token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${baseUrl}/survey/${currentSurveyId}/answer`, { headers });
        if (!res.ok) throw new Error('Failed to fetch answers');
        const answers = await res.json();
        const forQ = answers.filter(a => a.question_id === qid || a.question_id == qid);
        let ul = containerLi.querySelector('ul');
        if (ul) { ul.remove(); return; }
        ul = document.createElement('ul');
        for (const a of forQ) {
            const li = document.createElement('li');
            li.textContent = `${a.id}: ${a.answer}`;
            ul.appendChild(li);
        }
        containerLi.appendChild(ul);
    } catch (err) {
        console.error(err);
    }
}

// If a survey id is provided in query string, prefill (optional)
function initFromQuery() {
    // Prefer `code` (like respond page) then fall back to `survey_id`
    const code = getCodeFromUrl();
    if (code) {
        loadSurveyByCode(code);
        return;
    }
}

// Get code from query string: ?code= or fallback to survey_id
function getCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('code') || params.get('survey_id');
}

// Load survey by its public code (s_code) — mirrors respond.js behavior
async function loadSurveyByCode(code) {
    if (!code) return;
    try {
        const headers = {};
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${baseUrl}/survey/code/${encodeURIComponent(code)}`, { headers });
        if (!res.ok) throw new Error('Failed to load survey by code');
        const data = await res.json();
        // API may return array or object
        const s = Array.isArray(data) ? data[0] : data;
        if (!s || !s.id) throw new Error('Survey not found');

        // populate fields using the loaded survey object
        currentSurveyId = s.id;
        el('surveyName').value = s.name || '';
        el('surveyDescription').value = s.discription || s.description || '';
        el('createdSurveyTitle').textContent = s.name || '';
        el('createdSurveyInfo').textContent = `Code: ${s.s_code || ''}`;

        const nameInput = el('surveyName');
        const descInput = el('surveyDescription');
        nameInput.disabled = true;
        descInput.disabled = true;
            let submitBtn = null;
            if (editSurveyForm) submitBtn = editSurveyForm.querySelector('button[type="submit"]');
        if (submitBtn) setupSurveyEditor(submitBtn, nameInput, descInput);

        show(el('survey-management'));
        fetchQuestions();
    } catch (err) {
        console.error(err);
        showMessage(err.message || 'Error loading survey by code');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initFromQuery();
    // Prefill creator from session
    const suser = (window.SiteState && SiteState.getUser) ? SiteState.getUser() : (window.Session && Session.getUser ? Session.getUser() : null);
    if (suser) {
        const cid = suser.id || suser.user_id || suser._id || null;
        if (cid) el('surveyCreator').value = cid;
        const disp = el('surveyCreatorDisplay');
        if (disp) disp.textContent = suser.name ? `${suser.name}` : `id: ${cid}`;
    }
});
