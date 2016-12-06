import {app, BrowserWindow} from 'electron';

let mainWindow = null;

app.on('window-all-closed', () => {
    app.quit();
});

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 880,
        height: 660,
        minHeight: 640,
        minWidth: 870,
        titleBarStyle: 'hidden-inset'
    });

    mainWindow.loadURL(`file://${__dirname}/renderer/index.html`);
    //mainWindow.webContents.openDevTools();
});
