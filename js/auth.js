// Client-side login handler for SurveyApp
(function(){
	const form = document.getElementById('loginForm');
	const errorEl = document.getElementById('error');
	const registerBtn = document.getElementById('registerBtn');

	if(registerBtn){
		registerBtn.addEventListener('click', ()=>{
			window.location.href = '../html/register.html';
		});
	}

	if(!form) return;

	form.addEventListener('submit', async (e)=>{
		e.preventDefault();
		errorEl.textContent = '';

		const email = (document.getElementById('email')||{}).value || '';
		const password = (document.getElementById('password')||{}).value || '';

		if(!email || !password){
			errorEl.textContent = 'Please enter both email and password.';
			return;
		}

		try{
			const res = await fetch('http://localhost:3000/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			if(!res.ok){
				const errText = await res.text();
				let msg = 'Login failed';
				try{ msg = JSON.parse(errText).message || errText }catch(e){ msg = errText }
				errorEl.textContent = msg || 'Login failed';
				return;
			}

			const data = await res.json();
			if(data.token){
				localStorage.setItem('token', data.token);
			}
			if(data.user){
				localStorage.setItem('user', JSON.stringify(data.user));
			}

			// Redirect after login. Adjust target as desired.
			window.location.href = '../html/dashboard.html';

		}catch(err){
			errorEl.textContent = 'Network error — please try again.';
			console.error('Login error', err);
		}
	});
})();

// Registration handler (merged from register.js)
(function(){
	const form = document.getElementById('registerForm');
	if(!form) return;

	const msg = document.getElementById('message') || document.getElementById('error');
	const toLogin = document.getElementById('toLogin');

	if(toLogin){
		toLogin.addEventListener('click', ()=>{
			window.location.href = 'login.html';
		});
	}

	form.addEventListener('submit', async (e)=>{
		e.preventDefault();
		if(msg) msg.textContent = '';

		const name = (document.getElementById('name')||{}).value.trim();
		const email = (document.getElementById('email')||{}).value.trim();
		const password = (document.getElementById('password')||{}).value || '';
		const confirm = (document.getElementById('confirmPassword')||{}).value || '';

		if(!name || !email || !password || !confirm){
			if(msg) msg.textContent = 'Please fill out all fields.';
			return;
		}

		if(password !== confirm){
			if(msg) msg.textContent = 'Passwords do not match.';
			return;
		}

		try{
			const res = await fetch('http://localhost:3000/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password })
			});

			if(!res.ok){
				const data = await res.json().catch(()=>({}));
				if(msg) msg.textContent = data.message || ('Registration failed (' + res.status + ')');
				return;
			}

			if(msg){
				msg.classList.remove('error');
				msg.classList.add('success');
				msg.textContent = 'Registration successful — redirecting to login...';
			}
			setTimeout(()=>{ window.location.href = 'login.html'; }, 1100);

		}catch(err){
			if(msg) msg.textContent = 'Unable to reach server. Check connection.';
			console.error('Register error', err);
		}
	});
})();

