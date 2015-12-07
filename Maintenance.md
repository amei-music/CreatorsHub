このファイルではこのプログラムをRaspberry Pi2上で動作させる場合の動作チェックやメンテナンスの方法についての情報を示す。
Raspberry Piは[README.md](./README.md)にある方法でセットアップしてあると想定する。

# SDカードの複製方法
microSDカードを読めるWindowsがあれば、[Win32DiskImager](https://osdn.jp/projects/sfnet_win32diskimager/)というソフトを使って簡単にディスク全体の複製が作れる。
複製後のものは完全に前のSDカードに置き換えることができるので、バックアップにも便利。
吸い出したイメージの圧縮もできると思うが未確認。

# ssh 接続確認
[README.md](./README.md)にある方法でセットアップしたRaspberry Piは以下の状態になっているはずである。

- 有線LANに対してDHCPで接続する
- multicast DNSが効いている同一LAN内の別マシンからraspberrypi.localでアクセスできる
- piというユーザーアカウントがあり、パスワードが(初期設定のままであれば)raspberryとなっている

そこで、以下のような方法で接続確認が可能である。

- ```ping raspberrypi.local```
- ```ssh pi@raspberrypi.local``` : ログイン後に、```sudo shutdown -h now``` とすれば安全なシャットダウンも可能。

出先でLAN+DHCPサーバーを用意し、そこにRaspberry Piを有線接続させることは設備面でなかなか困難であるが、
[MacbookやWindowsPCをブリッジサーバー&DHCPサーバーにする](http://qiita.com/yasuraok/items/5753d91c10e1f0687373)方法があるので、それを用いて接続確認ができる。この方法であればEthernetケーブル(+ノートPC側にEthernet端子がなければそのアダプタ)だけでRaspberry Piと接続が可能。
