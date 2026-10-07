// --- ゲームの状態管理変数 ---
let boardWidth = 10;
let boardHeight = 10;
let bombCount = 10;

let board = []; 
let gameStatus = 'playing'; 
let firstClick = true;

let safeTotal = 0;
let safeRemaining = 0;

let timerInterval = null;
let elapsedTime = 0;

let currentMode = 'open';
let currentCombo = 0;
let targetCombo = 0;       
let comboTimeout = null;
let isCountingCombo = false;

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const size = parseInt(urlParams.get('size')) || 10;
    
    const width = size;
    const height = size;
    
    // ★ 地雷の割合を「2割(0.2)」に変更
    const bombs = Math.max(1, Math.floor(width * height * 0.2));

    initGame(width, height, bombs);
};

// --- ゲーム初期化 ---
function initGame(width, height, bombs) {
    boardWidth = width;
    boardHeight = height;
    bombCount = bombs;
    gameStatus = 'playing';
    firstClick = true;
    elapsedTime = 0;
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    safeTotal = (boardWidth * boardHeight) - bombCount;
    safeRemaining = safeTotal;

    board = [];
    for (let y = 0; y < boardHeight; y++) {
        let row = [];
        for (let x = 0; x < boardWidth; x++) {
            row.push([0, false, false, false]); // [周囲地雷数, 開いているか, 地雷か, 旗か]
        }
        board.push(row);
    }

    renderBoardHTML();
    updateUI();
    startTimer();
}

// --- タイマー処理（0.1秒刻み固定） ---
function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            if (gameStatus === 'playing') {
                elapsedTime += 0.1;
                const timerDisplay = document.getElementById("timer-display");
                if (timerDisplay) {
                    timerDisplay.innerText = `経過時間: ${elapsedTime.toFixed(1)} 秒`;
                }
            }
        }, 100);
    }
}

// --- 地雷のランダム配置（初回クリック位置を避ける） ---
function placeBombs(firstX, firstY) {
    let placed = 0;
    while (placed < bombCount) {
        let rx = Math.floor(Math.random() * boardWidth);
        let ry = Math.floor(Math.random() * boardHeight);

        if ((rx === firstX && ry === firstY) || board[ry][rx][2]) {
            continue;
        }

        board[ry][rx][2] = true;
        placed++;
    }

    for (let y = 0; y < boardHeight; y++) {
        for (let x = 0; x < boardWidth; x++) {
            if (board[y][x][2]) continue;
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    let ny = y + dy;
                    let nx = x + dx;
                    if (ny >= 0 && ny < boardHeight && nx >= 0 && nx < boardWidth) {
                        if (board[ny][nx][2]) count++;
                    }
                }
            }
            board[y][x][0] = count;
        }
    }
}

// --- クリック処理 ---
function handleClick(x, y, action) {
    if (gameStatus !== 'playing') return;

    if (action === 'open') {
        action = currentMode;
    }

    if (action === 'flag') {
        if (!board[y][x][1]) {
            board[y][x][3] = !board[y][x][3];
            updateCellUI(x, y);
        }
        return;
    }

    if (board[y][x][3] || board[y][x][1]) return;

    if (firstClick) {
        placeBombs(x, y);
        firstClick = false;
    }

    if (board[y][x][2]) {
        board[y][x][1] = true;
        gameStatus = 'gameover';
        revealAllBombs();
        endGame();
        return;
    }

    let newlyOpened = openCell(x, y);

    if (newlyOpened > 0) {
        triggerCombo(newlyOpened);
    }

    checkWinCondition();
    updateUI();
}

// マスを開く再帰処理
function openCell(x, y) {
    if (x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) return 0;
    if (board[y][x][1] || board[y][x][3]) return 0;

    board[y][x][1] = true;
    safeRemaining--;
    let count = 1;

    if (board[y][x][0] === 0) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                count += openCell(x + dx, y + dy);
            }
        }
    }
    return count;
}

function revealAllBombs() {
    for (let y = 0; y < boardHeight; y++) {
        for (let x = 0; x < boardWidth; x++) {
            if (board[y][x][2]) {
                board[y][x][1] = true;
            }
        }
    }
}

function checkWinCondition() {
    if (safeRemaining === 0) {
        gameStatus = 'clear';
        endGame();
    }
}

