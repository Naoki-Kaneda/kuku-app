document.addEventListener('DOMContentLoaded', () => {
    // 状態管理
    const state = {
        selectedDan: 1,
        selectedOrder: 'random', // 'random', 'asc', 'desc'
        isVoiceEnabled: true,
        problems: [],
        currentIdx: 0,
        userInput: '',
        correctCount: 0
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

    // 1. 段選択の生成
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('div');
        btn.className = 'dan-btn' + (i === 1 ? ' selected' : '');
        btn.innerHTML = `<span>${i}</span><span>の段</span>`;
        btn.onclick = () => {
            document.querySelectorAll('.dan-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedDan = i;
        };
        danGrid.appendChild(btn);
    }

    // 2. 順序・音声設定のハンドリング
    function setupToggleButtons() {
        // 順序ボタン（互いに影響しないように属性で分ける）
        const orderButtons = document.querySelectorAll('.order-btn[data-order]');
        orderButtons.forEach(btn => {
            btn.onclick = () => {
                orderButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.selectedOrder = btn.dataset.order;
                if (state.isVoiceEnabled) speak(""); // 音声エンジンのアクティベート
            };
        });

        // 音声ボタン
        const voiceButtons = document.querySelectorAll('.order-btn[data-voice]');
        voiceButtons.forEach(btn => {
            btn.onclick = () => {
                voiceButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.isVoiceEnabled = btn.dataset.voice === 'true';
                if (state.isVoiceEnabled) {
                    speak("オン");
                } else {
                    window.speechSynthesis.cancel();
                }
            };
        });
    }
    setupToggleButtons();

    // 3. クイズ開始
    startBtn.onclick = startQuiz;

    function startQuiz() {
        state.problems = generateProblems(state.selectedDan, state.selectedOrder);
        state.currentIdx = 0;
        state.userInput = '';
        state.correctCount = 0;

        showScreen('quiz-screen');
        updateProblem();
    }

    function generateProblems(dan, order) {
        let list = [];
        for (let i = 1; i <= 9; i++) {
            list.push({ q: `${dan} × ${i}`, a: dan * i });
        }

        if (order === 'random') {
            for (let i = list.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [list[i], list[j]] = [list[j], list[i]];
            }
        } else if (order === 'desc') {
            list.reverse();
        }
        return list;
    }

    function updateProblem() {
        const p = state.problems[state.currentIdx];
        problemText.textContent = p.q;
        answerDisplay.textContent = '?';
        state.userInput = '';

        // 読み上げ
        if (state.isVoiceEnabled) {
            const dan = p.q.split(' × ')[0];
            const num = p.q.split(' × ')[1];
            speak(`${dan} かける ${num} は？`);
        }

        // プログレスバー更新
        const progress = (state.currentIdx / state.problems.length) * 100;
        progressBar.style.width = `${progress}%`;
    }

    // 音声読み上げ
    function speak(text) {
        if (!window.speechSynthesis) return;

        // 音声合成の中断を回避（Chrome/Android対策）
        window.speechSynthesis.cancel();

        const uttr = new SpeechSynthesisUtterance(text);
        uttr.lang = 'ja-JP';
        uttr.rate = 1.2;
        uttr.pitch = 1.0;

        // 日本語音声を探してセット（より確実に喋らせるため）
        const voices = window.speechSynthesis.getVoices();
        const jaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
        if (jaVoice) uttr.voice = jaVoice;

        // 再生直前に resume を呼ぶ（ブラウザの停止対策）
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(uttr);
    }

    // 音声リストの初期読み込み
    window.speechSynthesis?.getVoices();
    if (window.speechSynthesis?.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }

    // 4. 入力処理
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.onclick = () => {
            const val = btn.dataset.val;
            if (val === 'C') {
                state.userInput = '';
                answerDisplay.textContent = '?';
            } else if (val === 'OK') {
                // 自動判定になったため、OKボタンはオプションまたは削除可能
                if (state.userInput.length > 0) checkAnswer();
            } else {
                if (state.userInput.length < 2) {
                    state.userInput += val;
                    answerDisplay.textContent = state.userInput;

                    // 自動判定ロジック
                    const correctAns = state.problems[state.currentIdx].a;
                    const currentVal = parseInt(state.userInput);

                    // 1. すでに正解の数値と一致した場合
                    if (currentVal === correctAns) {
                        checkAnswer();
                    }
                    // 2. 2桁入力済みで不正解の場合
                    else if (state.userInput.length === 2) {
                        checkAnswer();
                    }
                    // 3. 1桁入力時点で、正解が2桁だがその1桁目が既に違う場合
                    else if (state.userInput.length === 1 && Math.floor(correctAns / 10) !== currentVal && correctAns >= 10) {
                        // この場合は2桁目を待つ必要があるが、九九の特性上、
                        // 1桁目が違えば即座に間違いとしても良い（例：正解が56で5以外を入力）
                        // ただし、入力ミスの書き直しを考慮して2桁まで待つことにする
                    }
                }
            }
        };
    });

    function checkAnswer() {
        const correctAns = state.problems[state.currentIdx].a;
        const userAns = parseInt(state.userInput);

        if (userAns === correctAns) {
            showFeedback(true);
            if (state.isVoiceEnabled) speak("正解！");
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

    function showFeedback(isCorrect) {
        feedbackOverlay.textContent = isCorrect ? '⭕' : '❌';
        feedbackOverlay.className = 'feedback active ' + (isCorrect ? 'correct' : 'incorrect');
        setTimeout(() => {
            feedbackOverlay.classList.remove('active');
        }, 800);
    }

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    // ナビゲーション
    backBtn.onclick = () => showScreen('setup-screen');
    restartBtn.onclick = () => showScreen('setup-screen');

    // サービスワーカーの登録
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js');
        });
    }
});
