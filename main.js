const { app, Tray, Menu, BrowserWindow, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');



let tray = null;
let intervalTimer = null;
let pauseInterval = null;
let workTime = 60 * 55; // Haupttimer: 5 Sekunden
let pauseTime = 60 * 5; // Pausentimer: 5 Sekunden

let smallWindows = []; // Array für kleine Fenster
let largeWindows = []; // Array für große Fenster

const intervalFilePath = path.join(app.getPath('userData'), 'timer-config.json');

function saveInterval(interval) {
    fs.writeFileSync(intervalFilePath, JSON.stringify({ interval }), 'utf-8');
}

function loadInterval() {
    if (fs.existsSync(intervalFilePath)) {
        const data = JSON.parse(fs.readFileSync(intervalFilePath, 'utf-8'));
        console.log('Gespeichertes Intervall:', data.interval);
        return data.interval || 5; // Standardwert 5 Sekunden
    }
    return 5;
}

function promptForInterval(defaultValue) {
    return dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['OK'],
        defaultId: 0,
        cancelId: -1,
        title: 'Timer-Einstellung',
        message: `Bitte geben Sie die gewünschte Timer-Dauer ein (in Sekunden):`,
        detail: `Aktuelles Intervall: ${defaultValue} Sekunden`,
        input: true,
    });
}

function updateTrayMenu(currentInterval) {
    const contextMenu = Menu.buildFromTemplate([
        { label: `Timer: ${Math.floor(currentInterval / 60)} Minuten`, enabled: false },
        { label: 'Start Timer', click: startTimer },
        { label: 'Stop Timer', click: stopTimer },
        { label: 'Intervall ändern', click: changeInterval },
        { label: 'Quit', role: 'quit' },
    ]);
    tray.setContextMenu(contextMenu);
}

async function changeInterval() {
    try {
        const newInterval = await createInputWindow(workTime);
        if (!isNaN(newInterval) && newInterval > 0) {
            workTime = newInterval;
            saveInterval(workTime);
            updateTrayMenu(workTime);
            // reset timer
            stopTimer();
            startTimer();
        }
    } catch (error) {
        console.error('Intervalländerung abgebrochen:', error.message);
    }
}

function createInputWindow(defaultValue) {
    return new Promise((resolve, reject) => {
        const inputWindow = new BrowserWindow({
            width: 400,
            height: 250,
            frame: true,
            transparent: false,
            alwaysOnTop: true,
            resizable: false,
            modal: true,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'), // Verknüpfung mit preload.js
                contextIsolation: true,
                enableRemoteModule: false,
            },
        });

        inputWindow.loadURL(`data:text/html;charset=utf-8,
            <html>
                <head>
                    <title>Intervall eingeben</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                        }
                        input {
                            margin-top: 10px;
                            padding: 5px;
                            font-size: 16px;
                        }
                        button {
                            margin-top: 10px;
                            padding: 5px 10px;
                            font-size: 16px;
                            cursor: pointer;
                        }
                    </style>
                </head>
                <body>
                    <h1>Timer Intervall in Minutes (Pause is 5 Min)</h1>
                    <input type="number" id="interval" value="${defaultValue / 60}" min="1" />
                    <button onclick="submit()">OK</button>
                    <script>
                        function submit() {
                            const value = document.getElementById('interval').value;
                            window.electron.send('input-response', value);
                        }
                    </script>
                </body>
            </html>
        `);

        // Hauptprozess hört auf das Event
        const { ipcMain } = require('electron');
        ipcMain.once('input-response', (event, value) => {
            inputWindow.close();
            console.log('Eingabe:', value);

            resolve(parseInt(value, 10) * 60);
        });

        inputWindow.on('closed', () => reject(new Error('Eingabe abgebrochen')));
    });
}
/**
 * Erstellt kleine Fenster auf allen Bildschirmen.
 */
function createSmallWindows() {
    const displays = screen.getAllDisplays();
    smallWindows = displays.map((display, index) => {
        const { width } = display.workAreaSize;
        const { x, y } = display.bounds;

        const window = new BrowserWindow({
            width: 100,
            height: 50,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            resizable: false,
            x: x + width - 100, // Oben rechts des jeweiligen Bildschirms
            y,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        });

        window.loadFile('small.html').then(() => {
            console.log(`Kleine Ansicht auf Bildschirm ${index} geladen.`);
        }).catch((err) => {
            console.error(`Fehler beim Laden der kleinen Ansicht auf Bildschirm ${index}:`, err);
        });

        return window;
    });
}

