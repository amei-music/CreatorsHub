/*!
 * entry point for running as electron package
 */

'use strict';

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

// serverを実行
var server = require('./server');

var mainWindow = null;
app.on('ready', function() {
  // ブラウザウィンドウを作成
  mainWindow = new BrowserWindow({width: 800, height: 600});

  // 設定画面をロード
  mainWindow.loadURL('http://localhost:16080');

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    mainWindow = null;
    app.quit();
  });
});
