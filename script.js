// Firebase-Konfiguration und Initialisierung
// HINWEIS: Hier eigene Firebase-Projektdaten eintragen.
// Ein Firebase-Projekt mit Realtime Database ist erforderlich.
// Die folgenden Platzhalter (apiKey, authDomain, etc.) müssen durch echte Werte ersetzt werden.
// Zudem sollten die Datenbank-Regeln für dieses Projekt Lese/Schreibzugriff ohne Authentifizierung erlauben,
// damit kein Login nötig ist (für Demo-Zwecke).
var firebaseConfig = {
  apiKey: "<YOUR-API-KEY>",            // TODO: Eigenen API Key einfügen
  authDomain: "<YOUR-AUTH-DOMAIN>",    // z.B. "meinprojekt.firebaseapp.com"
  databaseURL: "<YOUR-DATABASE-URL>",  // z.B. "https://meinprojekt.firebaseio.com"
  projectId: "<YOUR-PROJECT-ID>",
  storageBucket: "<YOUR-STORAGE-BUCKET>",
  messagingSenderId: "<YOUR-MESSAGING-SENDER-ID>",
  appId: "<YOUR-APP-ID>"
};
// Firebase initialisieren
firebase.initializeApp(firebaseConfig);
var database = firebase.database();  // Referenz auf die Realtime-Datenbank

// Globale Variablen für den Spielzustand
var gameMode = null;              // aktueller Modus: "bot", "local" oder "online"
var board = ["", "", "", "", "", "", "", "", ""];  // Spielbrett (Array mit 9 Feldern)
var currentPlayer = "X";          // aktueller Spieler (für lokale Modi)
var gameActive = false;           // läuft das Spiel gerade?
var mySymbol = null;              // Symbol des lokalen Spielers im Online-Modus ("X" oder "O")
var isHost = false;               // ist dieser Client der Host (Spielerstarter) im Online-Modus?
var gameRef = null;               // Referenz auf den Firebase-Spiel-Eintrag (im Online-Modus)
var currentTurnOnline = null;     // welches Symbol ist im Online-Modus gerade am Zug
var botTimeout = null;            // Timeout-ID für verzögerten Bot-Zug (zum Abbrechen bei Reset)

// Wichtige DOM-Elemente abrufen
var startScreen = document.getElementById("start-screen");
var modeSelection = document.getElementById("mode-selection");
var gameContainer = document.getElementById("game-container");
var statusText = document.getElementById("status");
var startButton = document.getElementById("start-btn");
var modeBotButton = document.getElementById("mode-bot");
var modeLocalButton = document.getElementById("mode-local");
var modeOnlineButton = document.getElementById("mode-online");
var resetButton = document.getElementById("reset-btn");
var cells = document.querySelectorAll(".cell");

// Prüfen, ob per Link einem Online-Spiel beigetreten werden soll (URL-Parameter)
window.addEventListener("load", function() {
  var params = new URLSearchParams(window.location.search);
  if (params.has("game")) {
    // Direkt in den Online-Modus als zweiter Spieler wechseln, falls game-ID in URL vorhanden
    var gameId = params.get("game");
    // Start- und Auswahlbildschirm überspringen
    startScreen.style.display = "none";
    modeSelection.style.display = "none";
    gameContainer.style.display = "flex";
    gameMode = "online";
    joinOnlineGame(gameId);
  }
});

// Event-Listener für den Start-Button (wechselt zur Modus-Auswahl)
startButton.addEventListener("click", function() {
  startScreen.style.display = "none";
  modeSelection.style.display = "flex";
});

// Event-Listener für Modus-Buttons
modeBotButton.addEventListener("click", function() {
  startBotGame();
});
modeLocalButton.addEventListener("click", function() {
  startLocalGame();
});
modeOnlineButton.addEventListener("click", function() {
  startOnlineGameAsHost();
});

// Event-Listener für Klicks auf Spielfeld-Zellen
cells.forEach(function(cell) {
  cell.addEventListener("click", handleCellClick);
});

