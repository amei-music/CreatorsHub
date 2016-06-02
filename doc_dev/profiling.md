# usageを使ったCPU負荷について  
そのプロセスの負荷表示だけだと、Node上のスクリプト実行が重いのか他が重いのか分からない  

# node単体でのプロファイリング  
## 準備  
node-tick-prosessor のインストール  

```
sudo npm install -g tick  
```

## プロファイリング  
```
node —prof server.js  
```

→ v8.log が作成される  
※ VSCODEから実行する場合は launch.json の runtimeArgs に “—prof” を追加  

## ログを読む  
node-tick-prosessor を実行 → v8.log が集計された結果が出力される  

- コンパイルされたコードの負荷が正しく表示されていないように見える（？）  
- ログをグラフィカルに表示するツールなどもあるようだがそちらは未確認  


# VisualStudio Communityを使ったプロファイリング  

## 準備  
VisualStudio CommunityでNode.jsツールをインストール。
詳細は[リンク先](https://www.visualstudio.com/ja-jp/features/node-js-vs.aspx)参照。

## 使い方
1. VisualStudio で Node.js プロジェクトを作成。
   新しいプロジェクト→テンプレート→JavaScript→Node.js→From existing Node.js code  
   fm_mw1ディレクトリの内容をプロジェクトに登録。
   startup file は server.js とする。  
   この時点でVisualStudio上でのデバッグ実行が可能になるはず。

2. 分析→Launch Node.js profiling を実行。
   Open project で Start  
   server.jsが起動するので、負荷を与えてみる。
   Node.js performance の stop profiling で停止。
   測定結果が表示される。

### メリット
グラフィカルに処理の重い箇所が表示され、そこからソースを直接編集実行できる。
コンパイルされたコードの負荷も表示されている（ように見える）。

### デメリット
Windows上、VisualStudio上でしか使えない。
実行に必須なモジュールがWindowsに対応していない場合は使えない。
