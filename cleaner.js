var fs = require('fs-extra');
var asar = require('asar');
var path = require('path');
var archiver = require('archiver');

var dist_dir = process.argv[2];

var app_dirs = [];

function cleanFile(path) {
    fs.truncate(path, 0);
}

function cleanDirectory(path) {
    fs.walk(path)
        .on('data', function (item) {
            if (item.stats.isFile()) {
                //console.log("Zeroing out file: " + item.path);
                cleanFile(item.path);
            }
        });
}

function removeAppDirectory(path) {
    fs.removeSync(path, function (err) {
        if (err) {
            return console.error('Error! removing ' + src + ' ' + err);
        }
        console.log('Success! removing ' + src);
    });
}

// function zipDists() {
//     fs.readdirSync(dist_dir).filter(function(file) {
//         var f = path.join(dist_dir, file);
//         var stats = fs.statSync(f);
//         if(stats.isDirectory()){
//             console.log('To be zipped ' + __dirname + '/'+f);
//             archiveDir(f);
//         }
//     });
// }
//
// function archiveDir(dir){
//     // create a file to stream archive data to.
//
//     var output = fs.createWriteStream(__dirname + '/'+dir+'.zip');
//     var archive = archiver('zip', {
//         store: true // Sets the compression method to STORE.
//     });
//
// // listen for all archive data to be written
//     output.on('close', function() {
//         console.log(archive.pointer() + ' total bytes');
//         console.log('archiver has been finalized and the output file descriptor has closed.');
//     });
//
// // good practice to catch this error explicitly
//     archive.on('error', function(err) {
//         console.log('Error archiving dist folder ' + err);
//     });
//
// // pipe archive data to the file
//     archive.pipe(output);
//
//     // append files from a directory
//     archive.directory(dir);
//
//
// // finalize the archive (ie we are done appending files but streams have to finish yet)
//     archive.finalize();
//
// }

fs.walk(dist_dir)
    .on('data', function (item) {
        if (item.stats.isDirectory() && item.path.toLowerCase().endsWith('resources/app/src')) {
            //console.log("Zeroing out files in this folder: " + item.path);
            cleanDirectory(item.path);
        }
        if (item.stats.isDirectory() && item.path.toLowerCase().endsWith('resources/app')) {
            app_dirs.push(item);
        }
    }).on('end', function () {
        app_dirs.forEach((item) => {
            var src = item.path;
            var dest = item.path+'.asar';

            asar.createPackage(src, dest, function() {
                removeAppDirectory(src);
            });
        });
        //zipDists();
    });