// Event-Listener für "Neues Spiel"-Button (zurück zur Modus-Auswahl / Reset)
resetButton.addEventListener("click", function() {
  // Im Online-Modus: Event-Listener für das aktuelle Spiel von Firebase trennen
  if (gameMode === "online" && gameRef) {
    gameRef.off();
  }
  // Falls ein Bot-Zug geplant war, Timer abbrechen
  if (botTimeout) {
    clearTimeout(botTimeout);
    botTimeout = null;
  }
  // Spielzustand zurücksetzen
  gameActive = false;
  gameMode = null;
  mySymbol = null;
  isHost = false;
  currentTurnOnline = null;
  // UI zurücksetzen: zurück zur Modus-Auswahl
  gameContainer.style.display = "none";
  modeSelection.style.display = "flex";
  // Spielfeld leeren
  board = ["", "", "", "", "", "", "", "", ""];
  cells.forEach(function(cell) {
    cell.textContent = "";
  });
  // Statusanzeige leeren
  statusText.textContent = "";
});

// Funktion: Startet den Bot-Modus
function startBotGame() {
  gameMode = "bot";
  modeSelection.style.display = "none";
  gameContainer.style.display = "flex";
  // Anfangszustand festlegen
  board = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";   // Spieler X beginnt
  gameActive = true;
  statusText.textContent = "Du spielst X. Du beginnst.";
  // Spielfeld anzeigen (alle Felder sind bereits leer)
  cells.forEach(function(cell) {
    cell.textContent = "";
  });
}

// Funktion: Startet den lokalen 2-Spieler-Modus
function startLocalGame() {
  gameMode = "local";
  modeSelection.style.display = "none";
  gameContainer.style.display = "flex";
  board = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";   // X beginnt
  gameActive = true;
  statusText.textContent = "X beginnt.";
  cells.forEach(function(cell) {
    cell.textContent = "";
  });
}

// Funktion: Startet ein neues Online-Spiel als Host (erstellt einen neuen Spielraum)
function startOnlineGameAsHost() {
  gameMode = "online";
  isHost = true;
  mySymbol = "X";  // Host spielt als X
  modeSelection.style.display = "none";
  gameContainer.style.display = "flex";
  // Neues Spiel in der Firebase-Datenbank anlegen
  var gamesRef = database.ref("games");
  var newGameRef = gamesRef.push();      // neuer Eintrag unter "games"
  var gameId = newGameRef.key;           // eindeutige ID des neuen Spiels
  // Initialen Spielzustand definieren
  var initialData = {
    board: {
      0: "", 1: "", 2: "",
      3: "", 4: "", 5: "",
      6: "", 7: "", 8: ""
    },
    turn: "X",
    winner: "",
    players: 1
  };
  // Initialen Zustand in der DB speichern
  newGameRef.set(initialData, function(error) {
    if (error) {
      console.error("Fehler beim Erstellen des Online-Spiels:", error);
    } else {
      gameRef = newGameRef;
      gameActive = true;
      // Listener für Änderungen im Spielzustand setzen
      gameRef.on("value", onGameUpdate);
      // Link zum Teilen anzeigen und auf den zweiten Spieler warten
      var shareLink = window.location.origin + window.location.pathname + "?game=" + gameId;
      statusText.innerHTML = "Link zum Teilen: <span style='color: yellow;'>" + shareLink +
                             "</span><br>Warte auf zweiten Spieler...";
    }
  });
}

// Funktion: Tritt einem bestehenden Online-Spiel als zweiter Spieler bei
function joinOnlineGame(gameId) {
  gameMode = "online";
  isHost = false;
  mySymbol = "O";  // Beitretender Spieler spielt O
  // Referenz auf das bestehende Spiel holen
  gameRef = database.ref("games/" + gameId);
  gameRef.once("value", function(snapshot) {
    var data = snapshot.val();
    if (data === null) {
      // Spiel existiert nicht (falscher Link)
      statusText.textContent = "Ungültiger Spiel-Link.";
      gameActive = false;
      return;
    }
    if (data.players >= 2) {
      // Es sind bereits zwei Spieler verbunden
      statusText.textContent = "Das Spiel ist bereits voll.";
      gameActive = false;
      return;
    }
    // Spiel beitreten ist möglich
    gameActive = true;
    // Listener für Spiel-Updates setzen
    gameRef.on("value", onGameUpdate);
    // In der Datenbank die Spieleranzahl auf 2 erhöhen (signalisiert Host den Beitritt)
    gameRef.update({ players: 2 });
    // Statusanzeige: Verbindung hergestellt, X beginnt
    statusText.textContent = "Verbunden. Du spielst O. X beginnt.";
  });
}

