// Profile page script: fetch user, allow edit name/email/password, delete account
(function(){
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');
    const profileMsg = document.getElementById('profileMsg');

    if(!stored){
        window.location.href = '../html/login.html';
        return;
    }

    const current = JSON.parse(stored);
    const userId = current.id;

    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');

    const deleteBtn = document.getElementById('deleteAccount');

    function showMsg(msg, isError){
        if(!profileMsg) return;
        profileMsg.textContent = msg;
        profileMsg.className = isError ? 'error' : 'success';
        setTimeout(()=>{ if(profileMsg) profileMsg.textContent = ''; }, 4000);
    }

    async function fetchUser(){
        try{
            const res = await fetch('http://localhost:3000/admin/user/' + encodeURIComponent(userId), {
                headers: token ? { 'Authorization': 'Bearer ' + token } : {}
            });
            if(!res.ok) throw new Error('Unable to fetch user');
            const data = await res.json();
            nameEl.value = data.name || '';
            emailEl.value = data.email || '';
            passwordEl.value = '';
            // update localStorage user copy
            localStorage.setItem('user', JSON.stringify({ id: data.id, name: data.name, email: data.email }));
        }catch(err){
            console.error(err);
            showMsg('Failed to load profile', true);
        }
    }

    function setEditing(field, editing){
        const input = document.getElementById(field);
        const editBtn = document.querySelector('[data-action="edit"][data-field="'+field+'"]');
        const saveBtn = document.querySelector('[data-action="save"][data-field="'+field+'"]');
        const cancelBtn = document.querySelector('[data-action="cancel"][data-field="'+field+'"]');
        if(!input) return;
        input.disabled = !editing;
        if(editing){
            editBtn.style.display = 'none';
            saveBtn.style.display = '';
            cancelBtn.style.display = '';
            input.focus();
        }else{
            editBtn.style.display = '';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
        }
    }

    async function saveField(field){
        const input = document.getElementById(field);
        if(!input) return;
        const payload = {};
        if(field === 'name') payload.name = input.value.trim();
        if(field === 'email') payload.email = input.value.trim();
        if(field === 'password') payload.password = input.value; // allow empty? We'll skip if empty
        if(field === 'password' && !payload.password){ showMsg('Enter a new password to change it', true); return; }

        try{
            const res = await fetch('http://localhost:3000/admin/user/' + encodeURIComponent(userId), {
                method: 'PUT',
                headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'Authorization': 'Bearer ' + token } : {}),
                body: JSON.stringify(payload)
            });
            if(!res.ok){
                const txt = await res.text().catch(()=>null);
                throw new Error(txt || ('Error ' + res.status));
            }
            const data = await res.json().catch(()=>null);
            setEditing(field, false);
            await fetchUser();
            showMsg('Saved');
        }catch(err){
            console.error(err);
            showMsg('Failed to save', true);
        }
    }

    // wire up buttons
    document.addEventListener('click', (e)=>{
        const btn = e.target.closest('button[data-action]');
        if(!btn) return;
        const action = btn.getAttribute('data-action');
        const field = btn.getAttribute('data-field');
        if(action === 'edit') setEditing(field, true);
        if(action === 'cancel'){
            setEditing(field, false);
            // restore value from stored user
            const storedUser = JSON.parse(localStorage.getItem('user')||'null') || {};
            if(field === 'name') nameEl.value = storedUser.name || '';
            if(field === 'email') emailEl.value = storedUser.email || '';
            if(field === 'password') passwordEl.value = '';
        }
        if(action === 'save') saveField(field);
    });

    if(deleteBtn){
        deleteBtn.addEventListener('click', async ()=>{
            const ok = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
            if(!ok) return;
            try{
                const res = await fetch('http://localhost:3000/admin/user/' + encodeURIComponent(userId), {
                    method: 'DELETE',
                    headers: token ? { 'Authorization': 'Bearer ' + token } : {}
                });
                if(!res.ok) throw new Error('Delete failed');
                // clear local data and redirect
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                showMsg('Account deleted');
                setTimeout(()=>{ window.location.href = '../html/index.html'; }, 900);
            }catch(err){
                console.error(err);
                showMsg('Unable to delete account', true);
            }
        });
    }

    // initial load
    fetchUser();

})();
