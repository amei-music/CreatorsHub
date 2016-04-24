"use strict";

// 4分音符に24回届くtimingメッセージを元に適当にテンポを推定する
var Timing = function(){
  return {
    running: false, // startを受けてtrue, stopを受けてfalse

    starttime: 0, // startを受けた時の時刻
    count:     0, // startからの累積カウント
    tempo:     0,

    onBeat: function(tempo){}, // 四分音符で何するか

    onStart : function(){
      this.running   = true;
      this.starttime = new Date().getTime();
    },

    onStop : function(){
      this.running = false;
      this.count   = 0;
    },

    onTiming : function(){
      if (this.count % 24 == 0) this.onBeat(this.tempo);
      if (this.count > 0){
        var elapsed = new Date().getTime() - this.starttime; // 再生中のテンポ変更はNG
        this.tempo   = 60. * 1000. / ((elapsed / this.count) * 24);
      }
      this.count += 1;
    },

    get : function(obj){
      if(obj.address == "/fm/start")  return this.onStart();
      if(obj.address == "/fm/timing") return this.onTiming();
      if(obj.address == "/fm/stop")   return this.onStop();
    }
  };
}

// デバイス名を作る
function makeNodeName(client){
  var name = client.type + "> ";
  if (client.type == "json"){
    if(client.name){
      name += client.name;
    }else{
      name += client.name + " socket[" + client.socketId + "]";
    }

  }
  if (client.type == "midi" || client.type == "vmidi" || client.type == "rtp" || client.type == "analyzer") name += client.name;
  if (client.type == "osc" ) name += client.host + ":" + client.port;
  return name
}

// 削除可能な入出力かどうか
function isClientRemovableIO(client){
  return client.type == "osc" || client.type == "vmidi"; // OSCと仮想MIDIは削除可能
}

// プレーンテキストで接続状態を表示する
function makeConnectionString(inputs, outputs, connections){
  var txt = "[network and connection information]<br>"
  for (var inputId in inputs){
    txt += "input _" + inputId + ", [" + makeNodeName(inputs[inputId]) + "]<br>"
  }

  for (var outputId in outputs){
    txt += "output_" + outputId + ", [" + makeNodeName(outputs[outputId]) + "]<br>"
  }

  for (var inputId in connections){
    for (var outputId in connection[inputId]){
      txt += "connection from input " + inputId + " => output " + outputId + "<br>"
    }
  }
  return txt;
}


// N個のdevice名を記した配列を受け取ってその接続マトリックスのhtmlを作る
function makeConnectionTable(obj, onChange, onRemoveOscInput, onRemoveOscOutput){
  //////////////////////////////
  // 表示用情報作成

  // 入力側の表示情報作成
  var inputNames  = {};
  var inputIdList = [];
  var isRemovableInputs  = {};
  for(var inputId  in obj.inputs ){
    inputNames[inputId] = makeNodeName(obj.inputs[inputId]);
    isRemovableInputs[inputId] = isClientRemovableIO(obj.inputs[inputId]);
    inputIdList.push(inputId);
  }
  // 出力側の表示情報作成
  var outputNames = {};
  var outputIdList = [];
  var isRemovableOutputs  = {};
  for(var outputId in obj.outputs){
    outputNames[outputId] = makeNodeName(obj.outputs[outputId]);
    isRemovableOutputs[outputId] = isClientRemovableIO(obj.outputs[outputId]);
    outputIdList.push(outputId);
  }
  // 入出力IDを名前順にソート
  inputIdList.sort(function(a, b){
    if(inputNames[a] < inputNames[b]) return -1;
    if(inputNames[a] > inputNames[b]) return 1;
    return 0;
  });
  outputIdList.sort(function(a, b){
    if(outputNames[a] < outputNames[b]) return -1;
    if(outputNames[a] > outputNames[b]) return 1;
    return 0;
  });
  // 接続状態
  var connections = obj.connections;

  //////////////////////////////
  // テーブル作成

  var table = document.createElement('table');
  // thead
  var thead = table.createTHead();
  // タイトル行
  for(var i = 0; i <= 1; i++){
    var tr = thead.insertRow(-1)
    var cell = document.createElement('th');
    tr.appendChild(cell);
    if(i == 0){
      cell.innerHTML = "OUT";
      cell.style.textAlign = "right";
    }else{
      cell.innerHTML = "IN";
      cell.style.textAlign = "left";
    }
    for(var o = 0; o < outputIdList.length; o++){
      var outputId = outputIdList[o];
      var cell = document.createElement('th');
      tr.appendChild(cell);
      if(i == 0){
        cell.innerHTML = outputNames[outputId];
        if(isRemovableOutputs[outputId]){
          var btnRemove = document.createElement("button");
          btnRemove.innerText = "削除";
          btnRemove.addEventListener('click', onRemoveOscOutput.bind(null, parseInt(outputId)));
          cell.appendChild(btnRemove);
        }
      }else{
        cell.innerHTML = "▲";
      }
      // エラー表示
      if(obj.outputs[outputId].error){
        if(i == 1){
            cell.innerHTML = "×";
        }
        cell.className = "error";
      }
    }
  }


  // tbody
  var tbody = table.createTBody();
  // データ行
  console.log("connections: ", JSON.stringify(connections));
  for(var i = 0; i < inputIdList.length; i++){
    var inputId = inputIdList[i];
    var tr = tbody.insertRow(-1);
    var cell = document.createElement('th');
    tr.appendChild(cell);
    cell.innerHTML = "▶ " + inputNames[inputId];
    if(isRemovableInputs[inputId]){
      var btnRemove = document.createElement("button");
      btnRemove.innerText = "削除";
      btnRemove.addEventListener('click', onRemoveOscInput.bind(null, parseInt(inputId)));
      cell.appendChild(btnRemove);
    }
    for(var o = 0; o < outputIdList.length; o++){
      var outputId = outputIdList[o];
      (function(inputId, outputId){ // capture variables
        var isNowConnected = (inputId in connections) && (outputId in connections[inputId]);

        // 接続/切断ボタンを作って追加
        var cell = document.createElement('td');
        if(isNowConnected){
          cell.className = "connected";
          cell.innerText = "Connected";
        }else{
          cell.className = "disconnected";
          cell.innerText = "-";
        }
        cell.addEventListener('click', function(){ onChange(inputId, outputId, (! isNowConnected)) } );
        tr.appendChild(cell);

      })(inputId, outputId);
    }
  }

  return table;
}


