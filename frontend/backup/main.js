const API_URL = '/api/users';
let token = '';

// Register
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        age: document.getElementById('age').value,
        weight: document.getElementById('weight').value,
        height: document.getElementById('height').value,
        preferences: document.getElementById('preferences').value,
        goals: document.getElementById('goals').value,
    };
    const res = await fetch(API_URL + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    alert(await res.text());
});

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };
    const res = await fetch(API_URL + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json();
    token = result.token;
    alert('Login successful!');
});

// Admin get users
async function getUsers() {
    const res = await fetch(API_URL, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const users = await res.json();
    const list = document.getElementById('userList');
    list.innerHTML = '';
    users.forEach(u => {
        const li = document.createElement('li');
        li.textContent = u.email + ' (' + u.role + ')';
        list.appendChild(li);
    });
}
