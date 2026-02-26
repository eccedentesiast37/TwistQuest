// ─── TwistQuest – Main Application Logic ─────────────────────────────
// State machine driving all 5 views + overlays + game flow

(function () {
    'use strict';

    // ── Global Error & Intercept ─────────────────────────────────────
    window.addEventListener('error', (e) => {
        alert('JS ERROR: ' + e.message + ' at line ' + e.lineno);
    });

    document.addEventListener('click', (e) => {
        console.log('[DEBUG] Click detected on:', e.target.id || e.target.tagName);
    }, true);

    // ═══════════════════════════════════════════════════════════════════
    // GAME STATE
    // ═══════════════════════════════════════════════════════════════════
    const state = {
        currentView: 'welcome',
        currentLevel: 1,
        lives: { 1: 3, 2: 3, 3: 3 },
        currentTwister: '',
        isListening: false,
        isEvaluating: false,
    };

    // (Views and Overlays are now looked up dynamically by ID to avoid stale references)

    // ═══════════════════════════════════════════════════════════════════
    // ANIMATED BACKGROUND PARTICLES
    // ═══════════════════════════════════════════════════════════════════
    function initParticles() {
        const canvas = document.getElementById('particles-canvas');
        const ctx = canvas.getContext('2d');
        let particles = [];
        const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#A855F7', '#EC4899', '#FF9F43'];

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 4 + 1;
                this.speedX = (Math.random() - 0.5) * 0.8;
                this.speedY = (Math.random() - 0.5) * 0.8;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.opacity = Math.random() * 0.5 + 0.1;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = this.opacity;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        for (let i = 0; i < 60; i++) particles.push(new Particle());

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = particles[i].color;
                        ctx.globalAlpha = 0.05 * (1 - dist / 120);
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW NAVIGATION
    // ═══════════════════════════════════════════════════════════════════
    function showView(viewName) {
        const allViews = document.querySelectorAll('.view');
        console.log('[showView] Setting active:', viewName, '| Total views found:', allViews.length);

        // Hide ALL views completely
        allViews.forEach(v => {
            v.classList.remove('active');
            v.style.display = 'none';
        });

        // Find target view and trigger
        const targetView = document.getElementById('view-' + viewName);
        if (targetView) {
            targetView.classList.add('active');
            targetView.style.display = 'flex'; // Force show
            const style = window.getComputedStyle(targetView);
            console.log('[showView] TARGET FOUND:', viewName, 'Display:', style.display, 'Opacity:', style.opacity);
        } else {
            console.error('[showView] FAILED: Cannot find view-id:', 'view-' + viewName);
            // Emergency fallback to welcome if we're lost
            if (viewName !== 'welcome') showView('welcome');
        }
        state.currentView = viewName;
    }

    function hideAllOverlays() {
        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show'));
    }

    function showOverlay(name) {
        let overlayId = 'overlay-' + name;
        // Handle camelCase naming in overlays object map
        if (name === 'levelComplete') overlayId = 'overlay-level-complete';

        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.classList.add('show');
        } else {
            console.error('Cannot find overlay:', overlayId);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // WELCOME / LOADING
    // ═══════════════════════════════════════════════════════════════════
    function startLoading() {
        const fill = document.getElementById('loading-fill');
        const text = document.getElementById('loading-text');
        const messages = [
            'Loading your tongue workout...',
            'Warming up your vocal cords...',
            'Twisting the tongue twisters...',
            'Almost ready... Stretch that tongue!',
            'Let\'s gooo! 🚀',
        ];

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 8 + 2;
            if (progress >= 100) {
                progress = 100;
                fill.style.width = '100%';
                text.textContent = messages[messages.length - 1];
                clearInterval(interval);

                // Show the start button instead of auto-transitioning
                const startBtn = document.getElementById('welcome-start-container');
                if (startBtn) startBtn.style.display = 'block';
            } else {
                fill.style.width = progress + '%';
                const msgIdx = Math.min(Math.floor(progress / 25), messages.length - 1);
                text.textContent = messages[msgIdx];
            }
        }, 300);
    }

    // ═══════════════════════════════════════════════════════════════════
    // INSTRUCTIONS
    // ═══════════════════════════════════════════════════════════════════
    const acceptCheckbox = document.getElementById('accept-terms');
    const btnNext = document.getElementById('btn-next');

    acceptCheckbox.addEventListener('change', () => {
        btnNext.disabled = !acceptCheckbox.checked;
        try { SoundFX.click(); } catch (e) { }
    });

    btnNext.addEventListener('click', (e) => {
        e.preventDefault();
        try { SoundFX.click(); } catch (e) { }
        startLevel(1);
    });

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    let _pendingResultTimer = null;   // Track handleResult timeout

    function startLevel(level) {
        level = Number(level); // Force Number
        try {
            console.log('[startLevel] Initializing Level', level);
            if (level < 1 || level > 3 || isNaN(level)) {
                console.error('[startLevel] ABORT: Invalid level number:', level);
                return;
            }

            // Cancel any pending handleResult from a previous level
            if (_pendingResultTimer) {
                clearTimeout(_pendingResultTimer);
                _pendingResultTimer = null;
            }

            state.currentLevel = level;
            state.lives[level] = 3;
            state.isListening = false;
            state.isEvaluating = false;

            // Show the view FIRST so the screen is never blank
            hideAllOverlays();
            showView('level-' + level);

            // Pick a random twister
            state.currentTwister = getRandomTwister(level);
            const twisterEl = document.getElementById('twister-text-' + level);
            if (twisterEl) twisterEl.textContent = state.currentTwister;

            // Reset hearts
            resetHearts(level);

            // Reset eval display
            const evalEl = document.getElementById('eval-result-' + level);
            if (evalEl) evalEl.classList.remove('show');

            // Reset status
            const statusEl = document.getElementById('status-' + level);
            if (statusEl) statusEl.textContent = '';

            // Reset buttons
            const btnStart = document.getElementById('btn-start-' + level);
            if (btnStart) btnStart.style.display = '';
            const btnStop = document.getElementById('btn-stop-' + level);
            if (btnStop) btnStop.style.display = 'none';

            // Reset waves
            const wavesEl = document.getElementById('waves-' + level);
            if (wavesEl) wavesEl.classList.remove('active');

            console.log('[startLevel] Done — level', level, 'is now active');
        } catch (err) {
            console.error('[startLevel] CRITICAL ERROR:', err);
            alert('CRITICAL ERROR in startLevel: ' + err.message);
            // Last-resort fallback: ensure the view is shown
            try { showView('level-' + level); } catch (e) { }
        }
    }

    function resetHearts(level) {
        const container = document.getElementById('hearts-' + level);
        if (!container) return;
        const hearts = container.querySelectorAll('.heart');
        hearts.forEach(h => h.classList.remove('lost'));
    }

    function loseHeart(level) {
        state.lives[level]--;
        const container = document.getElementById('hearts-' + level);
        if (!container) return;
        const hearts = container.querySelectorAll('.heart');
        const idx = state.lives[level];
        if (hearts[idx]) {
            hearts[idx].classList.add('lost');
            hearts[idx].classList.add('shake');
            setTimeout(() => hearts[idx].classList.remove('shake'), 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SPEECH FLOW
    // ═══════════════════════════════════════════════════════════════════
    document.querySelectorAll('.btn-start').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const level = parseInt(btn.dataset.level);
            startRecording(level);
        });
    });

    document.querySelectorAll('.btn-stop').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const level = parseInt(btn.dataset.level);
            stopRecording(level);
        });
    });

    function startRecording(level) {
        if (state.isListening || state.isEvaluating) return;
        state.isListening = true;

        try { SoundFX.listening(); } catch (e) { }

        // UI updates
        document.getElementById('btn-start-' + level).style.display = 'none';
        document.getElementById('btn-stop-' + level).style.display = '';
        document.getElementById('waves-' + level).classList.add('active');
        document.getElementById('status-' + level).textContent = '🎤 Listening... Speak now!';
        document.getElementById('eval-result-' + level).classList.remove('show');

        // Start speech recognition
        SpeechManager.startListening((transcript, isFinal) => {
            // Only process if still in listening state
            if (!state.isListening) return;
            document.getElementById('status-' + level).textContent = '🎤 "' + transcript + '"';
            if (isFinal) {
                stopRecording(level);
            }
        });
    }

    async function stopRecording(level) {
        if (!state.isListening) return;
        state.isListening = false;
        state.isEvaluating = true;

        try {
            // UI updates
            document.getElementById('waves-' + level).classList.remove('active');
            document.getElementById('btn-stop-' + level).style.display = 'none';
            document.getElementById('status-' + level).textContent = '';

            // Show evaluating overlay
            showOverlay('evaluating');

            // Stop recording and get audio blob
            let audioBlob = null;
            try {
                audioBlob = await SpeechManager.stopListening();
            } catch (e) {
                console.warn('Error stopping listener:', e);
            }

            // Send to ASR API
            let asrResult;
            try {
                asrResult = await SpeechManager.sendToASR(audioBlob, state.currentTwister, level);
            } catch (e) {
                console.warn('ASR error, using defaults:', e);
                asrResult = { cer: 1.0, wpm: 0 };
            }

            // Small delay for dramatic effect
            await new Promise(r => setTimeout(r, 2000));

            hideAllOverlays();

            // Evaluate
            const evaluation = evaluateAttempt(level, asrResult.cer, asrResult.wpm);

            // Display evaluation metrics
            showEvaluation(level, evaluation);

            // Handle result after a brief pause
            _pendingResultTimer = setTimeout(() => {
                _pendingResultTimer = null;
                handleResult(level, evaluation);
            }, 1500);

        } catch (err) {
            console.error('[stopRecording] Error:', err);
            state.isEvaluating = false;
            hideAllOverlays();
            document.getElementById('btn-start-' + level).style.display = '';
        }
    }

    function showEvaluation(level, evalData) {
        document.getElementById('cer-val-' + level).textContent = evalData.cer.toFixed(2);
        document.getElementById('cer-label-' + level).textContent = evalData.cerLabel;
        document.getElementById('wpm-val-' + level).textContent = evalData.wpm;
        document.getElementById('speed-label-' + level).textContent = evalData.speedLabel;

        const cerLabelEl = document.getElementById('cer-label-' + level);
        cerLabelEl.style.color = evalData.cerLabel === 'Good' ? 'var(--success-green)' : 'var(--fail-red)';

        const speedLabelEl = document.getElementById('speed-label-' + level);
        speedLabelEl.style.color = evalData.speedLabel === 'Good Speed' ? 'var(--success-green)' : 'var(--fail-red)';

        document.getElementById('eval-result-' + level).classList.add('show');
    }

    function handleResult(level, evaluation) {
        state.isEvaluating = false;

        if (evaluation.result === 'PASS') {
            try { SoundFX.success(); } catch (e) { }

            if (level === 3) {
                // WINNER!
                showOverlay('winner');
                try { SoundFX.winner(); } catch (e) { }
                launchConfetti();
            } else {
                // Level complete
                document.getElementById('overlay-level-title').textContent = '🎉 Level ' + level + ' Completed!';
                document.getElementById('overlay-level-subtitle').textContent =
                    level === 1 ? 'Easy was a warm-up! Medium awaits...' : 'Impressive! Hard mode incoming...';
                showOverlay('levelComplete');
                launchConfetti();
            }
        } else {
            // FAIL
            loseHeart(level);
            try { SoundFX.fail(); } catch (e) { }

            if (state.lives[level] <= 0) {
                try { SoundFX.gameOver(); } catch (e) { }
                showOverlay('gameover');
            } else {
                document.getElementById('overlay-fail-text').textContent =
                    'Try again! You have ' + state.lives[level] + (state.lives[level] === 1 ? ' life' : ' lives') + ' left.';
                showOverlay('fail');
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // OVERLAY BUTTONS
    // ═══════════════════════════════════════════════════════════════════
    document.getElementById('btn-next-level').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const nextLevel = state.currentLevel + 1;
        console.log('[btn-next-level] Advancing to:', nextLevel);

        try { SoundFX.click(); } catch (err) { }

        hideAllOverlays();
        window.scrollTo(0, 0); // Ensure we start at top
        startLevel(nextLevel);

        return false;
    });

    document.getElementById('btn-try-again').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { SoundFX.click(); } catch (err) { }
        hideAllOverlays();
        // Pick a new twister but keep current lives
        state.currentTwister = getRandomTwister(state.currentLevel);
        document.getElementById('twister-text-' + state.currentLevel).textContent = state.currentTwister;
        document.getElementById('btn-start-' + state.currentLevel).style.display = '';
        document.getElementById('eval-result-' + state.currentLevel).classList.remove('show');
        document.getElementById('status-' + state.currentLevel).textContent = '';
    });

    document.getElementById('btn-restart').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { SoundFX.click(); } catch (err) { }
        resetGame();
    });

    document.getElementById('btn-play-again').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { SoundFX.click(); } catch (err) { }
        resetGame();
    });

    // Dev panel submit
    document.getElementById('dev-submit-eval').addEventListener('click', () => {
        const outputVal = document.getElementById('model-output').value;
        try {
            const result = JSON.parse(outputVal);
            window.TwistQuest.submitEvaluation(result);
        } catch (e) {
            alert('Invalid JSON in evaluation output');
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // CONFETTI
    // ═══════════════════════════════════════════════════════════════════
    function launchConfetti() {
        const container = document.getElementById('confetti-container');
        const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#A855F7', '#EC4899', '#FF9F43', '#34d399'];
        const shapes = ['square', 'circle'];

        for (let i = 0; i < 100; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            piece.style.left = Math.random() * 100 + '%';
            piece.style.background = color;
            piece.style.borderRadius = shape === 'circle' ? '50%' : '2px';
            piece.style.width = (Math.random() * 8 + 6) + 'px';
            piece.style.height = (Math.random() * 8 + 6) + 'px';
            piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
            piece.style.animationDelay = Math.random() * 0.5 + 's';
            container.appendChild(piece);
        }

        setTimeout(() => { container.innerHTML = ''; }, 4000);
    }

    // ═══════════════════════════════════════════════════════════════════
    // RESET GAME
    // ═══════════════════════════════════════════════════════════════════
    function resetGame() {
        hideAllOverlays();
        state.currentLevel = 1;
        state.lives = { 1: 3, 2: 3, 3: 3 };
        state.isListening = false;
        state.isEvaluating = false;

        acceptCheckbox.checked = false;
        btnNext.disabled = true;

        for (let lvl = 1; lvl <= 3; lvl++) {
            resetHearts(lvl);
            document.getElementById('eval-result-' + lvl).classList.remove('show');
            document.getElementById('status-' + lvl).textContent = '';
            document.getElementById('btn-start-' + lvl).style.display = '';
            document.getElementById('btn-stop-' + lvl).style.display = 'none';
            document.getElementById('waves-' + lvl).classList.remove('active');
        }

        document.getElementById('loading-fill').style.width = '0%';
        document.getElementById('loading-text').textContent = 'Loading your tongue workout...';

        const startBtn = document.getElementById('welcome-start-container');
        if (startBtn) startBtn.style.display = 'none';

        showView('welcome');
        setTimeout(startLoading, 500);
    }

    // ═══════════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════════
    function init() {
        initParticles();

        // Listen for welcome start button
        const btnWelcomeStart = document.getElementById('btn-welcome-start');
        if (btnWelcomeStart) {
            btnWelcomeStart.addEventListener('click', () => {
                showView('instructions');
                try { SoundFX.click(); } catch (e) { }
            });
        }

        showView('welcome');
        startLoading();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose crucial functions to window for HTML onclicks and debugging
    window.startLevel = startLevel;
    window.resetGame = resetGame;
    window.showView = showView;
    window.TwistQuestState = state;


})();
