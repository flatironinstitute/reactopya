const { app, BrowserWindow } = require('electron');
const path = require('path');
const shell = require('electron').shell;

let mainWindow;

(async () => {
    await app.whenReady();

    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: false,
            preload: __dirname + '/preload.js'
        }
    });

    //open links externally
    mainWindow.webContents.on('new-window', function(event, url){
        event.preventDefault();
        shell.openExternal(url);
    });

    await mainWindow.loadURL(`http://localhost:5050?widget=${process.env.widget}`);
})();