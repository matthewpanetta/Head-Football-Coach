const { app, BrowserWindow } = require('electron');
const expressServer = require('./server');

app.whenReady().then(() => {
    expressServer.startExpressServer();

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        autoHideMenuBar: true,
        useContentSize: true,
        resizable: true
    });

    mainWindow.loadURL('http://localhost:5515');
    mainWindow.focus();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
});