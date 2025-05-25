// ====== Haupt-Variablen ======
let canvas, ctx, animationId;
let bird = {}, pipes = [];
let gameActive = false, gameOverState = false;
let gravity = 0.34, jump = -7.2;
let score = 0, speed = 2.1, birdColor = "#FFD700";
let pipeGap = 120, pipeWidth = 48, pipeMin = 60, pipeMax = 295;
let speedIncrease = 0.055, minGap = 80, maxSpeed = 5.2;
let lastPipeTime = 0, pipeInterval = 1240, frameTime = 0;
let flapAnimation = 0;

// ====== Setup & Start ======
document.getElementById('startBtn').onclick = function() {
    birdColor = document.getElementById('birdColor').value;
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('restartBtn').style.display = 'none';
    startGame();
};

document.getElementById('restartBtn').onclick = function() {
    score = 0;
    document.getElementById('score').textContent = score;
    startGame();
};

// ====== Steuerung ======
function jumpBird() {
    if (!gameActive) return;
    bird.vy = jump;
    flapAnimation = 7; // Flügel schlägt hoch
}

// Touch und Klick auf den Button
const jumpBtn = document.getElementById('jumpBtn');
jumpBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    jumpBird();
}, {passive: false});
jumpBtn.addEventListener('mousedown', jumpBird);

// Tap aufs Canvas (optional, macht mobile angenehmer)
document.getElementById('gameCanvas').addEventListener('touchstart', function(e){
    e.preventDefault();
    jumpBird();
}, {passive: false});
document.getElementById('gameCanvas').addEventListener('mousedown', jumpBird);

// Tastatur (Space) für Desktop
document.addEventListener('keydown', e => {
    if ((e.code === "Space" || e.key === " ") && gameActive) jumpBird();
});

// ====== Game-Loop & Logik ======
function startGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    pipes = [];
    bird = { x: 70, y: 220, w: 30, h: 30, vy: 0 };
    gameActive = true;
    gameOverState = false;
    score = 0;
    speed = 2.1;
    pipeGap = 120;
    lastPipeTime = 0;
    pipeInterval = 1240;
    document.getElementById('score').textContent = score;
    frameTime = performance.now();
    requestAnimationFrame(loop);
}

function createPipe() {
    let gapY = Math.floor(Math.random() * (pipeMax - pipeMin)) + pipeMin;
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
            // Schwierigkeit steigern
            if (score % 2 === 0 && speed < maxSpeed) {
                speed += speedIncrease;
                pipeGap = Math.max(pipeGap - 7, minGap);
                pipeInterval = Math.max(pipeInterval - 42, 830);
            }
        }
        // Entferne Pipes, die links raus sind
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }

    // Kollisionen prüfen
    for (let pipe of pipes) {
        if (collides(bird, pipe.x, 0, pipeWidth, pipe.gapY)) endGame();
        if (collides(bird, pipe.x, pipe.gapY + pipeGap, pipeWidth, canvas.height - pipe.gapY - pipeGap)) endGame();
    }
    // Unten/Oben raus
    if (bird.y < 0 || bird.y + bird.h > canvas.height) endGame();
}

function draw() {
    // Hintergrund
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dezente Pixelwolken
    drawClouds(ctx);

    // Pipes (rot, mit Pixelrand)
    for (let pipe of pipes) {
        drawPipe(ctx, pipe.x, 0, pipeWidth, pipe.gapY, "#f44", true);
        drawPipe(ctx, pipe.x, pipe.gapY + pipeGap, pipeWidth, canvas.height - pipe.gapY - pipeGap, "#f44", false);
    }

    // Bird (Pixel-Art-Look)
    drawBird(ctx, bird.x, bird.y, birdColor, flapAnimation);

    // Rahmen außen
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Game Over Overlay
    if (gameOverState) {
        ctx.fillStyle = "rgba(0,0,0,0.74)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, 210);
        ctx.font = "18px monospace";
        ctx.fillText("Score: " + score, canvas.width / 2, 250);
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

// ====== Hilfsfunktionen ======
function collides(a, x, y, w, h) {
    return a.x < x + w && a.x + a.w > x && a.y < y + h && a.y + a.h > y;
}

function endGame() {
    gameActive = false;
    gameOverState = true;
    document.getElementById('restartBtn').style.display = 'block';
}

// ====== Pipes im Pixel-Look ======
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
    if (up) ctx.fillRect(x + 6, y + h - 14, w - 12, 7);
    else ctx.fillRect(x + 6, y, w - 12, 7);

    ctx.restore();
}

// ====== Bird im Pixel-Look ======
function drawBird(ctx, x, y, color, flap) {
    // Körper
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2.1;
    ctx.arc(x + 15, y + 15, 13, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Auge
    ctx.beginPath();
    ctx.arc(x + 21, y + 12, 3.3, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 22, y + 12, 1.4, 0, 2 * Math.PI);
    ctx.fillStyle = "#222";
    ctx.fill();

    // Flügel (simple Animation)
    ctx.save();
    ctx.translate(x + 12, y + 18);
    ctx.rotate(flap > 0 ? -0.5 : 0.32);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, 5);
    ctx.lineTo(6, 15);
    ctx.closePath();
    ctx.fillStyle = "#eee9";
    ctx.fill();
    ctx.restore();

    // Schnabel
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 15);
    ctx.lineTo(x + 35, y + 17);
    ctx.lineTo(x + 28, y + 19);
    ctx.closePath();
    ctx.fillStyle = "#ffcb29";
    ctx.fill();

    ctx.restore();
}

// ====== Pixelwolken ======
function drawClouds(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        let cx = 60 + i * 100;
        let cy = 54 + Math.sin(performance.now() / 1600 + i) * 6;
        ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
        ctx.arc(cx + 17, cy + 8, 12, 0, 2 * Math.PI);
        ctx.arc(cx - 13, cy + 7, 11, 0, 2 * Math.PI);
        ctx.fillStyle = "#fff";
        ctx.fill();
    }
    ctx.restore();
}