/**
 * Archive Creators'Hub executable with docs and examples.
 */

var fs = require('fs');
var archiver = require('archiver');

var package_name = "CreatorsHub-darwin-x64";
var output_file = __dirname + "/CreatorsHub.zip";

// input files
var input_files = [
    {
        expand:true,
        cwd: __dirname + "/../prg/" + package_name,
        src:["**/*"],
        dest: "/",
        dot:true
    },
    {
        expand:true,
        cwd: __dirname + "/../",
        src:["README.md"],
        dest: "/",
        dot:true
    },
    {
        expand:true,
        cwd: __dirname + "/../doc/",
        src:["**/*"],
        dest: "/doc/",
        dot:true
    },
    {
        expand:true,
        cwd: __dirname + "/../example/",
        src:["**/*"],
        dest: "/example/",
        dot:true
    }
];

// create zip
var output = fs.createWriteStream(output_file);
var zip = archiver.create('zip', {});
zip.pipe(output);

// append input files
zip.bulk(input_files);

// on close
output.on("close", function(){
    var archive_size = zip.pointer() + " total bytes";
    console.log(output_file + " created: " + zip.pointer() + " bytes");
});

// finalize zip
zip.finalize();
