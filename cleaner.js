var fs = require('fs-extra');
var asar = require('asar');

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
                fs.removeSync(src, function (err) {
                    // if (err) {
                    //     return console.error('Error! removing ' + src + ' ' + err);
                    // }
                    // console.log('Success! removing ' + src);
                });
            })
        });
    });