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

    // 1. 段選択ボタンの生成
    function createDanButtons() {
        danGrid.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            const btn = document.createElement('div');
            btn.className = 'dan-btn' + (i === state.selectedDan ? ' selected' : '');
            btn.innerHTML = `<span>${i}</span><span>の段</span>`;
            btn.onclick = () => {
                state.selectedDan = i;
                document.querySelectorAll('.dan-btn').forEach(b => b.classList.toggle('selected', parseInt(b.innerText) === i));
                if (state.isVoiceEnabled) speak(" "); // 無音でエンジンを活性化
            };
            danGrid.appendChild(btn);
        }
    }
    createDanButtons();

    // 2. 順序・音声設定（ボタンごとの独立性を担保）
    document.querySelectorAll('.order-btn').forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.order) {
                // 順序グループ内だけ切り替え
                document.querySelectorAll('.order-btn[data-order]').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.selectedOrder = btn.dataset.order;
            } else if (btn.dataset.voice) {
                // 音声グループ内だけ切り替え
                document.querySelectorAll('.order-btn[data-voice]').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.isVoiceEnabled = (btn.dataset.voice === 'true');
                if (state.isVoiceEnabled) speak("声をだします");
            }
            if (state.isVoiceEnabled) speak(" "); // 活性化
        };
    });

    // 3. クイズ進行
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
        state.userInput = '';
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
        const userAns = parseInt(state.userInput || "-1");

        if (userAns === correctAns) {
            showFeedback(true);
            if (state.isVoiceEnabled) speak("正解！");

            state.userInput = ''; // 重要：次に進む前にクリア
            state.currentIdx++;

            if (state.currentIdx >= state.problems.length) {
                setTimeout(() => {
                    progressBar.style.width = '100%';
                    if (state.isVoiceEnabled) speak("完璧です！おめでとう！");
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

    // 入力ボタン
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const val = btn.dataset.val;
            if (val === 'C') {
                state.userInput = '';
                answerDisplay.textContent = '?';
            } else if (val === 'OK') {
                // 自動判定だが念のため残す
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
        };
    });

    // 音声エンジン（堅牢版）
    function speak(text) {
        if (!window.speechSynthesis) return;

        // ブラウザのフリーズを防ぐために一端キャンセル
        window.speechSynthesis.cancel();

        const uttr = new SpeechSynthesisUtterance(text);
        uttr.lang = 'ja-JP';
        uttr.rate = 1.2;

        // 音声リスト読み込み（Chrome/Android対策）
        const voices = window.speechSynthesis.getVoices();
        const jaVoice = voices.find(v => v.lang.includes('ja')) || voices[0];
        if (jaVoice) uttr.voice = jaVoice;

        // 再生直前に resume を呼ぶ（停止対策）
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(uttr);
    }

    function showFeedback(isCorrect) {
        if (!feedbackOverlay) return;
        feedbackOverlay.textContent = isCorrect ? '⭕' : '❌';
        feedbackOverlay.className = 'feedback active ' + (isCorrect ? 'correct' : 'incorrect');
        setTimeout(() => {
            feedbackOverlay.classList.remove('active');
        }, 800);
    }

    // 表示切り替え
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    backScreen = () => showScreen('setup-screen');
    backBtn.onclick = backScreen;
    restartBtn.onclick = backScreen;

    // サービスワーカー（強制更新）
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').then(reg => {
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // 更新があったら自動リロード
                        window.location.reload();
                    }
                };
            };
        });
    }
});
