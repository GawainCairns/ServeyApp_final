// Respond page logic: fetch survey, questions, answers and render inputs
(function(){
    const API_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? `${location.protocol}//${location.hostname}:3000` // keep port 3000
        : `${location.protocol}//${location.hostname}`;

    function qs(name){
        const params = new URLSearchParams(location.search);
        return params.get(name);
    }

    function el(tag, attrs={}, ...children){
        const node = document.createElement(tag);
        Object.keys(attrs).forEach(k => {
            if(k === 'class') node.className = attrs[k];
            else if(k === 'html') node.innerHTML = attrs[k];
            else node.setAttribute(k, attrs[k]);
        });
        children.forEach(c => { if(c!=null) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return node;
    }

    async function fetchJson(path){
        const res = await fetch(path);
        if(!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
    }

    async function load(){
        const identifier = qs('id') || qs('s_code') || qs('code');
        if(!identifier){
            showMessage('No survey identifier provided in URL (use ?id= or ?s_code=).', true);
            return;
        }

        try{
            const survey = await fetchJson(`${API_BASE}/servey/${encodeURIComponent(identifier)}`);
            document.getElementById('servey-name').textContent = survey.name || 'Survey';
            document.getElementById('servey-desc').textContent = survey.discription || survey.description || '';

            const questions = await fetchJson(`${API_BASE}/servey/${encodeURIComponent(identifier)}/question`);
            // Try to fetch all answers for this survey; we'll map them by question_id if present
            let answers = [];
            try{ answers = await fetchJson(`${API_BASE}/servey/${encodeURIComponent(identifier)}/answer`); }catch(e){ /* ignore */ }

            renderQuestions(questions, answers);
        }catch(e){
            console.error(e);
            showMessage('Failed to load survey: '+e.message, true);
        }
    }

    function renderQuestions(questions, allAnswers){
        const container = document.getElementById('questions');
        container.innerHTML = '';

        if(!Array.isArray(questions) || questions.length === 0){
            container.appendChild(el('p', {}, 'No questions found for this survey.'));
            return;
        }

        questions.forEach(q => {
            const qwrap = el('div', {class: 'question'});
            qwrap.appendChild(el('label', {for: `q-${q.id}`}, q.question));

            const type = (q.type || '').toLowerCase();
            if(type === 'text' || type === 'string'){
                const ta = el('textarea', {id: `q-${q.id}`, name: `q-${q.id}`, rows: 4});
                qwrap.appendChild(ta);
            }else if(type === 'multiple' || type === 'boolean' || type === 'bool'){
                const answers = (Array.isArray(allAnswers) ? allAnswers.filter(a => String(a.question_id) === String(q.id)) : []);
                if(answers.length === 0){
                    qwrap.appendChild(el('p', {}, 'No answer choices found.'));
                }else{
                    const list = el('div', {class: 'choices'});
                    answers.forEach((a, idx) => {
                        const id = `q-${q.id}-a-${a.id || idx}`;
                        const input = el('input', {type: 'radio', id, name: `q-${q.id}`, value: a.id != null ? a.id : a.answer});
                        const lab = el('label', {for: id}, a.answer);
                        const row = el('div', {class: 'choice-row'});
                        row.appendChild(input);
                        row.appendChild(lab);
                        list.appendChild(row);
                    });
                    qwrap.appendChild(list);
                }
            }else{
                // Unknown type — default to text
                const ta = el('textarea', {id: `q-${q.id}`, name: `q-${q.id}`, rows: 3});
                qwrap.appendChild(ta);
            }

            container.appendChild(qwrap);
        });
    }

    function showMessage(msg, isError){
        const m = document.getElementById('respond-message');
        m.textContent = msg;
        m.style.color = isError ? 'crimson' : 'green';
    }

    function collectResponses(){
        const data = [];
        const qsEls = document.querySelectorAll('#questions .question');
        qsEls.forEach(qel => {
            const label = qel.querySelector('label');
            const forAttr = label && label.getAttribute('for');
            const qid = (forAttr || '').replace('q-','').split('-')[0];
            const textArea = qel.querySelector('textarea');
            if(textArea){
                data.push({ question_id: qid, answer: textArea.value });
                return;
            }
            const checked = qel.querySelector('input[type="radio"]:checked');
            if(checked){
                data.push({ question_id: qid, answer_id: checked.value });
            }else{
                data.push({ question_id: qid, answer: null });
            }
        });
        return data;
    }

    function attachSubmit(){
        const form = document.getElementById('respond-form');
        form.addEventListener('submit', function(evt){
            evt.preventDefault();
            const responses = collectResponses();
            // No server endpoint provided for posting responses in the brief.
            // For now, log the payload and show success message.
            console.log('Collected responses:', responses);
            showMessage('Responses collected locally (see console).', false);
        });
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        attachSubmit();
        load();
    });

})();