/**
 * Erstellt große Fenster auf allen Bildschirmen.
 */
function createLargeWindows() {
    const displays = screen.getAllDisplays();
    largeWindows = displays.map((display, index) => {
        const { x, y, width, height } = display.bounds;

        const window = new BrowserWindow({
            x,
            y,
            width,
            height,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        });

        window.loadFile('large.html').then(() => {
            console.log(`Große Ansicht auf Bildschirm ${index} geladen.`);
            window.hide(); // Fenster initial verstecken
        }).catch((err) => {
            console.error(`Fehler beim Laden der großen Ansicht auf Bildschirm ${index}:`, err);
        });

        return window;
    });
}

/**
 * Startet den Haupttimer.
 */
function startTimer() {
    console.log('Haupttimer gestartet!');
    let remainingTime = workTime;

    // Zeigt alle kleinen Fenster an und sendet den Timer-Startwert
    smallWindows.forEach((window) => {
        window.show();
        window.webContents.send('update-timer', remainingTime);
    });

    intervalTimer = setInterval(() => {
        remainingTime--;
        console.log(`Haupttimer: ${remainingTime} Sekunden verbleiben.`);

        if (remainingTime > 0) {
            // Aktualisiere alle kleinen Fenster
            smallWindows.forEach((window) => {

                window.webContents.send('update-timer', remainingTime);
            });
        } else {
            clearInterval(intervalTimer); // Haupttimer stoppen
            console.log('Haupttimer abgelaufen! Große Ansicht anzeigen.');
            showLargeWindows(); // Große Fenster anzeigen
        }
    }, 1000); // Aktualisierung jede Sekunde
}

/**
 * Zeigt die großen Fenster auf allen Bildschirmen an.
 */
function showLargeWindows() {
    console.log('Große Fenster werden angezeigt.');

    // Verstecke alle kleinen Fenster
    smallWindows.forEach((window) => window.hide());

    // Zeige alle großen Fenster und starte den Pausentimer
    largeWindows.forEach((window) => window.show());
    startPauseTimer();
}

/**
 * Startet den Pausentimer.
 */
function startPauseTimer() {
    console.log('Pausentimer gestartet!');
    let currentPauseTime = pauseTime;

    largeWindows.forEach((window) => {
        window.webContents.send('update-timer', currentPauseTime);
    });

    pauseInterval = setInterval(() => {
        currentPauseTime--;
        console.log(`Pausentimer: ${currentPauseTime} Sekunden verbleiben.`);

        // Aktualisiere alle großen Fenster
        largeWindows.forEach((window) => {
            console.log('Update-Timer');
            window.webContents.send('update-timer', currentPauseTime);
        });

        if (currentPauseTime <= 0) {
            clearInterval(pauseInterval); // Pausentimer stoppen
            console.log('Pausentimer abgelaufen! Große Fenster verstecken.');
            hideLargeWindows(); // Große Fenster verstecken
            startTimer(); // Haupttimer erneut starten
        }
    }, 1000);
}

/**
 * Versteckt alle großen Fenster.
 */
function hideLargeWindows() {
    largeWindows.forEach((window) => window.hide());
    console.log('Alle großen Fenster versteckt.');
}

/**
 * Stoppt alle laufenden Timer.
 */
function stopTimer() {
    if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
        console.log('Haupttimer gestoppt!');
    }

    if (pauseInterval) {
        clearInterval(pauseInterval);
        pauseInterval = null;
        console.log('Pausentimer gestoppt!');
    }
}

/**
 * App-Initialisierung.
 */
app.whenReady().then(() => {
    console.log('App gestartet.');

    // tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'));
    // const contextMenu = Menu.buildFromTemplate([
    //     { label: 'Stop Timer', click: stopTimer },
    //     { label: 'Quit', role: 'quit' },
    // ]);
    try {
        tray = new Tray(path.join(__dirname, 'assets', 'timerTemplate.png'));
        console.log('Tray erfolgreich erstellt.');
    } catch (error) {
        console.error('Fehler beim Erstellen des Tray:', error);
    }
    tray.setToolTip('Interval Timer');

    workTime = loadInterval(); // Lade gespeichertes Intervall
    updateTrayMenu(workTime);

    createSmallWindows(); // Erstelle kleine Fenster
    createLargeWindows(); // Erstelle große Fenster

    startTimer(); // Haupttimer direkt starten
});

/**
 * Verhindert das vollständige Schließen der App, wenn alle Fenster geschlossen sind.
 */
app.on('window-all-closed', (e) => {
    e.preventDefault();
});