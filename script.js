// ======= GRUNDEINSTELLUNGEN =======
let canvas, ctx, animationId;
let bird = {}, pipes = [];
let gameActive = false;
let gravity = 0.5, jump = -8;
let score = 0, speed = 2, birdColor = "#FFD700";
let pipeGap = 110, pipeWidth = 45, pipeMin = 60, pipeMax = 320;

// ======= SETUP-BEREICH =======
document.getElementById('startBtn').onclick = function() {
    // Werte auslesen
    birdColor = document.getElementById('birdColor').value;
    let speedFactor = +document.getElementById('speed').value;
    speed = 1 + speedFactor * 1.5; // Bereich: 2.5 bis 8

    // Anzeigen wechseln
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

// ======= GAME-LOGIK =======
function startGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    pipes = [];
    bird = { x: 60, y: 240, w: 24, h: 24, vy: 0 };
    gameActive = true;
    score = 0;
    document.getElementById('score').textContent = score;

    // Pipes initial erstellen
    for (let i = 0; i < 3; i++) {
        pipes.push(createPipe(320 + i * 150));
    }

    // Steuerung
    window.onkeydown = function(e) {
        if (e.code === "Space" || e.key === " ") jumpBird();
    };
    canvas.onclick = jumpBird;
    canvas.ontouchstart = jumpBird;

    loop();
}

function createPipe(x) {
    let gapY = Math.floor(Math.random() * (pipeMax - pipeMin)) + pipeMin;
    return { x: x, gapY: gapY };
}

function jumpBird() {
    if (!gameActive) return;
    bird.vy = jump;
}

function loop() {
    animationId = requestAnimationFrame(loop);
    update();
    draw();
}

function update() {
    // Bird Bewegung
    bird.vy += gravity;
    bird.y += bird.vy;

    // Pipes verschieben und prüfen
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= speed;

        // Pipe neu generieren, wenn vorbei
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
            pipes.push(createPipe(320));
            score++;
            document.getElementById('score').textContent = score;
        }
    }

    // Kollision prüfen
    for (let pipe of pipes) {
        // Obere Pipe
        if (collides(bird, pipe.x, 0, pipeWidth, pipe.gapY)) gameOver();
        // Untere Pipe
        if (collides(bird, pipe.x, pipe.gapY + pipeGap, pipeWidth, 480 - pipe.gapY - pipeGap)) gameOver();
    }

    // Boden oder Decke
    if (bird.y < 0 || bird.y + bird.h > 480) gameOver();
}

function draw() {
    // Hintergrund
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, 320, 480);

    // Bird (Pixel-Look)
    ctx.fillStyle = birdColor;
    ctx.fillRect(bird.x, bird.y, bird.w, bird.h);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(bird.x, bird.y, bird.w, bird.h);

    // Pipes (rot)
    ctx.fillStyle = "#e74c3c";
    for (let pipe of pipes) {
        // Oben
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.gapY);
        // Unten
        ctx.fillRect(pipe.x, pipe.gapY + pipeGap, pipeWidth, 480 - pipe.gapY - pipeGap);
    }
}

function collides(a, x, y, w, h) {
    return a.x < x + w && a.x + a.w > x && a.y < y + h && a.y + a.h > y;
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, 320, 480);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", 160, 220);
    ctx.font = "16px monospace";
    ctx.fillText("Score: " + score, 160, 250);
    document.getElementById('restartBtn').style.display = 'inline-block';
}