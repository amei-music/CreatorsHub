# touchandswipe起動方法

```
npm install
node app.js
```

要node。以上でlocalhost:8090にサーバーが立ち上がる。ブラウザで接続し、グレーのcanvas領域をタップすることでnote onが発せられる。

![接続画面](./img/page.png)

# プログラム解説

## MW1への接続

join_as_wsjsonを送信する。パラメータとしてnameを送るとその名前でMW1上に出現する。MIDI音源に接続し、操作を行うと発音する。

```js
socket.emit('join_as_wsjson', {name: 'Touch Example'});
```

![接続画面](./img/mw1.png)

## MIDIメッセージの送信

join_as_wsjsonで接続したソケットを使用してmessage_jsonを送信する。パラメータとして以下の要領でMIDIライクなデータを送信する。

```js
var ch = 1;
var notenum = 60;
var velocity = 100;
var noteArg = [ch, notenum, velocity];
var msg = {address:'/midi/noteon', args: noteArg};

socket.emit('message_json', msg);
```

| MIDI | address | args |
|:-----------|:------------|:------------|
| Note On      | /midi/noteon | [channel, note number, velocity]     |
| Note Off    | /midi/noteoff | [channel, note number, velocity] |
| Control Change  | /midi/controlchange | [control number, value] |

※その他のメッセージについては後日追記します
