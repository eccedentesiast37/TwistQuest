// ─── Speech Recognition + Model I/O ──────────────────────────────────
// Uses Web Speech API for real-time transcript,
// sends audio/text to remote ASR endpoint,
// and exposes hidden developer panel for model integration.

const SpeechManager = (() => {
    let recognition = null;
    let isListening = false;
    let transcriptCallback = null;
    let recordingStartTime = 0;
    let mediaRecorder = null;
    let audioChunks = [];
    let micStream = null;       // Persist mic stream to avoid repeated getUserMedia
    let sessionId = 0;          // Track session to ignore stale callbacks

    // ── ASR API Configuration ──────────────────────────────────────────
    let API_ENDPOINT = '';

    // ── Initialize Web Speech API ──────────────────────────────────────
    let _fileProtocolWarned = false;

    function initRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Web Speech API not supported in this browser.');
            return false;
        }

        if (window.location.protocol === 'file:' && !_fileProtocolWarned) {
            console.warn('Notice: Running from file:// protocol. The browser will ask for microphone permission every time you click Start. To fix this, use a local web server (like VS Code Live Server).');
            _fileProtocolWarned = true;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        return true;
    }

    // ── Bind recognition events for a specific session ─────────────────
    function bindRecognitionEvents(mySession) {
        if (!recognition) return;

        recognition.onresult = (event) => {
            if (mySession !== sessionId) return; // Stale session
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            const inputEl = document.getElementById('model-input');
            if (inputEl) inputEl.value = transcript;
            if (transcriptCallback) {
                const isFinal = event.results[event.results.length - 1]?.isFinal ?? false;
                transcriptCallback(transcript, isFinal);
            }
        };

        recognition.onerror = (event) => {
            if (mySession !== sessionId) return;
            console.warn('Speech recognition error:', event.error);
            // Don't call stopListening — let the caller handle it
        };

        recognition.onend = () => {
            if (mySession !== sessionId) return;
            console.log('Speech recognition ended naturally');
            // Set flag but don't call any external functions
            isListening = false;
        };
    }

    // ── Media Recording ────────────────────────────────────────────────
    async function startMediaRecording() {
        try {
            // Reuse existing stream if available, otherwise request new one
            if (!micStream || micStream.getTracks().every(t => t.readyState === 'ended')) {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            mediaRecorder = new MediaRecorder(micStream);
            audioChunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };
            mediaRecorder.start();
            recordingStartTime = Date.now();
        } catch (err) {
            console.error('Microphone access denied:', err);
        }
    }

    function stopMediaRecording() {
        return new Promise(resolve => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.onstop = () => {
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    resolve(blob);
                };
                try { mediaRecorder.stop(); } catch (e) { resolve(null); }
            } else {
                resolve(null);
            }
        });
    }

    // ── Public API ─────────────────────────────────────────────────────
    function startListening(onTranscript) {
        if (!recognition && !initRecognition()) {
            onTranscript('[Speech API not supported — type in dev panel]', true);
            return;
        }

        // Increment session to invalidate any stale callbacks
        sessionId++;
        const mySession = sessionId;
        bindRecognitionEvents(mySession);

        transcriptCallback = onTranscript;
        isListening = true;

        try {
            recognition.start();
        } catch (err) {
            console.warn('Speech recognition start error:', err);
            // Try aborting and restarting
            try { recognition.abort(); } catch (e) { }
            setTimeout(() => {
                try { recognition.start(); } catch (e) {
                    console.error('Cannot start recognition:', e);
                }
            }, 100);
        }

        startMediaRecording().catch(err => console.warn('Media recording error:', err));
    }

    function stopListening() {
        sessionId++; // Invalidate all current session callbacks
        isListening = false;
        if (recognition) {
            try { recognition.abort(); } catch (e) { }
        }
        return stopMediaRecording();
    }

    // ── Send to Remote ASR API ─────────────────────────────────────────
    async function sendToASR(audioBlob, referenceText, level) {
        const endpoint = API_ENDPOINT || document.getElementById('api-endpoint')?.value;

        if (!endpoint) {
            console.log('No API endpoint — using fallback evaluator');
            return fallbackEvaluate(referenceText, level);
        }

        const formData = new FormData();
        if (audioBlob) {
            formData.append('audio', audioBlob, 'recording.webm');
        }
        formData.append('reference', referenceText);
        formData.append('level', level);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            return { cer: data.cer, wpm: data.wpm };
        } catch (err) {
            console.error('ASR API error:', err);
            return fallbackEvaluate(referenceText, level);
        }
    }

    // ── Fallback Evaluator (Levenshtein-based CER) ─────────────────────
    function fallbackEvaluate(referenceText, level) {
        const transcript = document.getElementById('model-input')?.value || '';
        const ref = referenceText.toLowerCase().replace(/[^a-z ]/g, '');
        const hyp = transcript.toLowerCase().replace(/[^a-z ]/g, '');

        // Calculate CER
        let cer;
        if (hyp.length === 0) {
            // No transcript captured — give a moderate CER instead of max penalty
            cer = 0.35;
            console.warn('[Fallback] No transcript captured from Web Speech API');
        } else {
            cer = levenshteinDistance(ref, hyp) / Math.max(ref.length, 1);
        }

        // Calculate WPM
        // For short tongue twisters, use actual transcript words and adjust
        const durationSec = recordingStartTime > 0
            ? (Date.now() - recordingStartTime) / 1000
            : 5; // fallback to 5 seconds if timer wasn't set
        const spokenWords = hyp ? hyp.split(/\s+/).filter(w => w.length > 0).length : 0;
        const refWords = ref.split(/\s+/).filter(w => w.length > 0).length;
        // Use whichever word count is higher to be generous
        const wordCount = Math.max(spokenWords, refWords);
        // Clamp duration to at least 1 second to avoid division issues
        const clampedDuration = Math.max(durationSec, 1);
        let wpm = Math.round((wordCount / clampedDuration) * 60);

        // For very short phrases, the raw WPM can be unrealistically low.
        // If the user spoke *something*, give them at least a fair WPM.
        if (spokenWords > 0 && wpm < 80) {
            wpm = 80 + Math.floor(Math.random() * 60); // 80-140 range
        }

        console.log('[Fallback Eval] ref:', ref.substring(0, 40) + '...');
        console.log('[Fallback Eval] hyp:', hyp.substring(0, 40) + '...');
        console.log('[Fallback Eval] CER:', cer.toFixed(2), 'WPM:', wpm, 'duration:', clampedDuration.toFixed(1) + 's');

        return { cer: Math.round(cer * 100) / 100, wpm };
    }

    function levenshteinDistance(a, b) {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
        return dp[m][n];
    }

    // ── Dev Panel Toggle (Ctrl+Shift+D) ────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            const panel = document.getElementById('model-io');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        }
    });

    // ── Expose global hooks for external model integration ─────────────
    window.TwistQuest = window.TwistQuest || {};
    window.TwistQuest.setAPIEndpoint = (url) => { API_ENDPOINT = url; };
    window.TwistQuest.getTranscript = () => document.getElementById('model-input')?.value;
    window.TwistQuest.submitEvaluation = (result) => {
        const outputEl = document.getElementById('model-output');
        if (outputEl) outputEl.value = JSON.stringify(result);
        document.dispatchEvent(new CustomEvent('modelEvaluation', { detail: result }));
    };

    return {
        startListening,
        stopListening,
        sendToASR,
        setEndpoint(url) { API_ENDPOINT = url; }
    };
})();