// Callback-Funktion: Wird aufgerufen, wenn sich im Online-Spiel Daten ändern
function onGameUpdate(snapshot) {
  var data = snapshot.val();
  if (!data) return;  // falls Spiel gelöscht wurde, nichts tun
  // Zustand aus der Datenbank laden
  board = data.board;
  currentTurnOnline = data.turn;
  var winner = data.winner;
  var players = data.players;
  // Spielfeld-UI aktualisieren
  for (var i = 0; i < 9; i++) {
    var cellValue = board[i];
    cells[i].textContent = cellValue;
  }
  // Gewinner/Unentschieden prüfen
  if (winner && winner !== "") {
    gameActive = false;
    if (winner === "X" || winner === "O") {
      statusText.textContent = winner + " hat gewonnen!";
    } else if (winner === "draw") {
      statusText.textContent = "Unentschieden!";
    }
    return;
  }
  // Auf zweiten Spieler warten oder Spielstatus anzeigen
  if (players < 2) {
    if (isHost) {
      // Host wartet auf einen zweiten Spieler
      statusText.innerHTML = "Link zum Teilen: <span style='color: yellow;'>" +
                             window.location.origin + window.location.pathname + "?game=" + snapshot.key +
                             "</span><br>Warte auf zweiten Spieler...";
    } else {
      // Beitretender Spieler (kurzzeitig) in Warteposition
      statusText.textContent = "Verbinde zum Spiel...";
    }
    return;
  }
  // Wenn 2 Spieler verbunden und noch kein Gewinner: aktuellen Zug anzeigen
  gameActive = true;
  if (currentTurnOnline === mySymbol) {
    // Spieler ist selbst am Zug
    statusText.textContent = "Du spielst " + mySymbol + ". Du bist am Zug.";
  } else {
    // Der andere Spieler ist am Zug
    var opponent = (mySymbol === "X") ? "O" : "X";
    statusText.textContent = "Du spielst " + mySymbol + ". Warte auf Zug von " + opponent + ".";
  }
}