function endGame() {
    clearInterval(timerInterval);
    updateUI();
    
    const modal = document.getElementById("result-modal");
    const modalMessage = document.getElementById("modal-message");

    if (modal && modalMessage) {
        modal.classList.add("modal-active");
        if (gameStatus === "gameover") {
            modalMessage.innerHTML = '<h2 style="color: #e74c3c;">ゲームオーバー<br>地雷を踏みました！</h2><a href="index.html" class="modal-btn">トップ画面に戻る</a>';
        } else if (gameStatus === "clear") {
            modalMessage.innerHTML = '<h2 style="color: #27ae60;">ゲームクリア！<br>おめでとうございます！</h2><a href="index.html" class="modal-btn">トップ画面に戻る</a>';
            startConfetti();
        }
    }
}

// --- HTML描画・UI更新 ---
function renderBoardHTML() {
    const container = document.getElementById("board-container");
    if (!container) return;
    container.innerHTML = "";

    for (let y = 0; y < boardHeight; y++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "board-row";

        for (let x = 0; x < boardWidth; x++) {
            const btn = document.createElement("button");
            btn.className = "cell";
            btn.id = `cell-${y}-${x}`;
            btn.type = "button";
            
            btn.onclick = () => handleClick(x, y, 'open');
            btn.oncontextmenu = (e) => {
                e.preventDefault();
                handleClick(x, y, 'flag');
            };

            rowDiv.appendChild(btn);
        }
        container.appendChild(rowDiv);
    }
}

function updateUI() {
    // 地雷総数と残りマス数を更新
    const totalBombEl = document.getElementById("total-bomb-count");
    if (totalBombEl) totalBombEl.innerText = bombCount;

    const remainingCountEl = document.getElementById("remaining-count");
    if (remainingCountEl) remainingCountEl.innerText = safeRemaining;

    const totalCountEl = document.getElementById("total-count");
    if (totalCountEl) totalCountEl.innerText = safeTotal;

    for (let y = 0; y < boardHeight; y++) {
        for (let x = 0; x < boardWidth; x++) {
            updateCellUI(x, y);
        }
    }
}

function updateCellUI(x, y) {
    const [bombCountCell, isOpen, isBomb, isFlagged] = board[y][x];
    const btn = document.getElementById(`cell-${y}-${x}`);
    if (!btn) return;

    if (isOpen) {
        btn.disabled = true;
        btn.className = `cell ${isBomb ? '' : 'num-' + bombCountCell}`;
        if (isBomb) {
            btn.innerText = "💣";
        } else if (bombCountCell > 0) {
            btn.innerText = bombCountCell;
        } else {
            btn.innerText = "";
        }
    } else {
        btn.className = "cell";
        btn.disabled = (gameStatus !== "playing");
        btn.innerText = isFlagged ? "🚩" : "";
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

// --- コンボアニメーション ---
function triggerCombo(count) {
    targetCombo += count;
    
    // すでにカウント中（表示中）であれば、フェードインの処理はスキップしてターゲット数だけ増やす
    if (!isCountingCombo) {
        animateCombo();
    }
}

async function animateCombo() {
    isCountingCombo = true;
    const comboEl = document.getElementById("combo-display");
    const comboText = document.getElementById("combo-text");

    // まだ表示されていなければ、ここで初めてフェードイン（表示）させる
    if (comboEl && !comboEl.classList.contains("combo-active")) {
        comboEl.classList.add("combo-active");
    }

    // 目標のコンボ数（targetCombo）に到達するまでカウントアップ
    while (currentCombo < targetCombo) {
        currentCombo++;
        if (comboText) {
            comboText.innerText = `${currentCombo} COMBO!`;
            comboText.classList.remove("combo-pop");
            void comboText.offsetWidth; // アニメーションの再トリガー用トリックス
            comboText.classList.add("combo-pop");
        }
        // たくさんのマスが一気に開いたときはテンポよくカウントアップするように間隔を少し短く（50ms）
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    isCountingCombo = false;
    resetComboTimer();
}

function resetComboTimer() {
    if (comboTimeout) clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => resetCombo(), 3000);
}

function resetCombo() {
    currentCombo = 0;
    targetCombo = 0;
    const comboEl = document.getElementById("combo-display");
    const comboText = document.getElementById("combo-text");
    if (comboEl) comboEl.classList.remove("combo-active");
    if (comboText) comboText.classList.remove("combo-pop");
}

// --- 紙吹雪アニメーション ---
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
}