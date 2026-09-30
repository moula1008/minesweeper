let timerInterval = null;
let currentMode = 'open';
let currentCombo = 0;
let targetCombo = 0;       
let comboTimeout = null;
let isCountingCombo = false;

window.onload = function() {
    startTimer();
    
    // もしページ読み込み時にすでにクリア状態なら紙吹雪を出す
    const modal = document.getElementById("result-modal");
    if (modal && modal.classList.contains("modal-active")) {
        // クリアメッセージが含まれているか簡易チェック
        const msg = document.getElementById("modal-message");
        if (msg && msg.innerHTML.includes("クリア")) {
            startConfetti();
        }
    }
};

// ご要望の固定された0.1秒刻みタイマー関数
function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            const timerDisplay = document.getElementById("timer-display");
            if (timerDisplay) {
                let match = timerDisplay.innerText.match(/[\d.]+/);
                if (match) {
                    let currentSec = parseFloat(match[0]);
                    timerDisplay.innerText = `経過時間: ${(currentSec + 0.1).toFixed(1)} 秒`;
                }
            }
        }, 100);
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
    targetCombo += count;
    if (!isCountingCombo) {
        animateCombo();
    }
}

async function animateCombo() {
    isCountingCombo = true;
    const comboEl = document.getElementById("combo-display");
    const comboText = document.getElementById("combo-text");

    if (comboEl && !comboEl.classList.contains("combo-active")) {
        comboEl.classList.add("combo-active");
    }

    while (currentCombo < targetCombo) {
        currentCombo++;
        
        if (comboText) {
            comboText.innerText = `${currentCombo} COMBO!`;
            comboText.classList.remove("combo-pop");
            void comboText.offsetWidth; 
            comboText.classList.add("combo-pop");
        }

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
    const comboText = document.getElementById("combo-text");
    
    if (comboEl) {
        comboEl.classList.remove("combo-active"); 
        comboEl.classList.remove("combo-pop");
    }
    if (comboText) {
        comboText.classList.remove("combo-pop");
    }
}

function updateBoardUI(data) {
    const timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) {
        timerDisplay.innerText = `経過時間: ${data.time} 秒`;
    }

    const remainingCountEl = document.getElementById("remaining-count");
    const totalCountEl = document.getElementById("total-count");
    if (remainingCountEl && data.safe_remaining !== undefined) {
        remainingCountEl.innerText = data.safe_remaining;
    }
    if (totalCountEl && data.safe_total !== undefined) {
        totalCountEl.innerText = data.safe_total;
    }

    const modal = document.getElementById("result-modal");
    const modalMessage = document.getElementById("modal-message");

    if (data.status === "gameover" || data.status === "clear") {
        clearInterval(timerInterval);
        
        if (modal) {
            modal.classList.add("modal-active");
        }

        if (modalMessage) {
            if (data.status === "gameover") {
                modalMessage.innerHTML = '<h2 style="color: #e74c3c;">ゲームオーバー<br>地雷を踏みました！</h2><a href="/" class="modal-btn">トップ画面に戻る</a>';
            } else if (data.status === "clear") {
                modalMessage.innerHTML = '<h2 style="color: #27ae60;">ゲームクリア！<br>おめでとうございます！</h2><a href="/" class="modal-btn">トップ画面に戻る</a>';
                // ★ ゲームクリア時に紙吹雪を開始
                startConfetti();
            }
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

/* --- 紙吹雪（コンフェッティ）のアニメーション処理 --- */
function startConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"];

    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();

            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;

            if (p.y > canvas.height) {
                p.y = -20;
                p.x = Math.random() * canvas.width;
            }
        });

        requestAnimationFrame(draw);
    }

    draw();

    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}