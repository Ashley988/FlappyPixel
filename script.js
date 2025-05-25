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

// (Optional: Tap aufs Canvas als Sprung)
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
    update(dt