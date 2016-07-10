"use strict";

function showMarkdown(url) {
	var httpObj = new XMLHttpRequest();
	httpObj.open("get", url, true);
	httpObj.onload = function(){
		var html = marked(this.responseText); 
		var title = url.substring(url.lastIndexOf('/') + 1);  
		openWindow(title, html);
	}
	httpObj.send(null);
}

function showSourceCode(url) {
	var httpObj = new XMLHttpRequest();
	httpObj.open("get", url, true);
	httpObj.onload = function(){
 		var html = marked("```\n" + this.responseText + "```\n"); 
		var title = url.substring(url.lastIndexOf('/') + 1);  
    	openWindow(title, html);
	}
	httpObj.send(null);
}

function openWindow(title, html) {
	var titileHeight = "43px";

	var wnd = document.createElement("div");
	wnd.style.position = "fixed";
	wnd.style.overflow = "none";
	wnd.style.top = "0%";
	wnd.style.left = "0%";
	wnd.style.width = "100%";
	wnd.style.height = "100%";
	wnd.style.background = "#fff";
	wnd.style.zIndex = 1000;
	document.body.appendChild(wnd);

	// タイトル
    var	label = document.createElement("div");
	label.className = "titleText";
    label.style.position = "absolute";
	label.style.left = "0%";
	label.style.top = "0%";
	label.style.height = titileHeight;
	label.style.lineHeight = titileHeight;
	label.style.width = "100%";
	label.style.fontSize = "100%";
	label.style.verticalAlign = "middle";
	label.style.background = "#2ea879"
	label.innerHTML = "　<font color=#fff>" + title + "</font>";
 	wnd.appendChild(label);

	// ×ボタン
	var iconClose = document.createElement("img");
	iconClose.src = "/img/icon_close.png";
	iconClose.style.position = "absolute";
	iconClose.style.right = "1%";
	iconClose.style.top = "0px";
	iconClose.style.height = titileHeight;
	iconClose.addEventListener("click", function(e){
		e.stopPropagation();
		document.body.removeChild(wnd);
	});
	wnd.appendChild(iconClose);

	// HTMLテキスト
	var txt = document.createElement("div");
	txt.style.position = "absolute";
	txt.style.overflow = "auto";
	txt.style.top = titileHeight;
	txt.style.bottom = "0%";
	txt.style.left = "1%";
	txt.style.right = "0%";
	txt.style.background = "#fff";
	txt.innerHTML = html;
	wnd.appendChild(txt);
}
