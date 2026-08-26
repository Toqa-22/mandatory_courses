// Runs at the top of every admin page.
// If the visitor hasn't logged in this session, bounce them back to the
// public Workshops page (where the login button lives).
if (sessionStorage.getItem('isAdminAuthed') !== '1') {
    window.location.href = '../index.html';
}

function logoutAdmin() {
    sessionStorage.removeItem('isAdminAuthed');
    window.location.href = '../index.html';
}
window.logoutAdmin = logoutAdmin;