// 本体
var ctrl = {
  init: function(){
    // ソケットの初期化
    this.socket = io.connect(/*'http://localhost:8080'*/);
    this.socket.on("update_list",  this.onUpdateList.bind(this));
    this.socket.on("message_json", this.onMessageJson.bind(this));
    this.socket.on("message_analyzer", this.onMessageAnalyzer.bind(this));
    this.socket.on("disconnect",   this.onDisconnect.bind(this));

    // UIを初期化
    this.showJsonClient(false);

    // サブモジュールにハンドラを付ける
    this.timing.onBeat = function(tempo){
      document.getElementById("tempo").innerHTML = tempo;
    };
  },

  onUpdateList: function(obj){
    // htmlのtableでコネクションマトリックスを作る
    // マトリックス内のボタンクリックでサーバーに接続変更を指示する
    var table = makeConnectionTable(obj, this.add_connection.bind(this), this.close_input.bind(this), this.close_output.bind(this));
    var networkArea = document.getElementById("network");
    networkArea.textContent = null;
    networkArea.appendChild(table);
  },

  onMessageJson : function(obj){
    this.addMessage(obj);
    this.timing.get(obj);
  },

  onMessageAnalyzer : function(obj){
    //console.log(obj.name, obj.output.peak);
    var table = document.getElementById("analyzer");
    var tr = table.rows.namedItem(obj.name);

    // 新規行
    if(!tr){
      tr = table.insertRow(-1);
      tr.id = obj.name;

      var td = tr.insertCell(-1);
      td.innerText = obj.name;
      td.id = "name";

      var addGraph = function(id){
        td = tr.insertCell(-1);
        td.id = id;

        var canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 32;
        td.appendChild(canvas);
      };

      var addSVG = function(id){
        td = tr.insertCell(-1);
        td.id = id;

        //var svg = document.createElement("svg");
        //svg.style.width = 256;
        //svg.style.height = 32;
        //td.appendChild(svg);

        var div = document.createElement("div");
        td.appendChild(div);
      };

      addGraph("signal");
      addSVG("sig");
      //addSVG("sig2");
      addGraph("magnitudes");

      td = tr.insertCell(-1);
      td.id = "peak";
    }

    // 更新
    if(tr){
      var cells = tr.cells;

      var td = cells.namedItem("peak");
      if(td){
        td.innerText = "Peak=" + obj.output.freq + "Hz";
        if(obj.output.sd){
        //    td.innerText += ", A=" + obj.output.sd.A + ", B=" + obj.output.sd.B + ", r=" + obj.output.sd.r;
        }
      }

      // グラフ更新
      var updateGraph = function(id, val, min, max){
        // max, min
        /*
        var max = 1;
        for(var i = 0; i < val.length; i++){
          if(max < val[i]){
            max = val[i];
          }
        }
        */

        var range = max - min;
        if(range == 0){
          min = 0;
          range = 1;
        }

        // 描画
        td = cells.namedItem(id);
        var canvas = td.childNodes[0];
        var w = canvas.width;
        var h = canvas.height;

        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = "#2ea879"//#8f2";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, h);

        for(var i = 0; i < val.length; i++){
          var x = i * w / val.length;
          var y = h - (val[i] - min) * h / range;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      //-------------------------
      var svgWidth = 256;
      var svgHeight = 32;
      var svgRadius = 3;

      var getSVG = function(id){
        td = cells.namedItem(id);

        var div = td.childNodes[0];
        div.innerHTML = "";
        var svg = d3.select(div).append("svg")
        //var svg = d3.select(td.childNodes[0]);
        //svg.innerHTML = "";
        svg.attr({
          width: svgWidth,
          height: svgHeight
        });

        return(svg);
      };
      //-------------------------
      // 縦軸が値、横軸が時間
      var svgScaleX = d3.scale.linear()
                            .domain([obj.output.lastAnalyzeTime - obj.output.sampleDuration, obj.output.lastAnalyzeTime])
                            .range([svgRadius, svgWidth - svgRadius]);
      var svgScaleY = d3.scale.linear()
                            .domain([obj.output.valMin, obj.output.valMax])
                            .range([svgHeight - svgRadius, svgRadius]);
      var updateSVG = function(id, obj){
        var svg = getSVG(id);
        svg.style("background-color", "#fff0f0");

        var circles = svg.selectAll("circle")
         .data(obj.events)
         .enter()
         .append("circle");

         circles.attr("cx", function(d, i) {
             //return i * 4;
             return svgScaleX(d[0]);
         })
         .attr("cy", function(d, i) {
             //return i * 4;
             return svgScaleY(d[1]);
         })
         .attr("r", function(d) {
              return svgRadius;
         })
         .attr("fill","red");

         circles.transition().delay(500).duration(1000).attr("r", 1);
      };
      //-------------------------
      // 縦軸が時間、横軸が値
      var svg2ScaleX = d3.scale.linear()
                            .domain([obj.output.valMin, obj.output.valMax])
                            .range([svgRadius, svgWidth - svgRadius]);
      var svg2ScaleY = d3.scale.linear()
                            .domain([obj.output.lastAnalyzeTime - obj.output.sampleDuration, obj.output.lastAnalyzeTime])
                            .range([svgRadius, svgHeight - svgRadius]);
      var svg2ScaleR = d3.scale.linear()
                            .domain([obj.output.lastAnalyzeTime - obj.output.sampleDuration, obj.output.lastAnalyzeTime])
                            .range([1, svgRadius]);
      var updateSVG2 = function(id, obj){
        var svg = getSVG(id);
        svg.style("background-color", "#f8f8f8");

        // 分布
        if(obj.histogram){
          // クラスタ
          if(obj.clusters && obj.clusters.length > 1){
            svg.selectAll("rect")
              .data(obj.clusters)
              .enter()
              .append("rect")
              .attr("x", function(d){
                return d[0] * svgWidth / obj.histogram.length;
              })
              .attr("y", 0)
              .attr("width", function(d){
                return (d[1] - d[0] + 1) * svgWidth / obj.histogram.length;
              })
              .attr("height", svgHeight)
              .attr("fill", "#ffe0e0");

            // 数
            /*
            svg.selectAll("text")
              .data(obj.clusters)
              .enter()
              .append("text")
              .attr("x", function(d){
                return ((d[0] + d[1]) / 2 + 0.5) * svgWidth / obj.histogram.length;
              })
              .attr("y", 0)
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "hanging")
              .attr("fill", "#ff8080")
              .text(function(d,i){return i+1;});
            */
          }

          // 頻度
          var line = d3.svg.line()
            .x(function(d, i){
               return (i + 0.5) * svgWidth / obj.histogram.length;
            })
            .y(function(d){
               return svgHeight * (1 - d);
            })
          svg.append("path")
            .attr("d", line(obj.histogram))
            .attr("stroke", "#c0c0c0")
            .attr("fill", "none");
        }

        // 回帰直線
        /*
        var t1 = obj.lastAnalyzeTime - obj.sampleDuration;
        var t2 = obj.lastAnalyzeTime;
        var v1 = obj.sd.A + obj.sd.B * t1;
        var v2 = obj.sd.A + obj.sd.B * t2;
        */
        var v1 = obj.valMin;
        var v2 = obj.valMax;
        var t1 = obj.sd.A_ + obj.sd.B_ * v1;
        var t2 = obj.sd.A_ + obj.sd.B_ * v2;
        var width = 1;
        var alpha = Math.abs(obj.sd.r / 0.05);
        if(alpha > 1){
          width *= alpha;
        }

        svg.append("line")
          .attr("x1",svg2ScaleX(v1))
          .attr("x2",svg2ScaleX(v2))
          .attr("y1",svg2ScaleY(t1))
          .attr("y2",svg2ScaleY(t2))
          .attr("stroke-width",width)
          .attr("stroke","rgba(0,128,0,"+alpha+")");
        /*
        svg.append("text")
            .attr("x", 0)
            .attr("y", svg2ScaleY(t1))
            .attr("text-anchor", "start")
            .text(obj.sd.r);
            */

        // 散布
        var circles = svg.selectAll("circle")
         .data(obj.events)
         .enter()
         .append("circle");

         circles.attr("cx", function(d, i) {
             return svg2ScaleX(d[1]);
         })
         .attr("cy", function(d, i) {
             return svg2ScaleY(d[0]);
         })
         .attr("r", function(d) {
              return svg2ScaleR(d[0]);
         })
         .attr("fill","orange");

        // 最大最小値
        svg.append("text")
          .attr("x", 0)
          .attr("y", svgHeight)
          .attr("text-anchor", "start")
          .text(obj.valMin);

        svg.append("text")
          .attr("x", svgWidth)
          .attr("y", svgHeight)
          .attr("text-anchor", "end")
          .text(obj.valMax);
      };
      //-------------------------

      updateGraph("signal", obj.output.signal, obj.output.valMin, obj.output.valMax);
      updateGraph("magnitudes", obj.output.magnitudes, obj.output.magMin, obj.output.magMax);
      if(obj.output.sd){
        updateSVG2("sig", obj.output);
      }else{
        //updateSVG("sig", obj.output);
      }
      //updateSVG("mag", obj.output.magnitudes);
    }
  },

  onDisconnect : function(){
    this.showJsonClient(false);
  },

  add_connection : function(inputId, outputId, connect){
    var param = {inputId: inputId, outputId: outputId, connect: connect}
    console.log("add_connection: " + JSON.stringify(param));
    this.socket.emit("add_connection", param);
  },

  cleanup_connection_history : function(){
    this.socket.emit("cleanup_connection_history");
  },

  join_as_wsjson: function() {
    this.socket.emit("join_as_wsjson", { "name": "mw1"} );
    this.showJsonClient(true);
  },

  exit_wsjson: function() {
    this.socket.emit("exit_wsjson");
    this.showJsonClient(false);
  },

  open_new_osc_input: function() {
    this.socket.emit("open_new_osc_input");
  },

  open_new_osc_output: function() {
    var host = document.getElementById('osc_host');
    var port = document.getElementById('osc_port');
    this.socket.emit("open_new_osc_output", {host: host.value, port: port.value});
  },

  open_new_virtualmidi_input: function() {
    var name = document.getElementById('vmidi_in');
    this.socket.emit("open_new_virtualmidi_input", {name: name.value});
  },

  open_new_virtualmidi_output: function() {
    var name = document.getElementById('vmidi_out');
    this.socket.emit("open_new_virtualmidi_output", {name: name.value});
  },

  close_input: function(inputId) {
    var param = {inputId: inputId};
    console.log("close_input: " + JSON.stringify(param));
    this.socket.emit("close_input", param);
  },

  close_output: function(outputId) {
    var param = {outputId: outputId};
    console.log("close_output: " + JSON.stringify(param));
    this.socket.emit("close_output", param);
  },

  publishMessage: function(msg, callback) {
    var textInput = document.getElementById('msg_input');
    try{
      var obj = JSON.parse(textInput.value);
      this.socket.emit("message_json", obj);
      document.getElementById("errormsg").innerHTML = "";
    } catch(e){
      document.getElementById("errormsg").innerHTML = "json syntax error";
    }
  },

  // フィルターのon/offを切り替える
  filterSet : function(cbox){
    if (cbox.checked) this.filter[cbox.value] = true;
    else delete this.filter[cbox.value];

    console.log(cbox, cbox.checked, this.filter);
  },

  // jsonクライアントとして受けとったメッセージを追加する
  addMessage : function(obj){
    // console.log(obj.address, this.filter)
    if (! (obj.address in this.filter)){ // filter考慮
      var domMeg = document.createElement('div');
      // domMeg.innerHTML = new Date().toLocaleTimeString() + ' ' + msg;
      domMeg.innerHTML = JSON.stringify(obj);
      document.getElementById("msg").appendChild(domMeg)
    }
  },

  // jsonクライアントの表示/非表示を切り替える
  showJsonClient : function(onoff){
    document.getElementById("jsonclient").style.display = (onoff ? "block" : "none");
    document.getElementById("jsonclient_join").style.display = (onoff ? "none" : "block");
  },

  // members
  socket: undefined, // Web Socket クライアント
  filter: {},        // メッセージをフィルタする
  timing: Timing(),  // テンポ計算
}
