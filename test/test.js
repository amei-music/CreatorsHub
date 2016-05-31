var server = require("../server.js");
var assert = require("assert");

var test_json = [
		{
			address: "/fm/noteon",
			args: [0,60, 127]
		},
		{
			address: "/foo/bar",
			args: { a: "string", /*b: 3.14,*/ c: 1, d: true } // float値の精度に問題あり？
		}
	];
    
describe('server', function(){
    for(var i in test_json){
        describe('test_modules　' + test_json[i].address, function(){
            it('module I/O test ' + i, function(){
                var result = server.test_modules(test_json[i]);
                console.log(result);
            })
        })
    }
})