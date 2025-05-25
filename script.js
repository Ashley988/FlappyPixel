// ========== SPIELVARIABLEN ==========
let canvas, ctx, animationId;
let bird = {}, pipes = [];
let gameActive = false, gameOverState = false;
let gravity = 0.23, jump = -4.6;
let score = 0, speed = 1.85, birdColor = "#FFD700";
let pipeGap = 205, pipeWidth = 52, pipeMin = 32, pipeMax = 410;
let speedIncrease = 0.019, minGap = 115, maxSpeed = 3.4;
let lastPipeTime = 0, pipeInterval = 1540, frameTime = 0;
let flapAnimation = 0;
let lives = 3;
let invulnerable = false;
let selectedLives = 3;

// ======= Leben-Auswahl vor Spielstart =======
const livesRange = document.getElementById('livesRange');
const livesValue = document.getElementById('livesValue');
selectedLives = parseInt(livesRange.value, 10);

livesRange.addEventListener('input', function() {
    livesValue.textContent = livesRange.value;
    selectedLives = parseInt(livesRange.value, 10);
});

// ======= Setup & Start =======
document.getElementById('startBtn').onclick = function() {
    birdColor = document.getElementById('birdColor').value;
    lives = selectedLives;
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('restartBtn').style.display = 'none';
    startGame();
};

document.getElementById('restartBtn').onclick = function() {
    score = 0;
    lives = selectedLives;
    document.getElementById('score').textContent = score;
    startGame();
};

// ======= Steuerung =======
function jumpBird() {
    if (!gameActive) return;
    bird.vy = jump;
    flapAnimation = 7;
}

const jumpBtn = document.getElementById('jumpBtn');
jumpBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    jumpBird();
}, {passive: false});
jumpBtn.addEventListener('mousedown', jumpBird);

document.getElementById('gameCanvas').addEventListener('touchstart', function(e){
    e.preventDefault();
    jumpBird();
}, {passive: false});
document.getElementById('gameCanvas').addEventListener('mousedown', jumpBird);

document.addEventListener('keydown', e => {
    if ((e.code === "Space" || e.key === " ") && gameActive) jumpBird();
});

// ======= Game-Loop & Logik =======
function startGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    pipes = [];
    bird = { x: 70, y: canvas.height / 2 - 18, w: 34, h: 34, vy: 0 };
    gameActive = true;
    gameOverState = false;
    score = 0;
    speed = 1.85;
    pipeGap = 205;
    lastPipeTime = 0;
    pipeInterval = 1540;
    invulnerable = false;
    document.getElementById('score').textContent = score;
    updateLivesDisplay();
    frameTime = performance.now();
    requestAnimationFrame(loop);
}

function createPipe() {
    let minH = 28;
    let maxH = canvas.height - pipeGap - minH;
    let gapY = Math.floor(Math.random() * (maxH - minH + 1)) + minH;
    return { x: canvas.width, gapY: gapY, scored: false };
}

function update(dt) {
    if (!gameActive) return;

    bird.vy += gravity;
    bird.y += bird.vy;

    // Flügelanimation
    if (flapAnimation > 0) flapAnimation--;

    // Pipes erzeugen
    if (performance.now() - lastPipeTime > pipeInterval) {
        pipes.push(createPipe());
        lastPipeTime = performance.now();
    }
    // Pipes bewegen und prüfen
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= speed;
        // Score + Schwierigkeit
        if (!pipes[i].scored && pipes[i].x + pipeWidth < bird.x) {
            pipes[i].scored = true;
            score++;
            document.getElementById('score').textContent = score;
            // Schwierigkeit LANGSAM steigern
            if (score % 6 === 0 && speed < maxSpeed) {
                speed += speedIncrease;
                pipeGap = Math.max(pipeGap - 7, minGap);
                pipeInterval = Math.max(pipeInterval - 35, 870);
            }
        }
        // Entferne Pipes, die links raus sind
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }

    // Kollisionen prüfen (erst nach X Crashs wirklich Game Over)
    if (!invulnerable) {
        let hit = false;
        for (let pipe of pipes) {
            if (collides(bird, pipe.x, 0, pipeWidth, pipe.gapY)) hit = true;
            if (collides(bird, pipe.x, pipe.gapY + pipeGap, pipeWidth, canvas.height - pipe.gapY - pipeGap)) hit = true;
        }
        // Unten/Oben raus
        if (bird.y < 0 || bird.y + bird.h > canvas.height) hit = true;
        if (hit) handleHit();
    }
}

