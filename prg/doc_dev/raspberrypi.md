# Raspberry Pi MIDI/OSC/WebSocketアダプタ使用方法

1. dhcpが効いているLANに有線接続し、電源を入れる。
2. 1,2分経ったら、bonjourが効いているマシンからブラウザで http://raspberrypi.local:16080/ にアクセスする。
   このページでコネクションの設定をすることになる。

USB-MIDIデバイスは接続したら認識されるようになっている。
OSCクライアントはWeb設定画面から「送りたいホストのIPアドレス」と「そのホストで受けたいポート番号」を与えれば、通信可能になる。
WebSocketクライアントは、Web設定画面のindex.htmlを見て同様のJavaScriptを書けば接続できる。

メインスクリプトserver.jsはRaspberry Pi本体では/home/pi/workspace/fm_mw1というパスに設置してある。

# 開発方法
## プログラムの取得と動かし方
1.  node本体をインストールする。nodebrewを使ったりソースから直接ビルドしたり。
    詳しくはWebで最新情報を検索すればOK。
2.  このソースを適当な場所にgit cloneする。

    ```
    cd /path/to/your/working/dir
    git clone {this repository URL}
    ```

3.  そのままこのディレクトリで依存パッケージのインストール

    ```
    npm install
    ```

4.  サーバー側起点であるserver.jsをnodeで実行

    ```
    node server.js
    ```

    このとき、下記のようなメッセージがconsoleに出ていれば正常起動している。
    http://localhost:16080/ にブラウザからアクセスすればコネクション画面が出る。

    ```
    ================================================
    listening web socket on port 16080
    connection control at http://localhost:16080/
    ================================================
    ```


5.  ブラウザでserver.jsを実行したマシンのport 16080にアクセスする。
    localhostならhttp://127.0.0.1:16080/にアクセスする。

## Raspberry Pi 2 Bでのセットアップ方法
1. OSにRaspbianを選択して通常インストール。この時点ではUSBキーボードやディスプレイがほぼ必須。
2. インストールができたら良く使うものをapt-getしておく。

    ```
    sudo apt-get install openssh-server avahi-daemon vim libasound2 libasound2-dev
    ```

   この時点でavahi(bonjour)が動いているマシンからはssh pi@raspberrypi.localにパスワードraspberryでログインできる。
   マシン名を変えたければ適宜/etc/hostsを編集すること。
3. 必要に応じてネットワーク設定をする。詳しくは後述。
4. nodeをインストール。20151004現在ではソースからビルドする方が簡単だと思われる。
   [こちらの記事を参考にインストール](http://blog.shibayan.jp/entry/20150219/1424353913)
5. 上記「使用方法」に従ってセットアップ
6. nodeプログラムを自動起動 & エラー後自動復帰するように設定する。nodeライブラリであるforeverを使う。
   foreverはマシン全体で使えるようにnpmでglobalにインストールする。forever自体の使い方は適宜検索すること。

   ```
   sudo npm install -g forever
   ```

   次に、/etc/rc.localの「exit 0」の前に以下の一行を加える。これでforeverが起動時にstartされ、その後永続するようになる。
   ```
   sudo -u pi /usr/local/bin/forever start -p /var/run/forever \
   --pidfile /var/run/node-app.pid -l /path/to/your/working/dir/forever.log -a \
   -d /path/to/your/working/dir/server.js
   ```

   sudo -u piとすればpiユーザーで実行される(=安全だがwell known portは使えない)。sudoだけならrootで実行される。
   後者の場合は後から自分でforever list/stop/stopall/restartする際にもsudoする必要があるので注意。
   つまりforeverはユーザー毎に別の空間で動作する。

## raspberry Pi 2 Bでのネットワーク設定
sshで設定可能だが、sshするためにネットワーク接続が必要なので注意。
有線をdhcpとし, 無線を複数のSSIDを優先順位付きで捕捉するようなケースでは2つのファイルを以下のように記述する。

-   /etc/network/interfaces

    ```
    auto lo
    iface lo inet loopback

    ###############################################################################
    auto eth0
    allow-hotplug eth0
    iface eth0 inet dhcp

    ###############################################################################
    auto wlan0
    allow-hotplug wlan0

    # first set wlan to manual and load ssid/password information
    iface wlan0 inet manual
    wpa-roam /etc/wpa_supplicant/wpa_supplicant.conf

    # then set default connection to use dhcp
    iface wlan0 inet dhcp
    ```

-   /etc/wpa_supplicant/wpa_supplicant.conf (2つの無線AP設定を書いた例)

    ```
    ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
    update_config=1

    network={
            id_str="azure3"
            ssid="azure3"
            psk=d6b32967280b18709b7190a1ea618a751f4f7869827ed9ffdc86abe8908e83bf
            priority=2
    }

    network={
            id_str="azure2"
            ssid="azure2"
            psk=f3595cabf9709c3187399184ae43bb63b9392e8458fd2875200fcc59e4c0c895
            priority=1
    }
    ```

この無線設定のpsk文字列は暗号化済みであり、wpa_passphraseというコマンドで生成できる。
また、priorityの数字は高い方が優先される。
なお、この状態でLANケーブルとUSB無線アダプタを両方接続するとどうやら有線LAN側しか有効にならない模様。同時に有効にはできない？
