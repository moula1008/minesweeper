let timerInterval = null;
let currentMode = 'open';
let currentCombo = 0;
let targetCombo = 0;       
let comboTimeout = null;
let isCountingCombo = false;

window.onload = function() {
    startTimer();
};

function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            const timerDisplay = document.getElementById("timer-display");
            if (timerDisplay) {
                let match = timerDisplay.innerText.match(/[\d.]+/);
                if (match) {
                    let currentSec = parseFloat(match[0]);
                    timerDisplay.innerText = `経過時間: ${(currentSec + 1).toFixed(1)} 秒`;
                }
            }
        }, 1000);
    }
}

function toggleMode() {
    currentMode = currentMode === 'open' ? 'flag' : 'open';
    const btn = document.getElementById("mode-toggle-btn");
    
    if (currentMode === 'open') {
        btn.innerText = '⛏️ 掘るモード';
        btn.style.backgroundColor = '#e0e0e0';
    } else {
        btn.innerText = '🚩 旗モード';
        btn.style.backgroundColor = '#ffcccc';
    }
}

async function sendClick(button, action) {
    if (action === 'open') {
        action = currentMode;
    }

    const x = button.getAttribute("data-x");
    const y = button.getAttribute("data-y");

    const formData = new FormData();
    formData.append("x", x);
    formData.append("y", y);
    formData.append("action", action);

    const response = await fetch("/api/click", {
        method: "POST",
        body: formData
    });
    
    const data = await response.json();
    updateBoardUI(data);

    if (data.status === "playing" && action === "open" && data.newly_opened > 0) {
        triggerCombo(data.newly_opened);
    } else if (data.status !== "playing") {
        resetCombo();
    }
}

function triggerCombo(count) {
    // 最終的な目標コンボ数を増やす
    targetCombo += count;

    // もし現在カウントアップ演出中でなければ、アニメーションを開始する
    if (!isCountingCombo) {
        animateCombo();
    }
}

async function animateCombo() {
    isCountingCombo = true;
    const comboEl = document.getElementById("combo-display");

    // まず全体をスライドインさせる
    if (comboEl && !comboEl.classList.contains("combo-active")) {
        comboEl.classList.add("combo-active");
    }

    while (currentCombo < targetCombo) {
        currentCombo++;
        
        if (comboEl) {
            comboEl.innerText = `${currentCombo} COMBO!`;
            
            // 数字が増える瞬間のポップアニメーションをリセットして再発動
            comboEl.classList.remove("combo-pop");
            void comboEl.offsetWidth; // ブラウザに再描画を強制
            comboEl.classList.add("combo-pop");
        }

        // 1カウントの待機時間
        await new Promise(resolve => setTimeout(resolve, 80));
    }

    isCountingCombo = false;
    resetComboTimer();
}

function resetComboTimer() {
    if (comboTimeout) {
        clearTimeout(comboTimeout);
    }
    comboTimeout = setTimeout(() => {
        resetCombo();
    }, 3000);
}

function resetCombo() {
    currentCombo = 0;
    targetCombo = 0;
    const comboEl = document.getElementById("combo-display");
    if (comboEl) {
        // スライドアウト・フェードアウトさせる
        comboEl.classList.remove("combo-active");
        comboEl.classList.remove("combo-pop");
    }
}

function updateBoardUI(data) {
    const timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) {
        timerDisplay.innerText = `経過時間: ${data.time} 秒`;
    }

    const messageDiv = document.getElementById("message-display");

    if (data.status === "gameover" || data.status === "clear") {
        clearInterval(timerInterval);
        
        if (data.status === "gameover") {
            messageDiv.innerHTML = '<h2 style="color: red;">ゲームオーバー...地雷を踏みました！</h2><br><a href="/">トップ画面に戻る</a>';
        } else if (data.status === "clear") {
            messageDiv.innerHTML = '<h2 style="color: blue;">ゲームクリア！おめでとうございます！</h2><br><a href="/">トップ画面に戻る</a>';
        }
    }

    for (let y = 0; y < data.board.length; y++) {
        for (let x = 0; x < data.board[y].length; x++) {
            const [bombCount, isOpen, isBomb, isFlagged] = data.board[y][x];
            const button = document.getElementById(`cell-${y}-${x}`);
            
            if (!button) continue;

            if (isOpen) {
                button.disabled = true;
                button.className = `cell ${isBomb ? '' : 'num-' + bombCount}`;
                if (isBomb) {
                    button.innerText = "💣";
                } else if (bombCount > 0) {
                    button.innerText = bombCount;
                } else {
                    button.innerText = "";
                }
            } else {
                button.className = "cell";
                button.disabled = (data.status !== "playing");
                
                if (isFlagged) {
                    button.innerText = "🚩";
                } else {
                    button.innerText = "";
                }
            }
        }
    }
}