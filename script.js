<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Aslis Flappy Bird Game</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1 id="gameTitle">Aslis Flappy Bird Game</h1>
  <div id="setup">
    <h2>Flappy Bird Mobile</h2>
    <label>Farbe vom Bird:
      <input type="color" id="birdColor" value="#FFD700">
    </label>
    <br><br>
    <label>Anzahl Leben:
      <input type="range" min="0" max="5" value="3" id="livesRange">
      <span id="livesValue">3</span>
    </label>
    <br>
    <button id="startBtn">Spiel starten</button>
  </div>
  <div id="game" style="display:none;">
    <div id="gameFrame">
      <canvas id="gameCanvas" width="340" height="570"></canvas>
      <div id="scoreBox">
        Score: <span id="score">0</span>
        <span id="livesBox" style="margin-left:18px;">Leben: 3</span>
        <br>
        <span id="highscoreBox">Highscore: 0</span>
      </div>
      <div id="controller">
        <button id="jumpBtn" aria-label="Springen">
          <svg viewBox="0 0 60 60" width="54" height="54">
            <circle cx="30" cy="30" r="27" stroke="#fff" stroke-width="4" fill="#333"/>
            <polygon points="22,18 42,30 22,42" fill="#fff"/>
          </svg>
        </button>
      </div>
      <button id="restartBtn" style="display:none;">Nochmal spielen</button>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>
