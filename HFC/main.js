const { app, BrowserWindow } = require('electron');
const expressServer = require('./express-server');
const exportRoute = require('./server/routes/export');

app.whenReady().then(() => {
    const expressApp = expressServer.startExpressServer();
    expressApp.use('/export', exportRoute);

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