function handleHit() {
    lives--;
    updateLivesDisplay();
    if (lives <= 0) {
        endGame();
        return;
    }
    invulnerable = true;
    bird.y = canvas.height / 2 - 18;
    bird.vy = 0;
    setTimeout(() => { invulnerable = false; }, 1200);
}

function updateLivesDisplay() {
    document.getElementById('livesBox').textContent = 'Leben: ' + lives;
}

function draw() {
    // Hintergrund
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pixelwolken
    drawClouds(ctx);

    // Pipes (rot, mit Pixelrand)
    for (let pipe of pipes) {
        drawPipe(ctx, pipe.x, 0, pipeWidth, pipe.gapY, "#f44", true);
        drawPipe(ctx, pipe.x, pipe.gapY + pipeGap, pipeWidth, canvas.height - pipe.gapY - pipeGap, "#f44", false);
    }

    // Bird (Pixel-Art-Look), bei Unverwundbarkeit halb durchsichtig
    ctx.save();
    if (invulnerable) ctx.globalAlpha = 0.42 + 0.25 * Math.sin(performance.now()/90);
    drawBird(ctx, bird.x, bird.y, birdColor, flapAnimation);
    ctx.restore();

    // Rahmen außen
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Game Over Overlay
    if (gameOverState) {
        ctx.fillStyle = "rgba(0,0,0,0.73)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 32px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, 240);
        ctx.font = "20px monospace";
        ctx.fillText("Score: " + score, canvas.width / 2, 282);
        ctx.font = "15px monospace";
        ctx.fillText("Tippe 'Nochmal spielen'", canvas.width / 2, 315);
    }
}

function loop(ts) {
    if (!gameActive && !gameOverState) return;
    let now = performance.now();
    let dt = now - frameTime;
    frameTime = now;
    update(dt);
    draw();
    if (gameActive) requestAnimationFrame(loop);
}

// ======= Hilfsfunktionen =======
function collides(a, x, y, w, h) {
    return a.x < x + w && a.x + a.w > x && a.y < y + h && a.y + a.h > y;
}

function endGame() {
    gameActive = false;
    gameOverState = true;
    document.getElementById('restartBtn').style.display = 'block';
}

// ======= Pipes im Pixel-Look =======
function drawPipe(ctx, x, y, w, h, color, up) {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    // Pixel-Highlight
    ctx.fillStyle = "#fff2";
    if (up) ctx.fillRect(x + 6, y + h - 13, w - 12, 7);
    else ctx.fillRect(x + 6, y, w - 12, 7);

    ctx.restore();
}

// ======= Bird im Pixel-Look =======
function drawBird(ctx, x, y, color, flap) {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2.1;
    ctx.arc(x + 17, y + 17, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Auge
    ctx.beginPath();
    ctx.arc(x + 23, y + 11, 3.6, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 25, y + 12, 1.4, 0, 2 * Math.PI);
    ctx.fillStyle = "#222";
    ctx.fill();

    // Flügel (simple Animation)
    ctx.save();
    ctx.translate(x + 13, y + 21);
    ctx.rotate(flap > 0 ? -0.52 : 0.27);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(13, 5);
    ctx.lineTo(8, 15);
    ctx.closePath();
    ctx.fillStyle = "#eee9";
    ctx.fill();
    ctx.restore();

    // Schnabel
    ctx.beginPath();
    ctx.moveTo(x + 31, y + 16);
    ctx.lineTo(x + 38, y + 18);
    ctx.lineTo(x + 31, y + 20);
    ctx.closePath();
    ctx.fillStyle = "#ffcb29";
    ctx.fill();

    ctx.restore();
}

// ======= Pixelwolken =======
function drawClouds(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.11;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        let cx = 75 + i * 88;
        let cy = 56 + Math.sin(performance.now() / 1500 + i) * 8;
        ctx.arc(cx, cy, 23, 0, 2 * Math.PI);
        ctx.arc(cx + 17, cy + 8, 12, 0, 2 * Math.PI);
        ctx.arc(cx - 15, cy + 7, 10, 0, 2 * Math.PI);
        ctx.fillStyle = "#fff";
        ctx.fill();
    }
    ctx.restore();
}