// Event-Handler: Klick auf eine Zelle des Spielfelds
function handleCellClick(event) {
  var cellIndex = parseInt(event.target.getAttribute("data-index"));
  // Keine Aktion, wenn Spiel nicht aktiv oder Feld bereits belegt ist
  if (!gameActive || board[cellIndex] !== "") {
    return;
  }

  if (gameMode === "local") {
    // Lokaler 2-Spieler-Zug
    board[cellIndex] = currentPlayer;
    event.target.textContent = currentPlayer;
    // Prüfen, ob aktueller Spieler gewonnen hat oder Unentschieden
    var result = checkWinner(board);
    if (result) {
      gameActive = false;
      if (result === "X" || result === "O") {
        statusText.textContent = result + " hat gewonnen!";
      } else if (result === "draw") {
        statusText.textContent = "Unentschieden!";
      }
    } else {
      // Spieler wechseln
      currentPlayer = (currentPlayer === "X") ? "O" : "X";
      statusText.textContent = currentPlayer + " ist am Zug.";
    }
  }
  else if (gameMode === "bot") {
    // Spieler (X) macht einen Zug
    if (currentPlayer !== "X") {
      return; // sollte nicht vorkommen, da X (der Mensch) immer an der Reihe ist
    }
    board[cellIndex] = "X";
    event.target.textContent = "X";
    var result = checkWinner(board);
    if (result) {
      gameActive = false;
      if (result === "X") {
        statusText.textContent = "Du hast gewonnen!";
      } else if (result === "O") {
        statusText.textContent = "Computer hat gewonnen!";
      } else if (result === "draw") {
        statusText.textContent = "Unentschieden!";
      }
      return;
    }
    // Kein Gewinner: nun ist der Bot (O) an der Reihe
    currentPlayer = "O";
    statusText.textContent = "Computer ist am Zug...";
    // Bot-Zug mit kurzem Verzögerung simulieren
    botTimeout = setTimeout(function() {
      // Einfache Bot-Logik: zufälliges freies Feld wählen
      var emptyCells = [];
      for (var i = 0; i < board.length; i++) {
        if (board[i] === "") {
          emptyCells.push(i);
        }
      }
      var randIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      board[randIndex] = "O";
      cells[randIndex].textContent = "O";
      // Ergebnis nach Bot-Zug prüfen
      var botResult = checkWinner(board);
      if (botResult) {
        gameActive = false;
        if (botResult === "O") {
          statusText.textContent = "Computer hat gewonnen!";
        } else if (botResult === "X") {
          statusText.textContent = "Du hast gewonnen!";
        } else if (botResult === "draw") {
          statusText.textContent = "Unentschieden!";
        }
      } else {
        // Kein Ende: Spieler X ist wieder am Zug
        currentPlayer = "X";
        statusText.textContent = "Du bist am Zug.";
      }
      botTimeout = null;
    }, 500);
  }
  else if (gameMode === "online") {
    // Online-Zug: nur möglich, wenn dieser Client gerade am Zug ist
    if (!mySymbol || currentTurnOnline !== mySymbol) {
      return;
    }
    // Setze eigenen Zug auf dem Brett (lokal)
    board[cellIndex] = mySymbol;
    event.target.textContent = mySymbol;
    // Bestimme nächsten Zug (wechsel zum anderen Symbol)
    var nextTurn = (mySymbol === "X") ? "O" : "X";
    // Prüfen, ob durch diesen Zug das Spiel endet
    var result = checkWinner(board);
    var winnerVal = "";
    if (result) {
      if (result === "X" || result === "O") {
        winnerVal = result;
      } else if (result === "draw") {
        winnerVal = "draw";
      }
    }
    // Update-Objekt für die Datenbank zusammenstellen
    var updates = {};
    updates["board/" + cellIndex] = mySymbol;
    updates["turn"] = nextTurn;
    if (winnerVal) {
      updates["winner"] = winnerVal;
    }
    // Änderungen in die Firebase-Datenbank schreiben (wird an beide Spieler übertragen)
    gameRef.update(updates);
    // Wenn ein Sieger/Unentschieden festgestellt wurde, Spiel lokal als beendet markieren
    if (winnerVal) {
      gameActive = false;
    }
  }
}

// Hilfsfunktion: prüft das Board auf Gewinner oder Unentschieden
function checkWinner(boardState) {
  // Alle Gewinnkombinationen (Index-Muster für 3 in einer Reihe)
  var winPatterns = [
    [0, 1, 2],  // obere Reihe
    [3, 4, 5],  // mittlere Reihe
    [6, 7, 8],  // untere Reihe
    [0, 3, 6],  // linke Spalte
    [1, 4, 7],  // mittlere Spalte
    [2, 5, 8],  // rechte Spalte
    [0, 4, 8],  // Diagonale (links oben nach rechts unten)
    [2, 4, 6]   // Diagonale (rechts oben nach links unten)
  ];
  // Prüfe alle Muster
  for (var i = 0; i < winPatterns.length; i++) {
    var a = winPatterns[i][0];
    var b = winPatterns[i][1];
    var c = winPatterns[i][2];
    if (boardState[a] !== "" && boardState[a] === boardState[b] && boardState[b] === boardState[c]) {
      return boardState[a];  // "X" oder "O" zurückgeben, wer gewonnen hat
    }
  }
  // Prüfe auf Unentschieden (kein leeres Feld mehr vorhanden)
  var emptyFound = false;
  for (var j = 0; j < 9; j++) {
    if (boardState[j] === "") {
      emptyFound = true;
      break;
    }
  }
  if (!emptyFound) {
    return "draw";
  }
  // Kein Gewinner und noch nicht voll -> kein Endergebnis
  return null;
  }