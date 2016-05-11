//==============================================================================
// メッセージ分析クライアントモジュール
//==============================================================================
var client_io = require('./client_io');

module.exports = {
  type: "analyzer",
  createInput: function(name){},
  createOutput: function(name){},
  
  init: function(hostAPI){
    var name = "Analyzer";
    var output = client_io(module.exports.type, name);
    output.oscAnalyzer = new OscAnalyzer();
    output.sendMessage = function(msg){
        this.oscAnalyzer.analyze(msg, function(obj){
            hostAPI.sendWebAppMessage("message_analyzer", {name: obj.name, output: obj});                
        });
    }.bind(output);
    var outputId = hostAPI.addOutput(output);
    console.log("Analyzer Output [" + name + "] (client id=" + outputId + ").");
  }
}

//==============================================================================
// 分析処理
//==============================================================================

var fft         = require('fft-js').fft;
var fftUtil     = require('fft-js').util;

function OscAnalyzer(){
    //var sampleRate = 32; // Hz
    //var sampleDuration = 2000; // ms
    var analyzePeriod = 200; // ms

    //--------------------------------    
    var EventBuffer = function(name, rate, duration){
        // イベント名
        this.name = name;

        // イベントバッファ
        this.events = [];
        this.lastEventTime = 0;

        // FFT用
        this.fftSize =  Math.pow(2, Math.ceil(Math.log(rate * duration / 1000) / Math.log(2)));
        this.signal = new Array(this.fftSize);
        this.magnitudes = new Array(this.fftSize);

        // サンプルレートとサンプル時間
        this.sampleRate = rate;
        this.sampleDuration = this.fftSize * 1000 / rate; 

        // ピーク分析結果
        this.peak = -1;
        this.freq = 0;
        
        this.lastAnalyzeTime = 0;
    };
    // イベント追加
    EventBuffer.prototype.addEvent = function(val){
        var t = Date.now();
        this.events.push([t, val]);
        this.lastEventTime = t;
        
        // 最大値と最小値
        if(this.valMin === undefined || this.valMin > val){
            this.valMin = val;
        }
        if(this.valMax === undefined || this.valMax < val){
            this.valMax = val;
        }
    };
    // 古いイベントを除外
    EventBuffer.prototype.removeOldEvent = function(){
        var tOrigin = this.lastEventTime - this.sampleDuration;
        for(var j = 0; j < this.events.length; j++){
            if(this.events[j][0] > tOrigin){
                if(j > 0){
                    this.events.splice(0, j);
                }
                break;
            }
        }
    };
    // FFT準備
    EventBuffer.prototype.prepareFFTSignal0 = function(){
        for(var j = 0; j < this.signal.length; j++){
            this.signal[j] = 0;
        }
        for(var j = 0; j < this.events.length; j++){
            var dt = this.lastEventTime - this.events[j][0];
            var p = this.fftSize - 1 - Math.floor(dt * this.fftSize / this.sampleDuration);
            this.signal[p] = this.events[j][1];
        }
    };
    // （連続値）
    EventBuffer.prototype.prepareFFTSignal1 = function(){
        for(var j = 0; j < this.signal.length; j++){
            this.signal[j] = 0;
        }
        if(this.events.length){
            var p0 = 0;
            var val0 = this.events[0][1];
            for(var j = 0; j < this.events.length; j++){
                var dt = this.lastEventTime - this.events[j][0];
                var p = this.fftSize - 1 - Math.floor(dt * this.fftSize / this.sampleDuration);
                val0 = this.events[j][1];
                while(p0 <= p){
                    this.signal[p0++] = val0;
                }
                this.signal[p] = val0;
            }
            while(p0 < this.signal.length){
                this.signal[p0++] = val0;
            }
        }
    }
    // FFT
    EventBuffer.prototype.FFT = function(){
        // FFT
        var phasors = fft(this.signal);
        
        // Magnitude取得
        var mag = fftUtil.fftMag(phasors);
        var magMax = 0;

        // 傾きを持たせる（入力でフィルタかけるべき）
        for(var j = 0; j < mag.length; j++){
            mag[j] *= 1 - j / mag.length;
        }
        if(true){
            // 表示しやすいように
            mag[0] = 0;
            // 整数化
            for(var j = 0; j < mag.length; j++){
                mag[j] = Math.round(mag[j]);
                if(magMax < mag[j]){
                    magMax = mag[j];
                }
            }
            //console.log(magnitudes);
        }
        this.magMin = 0;
        this.magMax = magMax;
        this.magnitudes = mag;
    };
    // ピーク取得
    EventBuffer.prototype.peakFreq = function(){
        var mag = this.magnitudes;
        var max = 0;
        var newpeak = 0;
        for(var j = 1; j < mag.length-1; j++){
            var a = mag[j-1] + mag[j] + mag[j+1];
            if(mag[j] > max){
                max = mag[j];
                newpeak = j;
            }
        }
        if(this.peak != newpeak){
            this.peak = newpeak;
            this.freq = newpeak * this.sampleRate / this.fftSize;
            console.log("analysis:" + this.name, this.freq + "[Hz]", max);
        }
    }
    //--------------------------------    
    EventBuffer.prototype.calcSD = function(){
        var  sd = {
            sx: 0,
            sy: 0,
            sxy: 0,
            sx2: 0,
            sy2: 0,
            A: 0, // 回帰式の定数
            B: 0, // 回帰式の回帰係数
            r: 0, // 相関係数
            A_: 0, // 回帰式の定数(x,y逆)
            B_: 0, // 回帰式の回帰係数(x,y逆)
            n: 0
        };
        if(this.events.length){
            for(var i = 0; i < this.events.length; i++){
                var x = this.events[i][0];
                var y = this.events[i][1];
                var w = 1; // 重み付け
                //w += i;
                
                sd.sx += w * x;
                sd.sy += w * y;
                sd.sxy += w * x * y;
                sd.sx2 += w * x * x;
                sd.sy2 += w * y * y;
                sd.n += w;
            }
            
            //
            var xy = sd.n * sd.sxy - sd.sx * sd.sy;
            var xx = sd.n * sd.sx2 - sd.sx * sd.sx;
            var yy = sd.n * sd.sy2 - sd.sy * sd.sy;
            if(sd.n > 1 && xx != 0 && yy != 0){
                sd.B = xy / xx;
                sd.A = (sd.sy - sd.B * sd.sx) / sd.n;
                sd.r = xy / Math.sqrt(Math.abs(xx) * Math.abs(yy));
                
                sd.B_ = xy / yy;
                sd.A_ = (sd.sx - sd.B_ * sd.sy) / sd.n;
            }
        }
        this.sd = sd;
    }
    //--------------------------------    
    EventBuffer.prototype.calcHistogram = function(){
        var numClass = 16;
        var histogram = Array(numClass);

        for(var i = 0; i < numClass; i++){
            histogram[i] = 0;
        }

        var valWidth = this.valMax - this.valMin;      
        if(this.events.length && valWidth > 0){
            // ヒストグラム
            for(var i = 0; i < this.events.length; i++){
                var val = this.events[i][1];
                var p = Math.min(Math.floor((val - this.valMin) * numClass / valWidth), numClass - 1);
                histogram[p]++;
                // 前後のカウントも上げておく
                if(p - 1 >= 0){
                    histogram[p - 1]++;
                }
                if(p + 1 < numClass){
                    histogram[p + 1]++;
                }
            }
            
            // 正規化
            var max = 0;
            for(var i = 0; i < numClass; i++){
                if(max < histogram[i]){
                    max = histogram[i];
                }
            }
            for(var i = 0; i < numClass; i++){
                histogram[i] /= max;
            }
        }
        this.histogram = histogram;
    }
    EventBuffer.prototype.clustering = function(){
        var clusters = [];
        if(this.histogram){
            // しきい値L以上で最大値がしきい値Hを超える範囲を求める
            var threshold_h = 0.5; // しきい値 H
            var threshold_l = 0.25; // しきい値 L
            var cluster_begin = undefined;
            var cluster_end = undefined;
            var valid_cluster = false;
            for(var i = 0; i <= this.histogram.length; i++){
                var count = i < this.histogram.length ? this.histogram[i] : 0;
                if(cluster_begin === undefined){
                    if(count >= threshold_l){
                        cluster_begin = i;
                        cluster_end = i;
                    }
                }
                if(cluster_begin !== undefined){
                    if(count >= threshold_h){
                        valid_cluster = true;
                    }
                    if(count >= threshold_l){
                        cluster_end = i;
                    }else{
                        if(valid_cluster){
                            clusters.push([cluster_begin, cluster_end]);
                            valid_cluster = false;
                        }
                        cluster_begin = undefined;
                    }
                }
            }
        }
        this.clusters = clusters;
    }
   
    //--------------------------------    
    var MsgBuffer = function(msg){
        this.msgEvent = new EventBuffer(msg.address, 32, 2000);
        this.paramEvent = [];
        for(var i = 0; i < msg.args.length; i++){
            this.paramEvent[i] = new EventBuffer(msg.address + "/" + i, 16, 5000);
        }
        console.log("MsgBuffer:" + msg.address + " with " + msg.args.length + " params.");
    }
 
    //--------------------------------    
    var analyzer = {
        analysysBuffer: {},
        
        analyze: function(msg, callback){
            var msgBuf = analyzer.analysysBuffer[msg.address];
            if(! msgBuf){
                //msg.addressがなければ新規作成
                msgBuf = new MsgBuffer(msg);
                analyzer.analysysBuffer[msg.address] = msgBuf;
            }
            if(msgBuf){
                function doAnalyze(obj, val){
                    obj.addEvent(val === undefined ? 1 : val);
                    // 最小間隔以上の時間が経過していれば分析処理
                    // (タイマ使った方がいいが暫定)
                    if(obj.lastEventTime >= obj.lastAnalyzeTime + analyzePeriod){
                        obj.lastAnalyzeTime = obj.lastEventTime;
                        // 古いデータを除外
                        obj.removeOldEvent();
                        // FFT準備
                        if(val === undefined){
                            // メッセージの頻度を分析
                            obj.prepareFFTSignal0();
                        }else{
                            // パラメータの値を分析
                            obj.prepareFFTSignal1();
                            obj.calcSD();
                            obj.calcHistogram();
                            obj.clustering();
                        }
                        // FFT
                        obj.FFT();
                        // ピーク検出
                        obj.peakFreq();
                        // 送信
                        if(callback){
                            callback(obj);
                        }
                    }                        
                };
                
                if(msg.args.length){ // パラメータのあるものだけを分析
                    // メッセージの頻度を分析
                    doAnalyze(msgBuf.msgEvent, undefined);
                    for(var i = 0; i < msg.args.length; i++){
                        // パラメータの値を分析
                        doAnalyze(msgBuf.paramEvent[i], msg.args[i]);
                    }
                }
            }                
        }
    };
    return(analyzer);
}
