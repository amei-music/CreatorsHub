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
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    // http://electron.atom.io/docs/faq/#i-can-not-use-jqueryrequirejsmeteorangularjs-in-electron
    // [I can not use jQuery/RequireJS/Meteor/AngularJS in Electron.]
    // Due to the Node.js integration of Electron, there are some extra symbols inserted into the DOM like module, exports, require. This causes problems for some libraries since they want to insert the symbols with the same names.
    // To solve this, you can turn off node integration in Electron:
    webPreferences: {
      nodeIntegration: false
    }
  });

  // 設定画面をロード
  mainWindow.loadURL('http://localhost:16080');

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    mainWindow = null;
    app.quit();
  });
});
