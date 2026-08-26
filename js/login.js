import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const client = createClient(
    "https://pqgkdnxdsybcfamwadrf.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZ2tkbnhkc3liY2ZhbXdhZHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzE0NjUsImV4cCI6MjA5NzEwNzQ2NX0.lugWuqNI5VMy6hCn-y38-hi825pIHcUjOCAWCsMJz4c"
);

function openAdminLogin() {
    document.getElementById('loginOverlay').classList.add('active');
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    setTimeout(() => document.getElementById('loginUsername').focus(), 50);
}

function closeAdminLogin() {
    document.getElementById('loginOverlay').classList.remove('active');
}

async function attemptAdminLogin() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');
    const errorBox = document.getElementById('loginError');
    errorBox.style.display = 'none';

    if (!u || !p) {
        errorBox.innerText = 'Please enter both a username and password.';
        errorBox.style.display = 'block';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Checking...';

    try {
        // The username/password pair lives in the database — checked through
        // a Postgres function (verify_admin_login) so the browser never sees
        // the stored password or its hash, only a true/false answer.
        const { data, error } = await client.rpc('verify_admin_login', {
            p_username: u,
            p_password: p
        });

        if (error) throw error;

        if (data === true) {
            sessionStorage.setItem('isAdminAuthed', '1');
            window.location.href = 'admin/dashboard.html';
        } else {
            errorBox.innerText = 'Incorrect username or password.';
            errorBox.style.display = 'block';
        }
    } catch (err) {
        errorBox.innerText = 'Login check failed: ' + err.message;
        errorBox.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Enter';
    }
}

document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') attemptAdminLogin();
});
document.getElementById('loginUsername').addEventListener('keydown', e => {
    if (e.key === 'Enter') attemptAdminLogin();
});
document.getElementById('loginOverlay').addEventListener('click', e => {
    if (e.target.id === 'loginOverlay') closeAdminLogin();
});

window.openAdminLogin = openAdminLogin;
window.closeAdminLogin = closeAdminLogin;
window.attemptAdminLogin = attemptAdminLogin;
