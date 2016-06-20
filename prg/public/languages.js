"use strict";

var currentLanguage = window.navigator.language || window.navigator.userLanguage || window.navigator.browserLanguage;

function showLanguage(lang) {
  var languages = ["ja", "en"];
  for(var i in languages){
      var elm = document.getElementsByClassName(languages[i]);
      var h = (lang === languages[i]) ? false : true;
      for(var j = 0; j < elm.length; j++){
        elm[j].hidden = h;
      }
  }
}

function selectLanguage() {
   if(currentLanguage == "ja" || currentLanguage == "ja-JP"){
     showLanguage("ja");
   }else{
     showLanguage("en");
   }
}