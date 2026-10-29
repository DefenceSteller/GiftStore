import { api } from '../api.js';

const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const btn = document.getElementById('login-btn');

async function alreadyAuthed() {
  try {
    await api('/admin/me');
    location.replace('/admin');
  } catch (_) { /* not signed in */ }
}
alreadyAuthed();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  errorBox.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    await api('/admin/login', { method: 'POST', body: { email, password } });
    location.replace('/admin');
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Sign in →';
    document.getElementById('password').select();
  }
});
