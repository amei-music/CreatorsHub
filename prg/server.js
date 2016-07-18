/****************************************************************************
Copyright (c) 2015-2016 Yamaha Corporation

  license: MIT (see LICENSE file included in the distribution)

****************************************************************************/

/*!
 * entry point for running as node.js script
 */

//==============================================================================
// command line parse
//==============================================================================
var yargs       = require('yargs');
var argv = yargs
    .help   ('h').alias('h', 'help')
    .boolean('t').alias('t', 'test'   ).default('t', false)
    .boolean('v').alias('v', 'verbose').default('v', false)
    // .options('x', {alias : 'xxxx', default : ""})
    .argv;

// set verbose
//var verboseLog = argv.verbose ? console.log : function(){}

// set cpu usage
var usage       = require('usage');
if(argv.test){
  setInterval(function (){
    usage.lookup(process.pid, function(err, result) {
      console.log('[USAGE] cpu: ' + result.cpu + ', memory: ' + result.memory);
    });
  }, 1000);
}

//==============================================================================
// start server
//==============================================================================
var serverHost = require('./serverHost');
var g_server   = serverHost.create();

// 初期化
g_server.appendModule('./client_modules/clientJson');
g_server.appendModule('./client_modules/clientOsc');
g_server.appendModule('./client_modules/clientMidi');
g_server.appendModule('./client_modules/clientRtpMidi');
g_server.appendModule('./client_modules/clientAnalyzer');

// append Creators'Hub modules in directory defined as 'CREATORS_HUB_MODULES'
var chub_module_dir = process.env['CREATORS_HUB_MODULES'];
if(chub_module_dir){
  g_server.appendModulesInDir(chub_module_dir);
}

g_server.init();

//==============================================================================
// test code
//==============================================================================
exports.test_modules = test_modules;
function test_modules(obj){
    return g_server.test_modules(obj);
}

//==============================================================================
// graceful shutdown
//==============================================================================

function graceful_shutdown(){
  process.exit();
}

// 例外
process.on('uncaughtException', function(err) {
    console.log(err.stack);
    graceful_shutdown();
});

// windowsのctrl-c
if (process.platform === "win32") {
  var rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", function () {
    console.log("Caught interrupt signal");
    graceful_shutdown();
  });
}

// それ以外のctrl-c
process.on("SIGINT", function () {
  //graceful shutdown
  console.log("Caught interrupt signal");
  graceful_shutdown();
});
