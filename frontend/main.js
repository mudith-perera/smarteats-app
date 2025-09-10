const API_URL = '/api/users';

// Register
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        username: $('#username').val(),
        email: $('#email').val(),
        password: $('#password').val(),
        gender: $('#gender').val(),
        firstName: $('#firstName').val(),
        lastName: $('#lastName').val()
    };

    $.ajax({
        url: '/api/users/register',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function (res) {
            Swal.fire({
                icon: 'success',
                title: 'Registration successful',
                text: res.message,
                confirmButtonColor: '#3085d6'
            }).then(() => {
                window.location.href = 'login.html';
            });
        },
        error: function (xhr) {
            Swal.fire({
                icon: 'error',
                title: 'Registration failed',
                text: xhr.responseJSON?.message || 'Something went wrong'
            });
        }
    });
});

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#username').val();
    const password = $('#password').val();

    $.ajax({
        url: '/api/users/login',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username, password }),
        success: function (res) {
            token = res.token;
            localStorage.setItem('token', token);
    
            Swal.fire({
                icon: 'success',
                title: 'Login successful',
                text: 'Welcome back!',
                confirmButtonColor: '#3085d6'
            }).then(() => {
                if (res.profile) {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'profileForm.html';
                }
            });
        },
        error: function (xhr) {
            Swal.fire({
                icon: 'error',
                title: 'Login failed',
                text: xhr.responseJSON?.message,
            });
        }
    });
});

// Create Profile
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        Swal.fire({
            icon: 'error',
            title: 'Not logged in',
            text: 'Please log in to create your profile.',
        });
        return;
    }
    const age = parseInt($('#age').val());
    const weight = parseFloat($('#weight').val());
    const height = parseFloat($('#height').val());
    const dietaryPreferences = [];
    $('input[name="dietaryPreferences"]:checked').each(function() {
        dietaryPreferences.push($(this).val());
    });
    const goal = $('#goal').val();
    const unitSystem = $('#unitSystem').val();
    const profileData = { age, weight, height, dietaryPreferences, goal, unitSystem };
    $.ajax({
        url: '/api/users/createProfile',
        method: 'POST',
        contentType: 'application/json',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        data: JSON.stringify(profileData),
        success: function (res) {
            Swal.fire({
                icon: 'success',
                title: 'Profile created successfully',
                text: res.message
            }).then(() => {
                window.location.href = 'index.html';
            });
        },
        error: function (xhr) {
            Swal.fire({
                icon: 'error',
                title: 'Profile creation failed',
                text: xhr.responseJSON?.message || 'Something went wrong'
            });
        }
    });
});

function logout() {
  localStorage.removeItem('token'); 
  window.location.href = '/login.html';
}

$(document).ready(function () {
    const token = localStorage.getItem('token');
    if (token) {
        $('#loginBtn').hide();
        $('#registerBtn').hide();
        $('#logoutBtn').show();
        $('#profileBtn').show();
    } else {
        $('#loginBtn').show();
        $('#registerBtn').show();
        $('#logoutBtn').hide();
        $('#profileBtn').hide();
    }
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


// --- UI helpers (vanilla) ---
(function () {
    const byId = (id) => document.getElementById(id);
    const menuBtn = byId('menuBtn');
    const menu = byId('menu');
    const yearEl = document.getElementById('year');

    if (menuBtn && menu) {
        menuBtn.addEventListener('click', () => {
            menu.classList.toggle('open');
        });
    }

    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
})();
