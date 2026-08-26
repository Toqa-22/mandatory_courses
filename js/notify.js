(function () {
    function ensureContainer() {
        let c = document.getElementById('toastContainer');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toastContainer';
            document.body.appendChild(c);
        }
        return c;
    }

    // Best-guess styling based on the message text, so every existing
    // alert(...) call in the app automatically gets the right look with
    // no other code changes needed.
    function classify(message) {
        const m = String(message).toLowerCase();
        if (/(error|fail|denied|incorrect|wrong|rejection)/.test(m)) {
            return { type: 'error', icon: '⚠️' };
        }
        if (/(success|successfully|verified and|logged and)/.test(m)) {
            return { type: 'success', icon: '✅' };
        }
        if (/(please|required|sure you want|no records)/.test(m)) {
            return { type: 'warning', icon: '✋' };
        }
        return { type: 'info', icon: 'ℹ️' };
    }

    function showNotification(message, options) {
        options = options || {};
        const container = ensureContainer();
        const guess = classify(message);
        const type = options.type || guess.type;
        const icon = options.icon || guess.icon;
        const duration = options.duration || 4500;

        const card = document.createElement('div');
        card.className = 'toast-card toast-' + type;
        card.innerHTML =
            '<div class="toast-icon">' + icon + '</div>' +
            '<div class="toast-message"></div>' +
            '<button class="toast-close" type="button" aria-label="Dismiss">×</button>' +
            '<div class="toast-progress"></div>';

        card.querySelector('.toast-message').textContent = message;
        card.querySelector('.toast-progress').style.animationDuration = duration + 'ms';

        let timer;
        function remove() {
            clearTimeout(timer);
            card.classList.add('toast-leaving');
            setTimeout(() => card.remove(), 250);
        }
        card.querySelector('.toast-close').addEventListener('click', remove);

        // Pause the countdown while the user is reading it
        card.addEventListener('mouseenter', () => {
            clearTimeout(timer);
            card.querySelector('.toast-progress').style.animationPlayState = 'paused';
        });
        card.addEventListener('mouseleave', () => {
            card.querySelector('.toast-progress').style.animationPlayState = 'running';
            timer = setTimeout(remove, duration);
        });

        container.appendChild(card);
        timer = setTimeout(remove, duration);
    }

    // Replace the native, top-of-page browser alert() with the card notification
    // everywhere in the app — no other files need to change.
    window.alert = function (message) {
        showNotification(message);
    };

    window.showNotification = showNotification;
})();
