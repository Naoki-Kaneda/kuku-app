document.addEventListener('DOMContentLoaded', () => {
    // 状態管理
    const state = {
        selectedDan: 1,
        selectedOrder: 'random',
        isVoiceEnabled: true,
        problems: [],
        currentIdx: 0,
        userInput: '',
    };

    // DOM要素
    const danGrid = document.getElementById('dan-selection');
    const startBtn = document.getElementById('start-btn');
    const setupScreen = document.getElementById('setup-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    const problemText = document.getElementById('problem-text');
    const answerDisplay = document.getElementById('answer-display');
    const progressBar = document.getElementById('progress');
    const feedbackOverlay = document.getElementById('feedback-overlay');
    const backBtn = document.getElementById('back-btn');
    const restartBtn = document.getElementById('restart-btn');

    // 1. 初期化: 段選択ボタン
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('div');
        btn.className = 'dan-btn' + (i === 1 ? ' selected' : '');
        btn.innerHTML = `<span>${i}</span><span>の段</span>`;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dan-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedDan = i;
            if (state.isVoiceEnabled) speak(""); // エンジン起動用
        });
        danGrid.appendChild(btn);
    }

    // 2. 初期化: 順序・音声設定（個別に管理）
    function initSettings() {
        // 順序ボタン
        document.querySelectorAll('.order-btn[data-order]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.order-btn[data-order]').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.selectedOrder = btn.dataset.order;
                if (state.isVoiceEnabled) speak("");
            });
        });

        // 音声ボタン
        document.querySelectorAll('.order-btn[data-voice]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.order-btn[data-voice]').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.isVoiceEnabled = (btn.dataset.voice === 'true');
                if (state.isVoiceEnabled) {
                    speak("オンにしました");
                } else {
                    window.speechSynthesis.cancel();
                }
            });
        });
    }
    initSettings();

    // 3. クイズロジック
    startBtn.onclick = () => {
        state.problems = [];
        for (let i = 1; i <= 9; i++) {
            state.problems.push({ q: `${state.selectedDan} × ${i}`, a: state.selectedDan * i });
        }
        if (state.selectedOrder === 'random') {
            state.problems.sort(() => Math.random() - 0.5);
        } else if (state.selectedOrder === 'desc') {
            state.problems.reverse();
        }

        state.currentIdx = 0;
        showScreen('quiz-screen');
        updateProblem();
    };

    function updateProblem() {
        if (state.currentIdx >= state.problems.length) return;
        const p = state.problems[state.currentIdx];
        problemText.textContent = p.q;
        answerDisplay.textContent = '?';
        state.userInput = '';

        const progress = (state.currentIdx / state.problems.length) * 100;
        progressBar.style.width = `${progress}%`;

        if (state.isVoiceEnabled) {
            const parts = p.q.split(' × ');
            speak(`${parts[0]} かける ${parts[1]} は？`);
        }
    }

    function checkAnswer() {
        const correctAns = state.problems[state.currentIdx].a;
        const userAns = parseInt(state.userInput);

        if (userAns === correctAns) {
            showFeedback(true);
            if (state.isVoiceEnabled) speak("正解！");

            // 重要：次の問題へ行く前に現在の入力を空にする
            state.userInput = '';

            state.currentIdx++;
            if (state.currentIdx >= state.problems.length) {
                setTimeout(() => {
                    progressBar.style.width = '100%';
                    if (state.isVoiceEnabled) speak("完璧です！おめでどう！");
                    showScreen('result-screen');
                }, 800);
            } else {
                setTimeout(updateProblem, 800);
            }
        } else {
            showFeedback(false);
            if (state.isVoiceEnabled) speak("おしい！");
            state.userInput = '';
            answerDisplay.textContent = '?';
        }
    }

    // 入力
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.val;
            if (val === 'C') {
                state.userInput = '';
                answerDisplay.textContent = '?';
            } else if (val === 'OK') {
                if (state.userInput) checkAnswer();
            } else {
                if (state.userInput.length < 2) {
                    state.userInput += val;
                    answerDisplay.textContent = state.userInput;
                    const correctAns = state.problems[state.currentIdx].a;
                    if (parseInt(state.userInput) === correctAns) {
                        checkAnswer();
                    } else if (state.userInput.length === 2) {
                        checkAnswer();
                    }
                }
            }
        });
    });

    // 音声エンジン
    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        if (!text) return;

        const uttr = new SpeechSynthesisUtterance(text);
        uttr.lang = 'ja-JP';
        uttr.rate = 1.2;

        // 音声リスト読み込み待ち対応
        const voices = window.speechSynthesis.getVoices();
        const jaVoice = voices.find(v => v.lang.includes('ja'));
        if (jaVoice) uttr.voice = jaVoice;

        window.speechSynthesis.resume();
        window.speechSynthesis.speak(uttr);
    }

    // 表示切り替え
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    backBtn.onclick = () => showScreen('setup-screen');
    restartBtn.onclick = () => showScreen('setup-screen');

    // PWA登録
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js').catch(() => { });
        });
    }
});
