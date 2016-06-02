# MIDI鍵盤からブラウザで音を鳴らす
1. サーバーを立ち上げる

 ```
node server.js
 ```

2. ブラウザにlocalhost:16080を入力しハブの接続画面を開く

3. MIDI鍵盤をPCに繋げる。 ハブの設定画面にMIDI鍵盤が追加されたことを確認する。

4. example/sound/webAudioAPI/index.htmlを2と同じブラウザで開く。ハブの設定画面にjson>webaudioapi_testが追加されたことを確認する。

5. ハブの設定画面でMIDI鍵盤がIN、json>webaudioapi_testがOUTの項目をConnectにする

6. MIDI鍵盤を押すとweb上で音が鳴る
