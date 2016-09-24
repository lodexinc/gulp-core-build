var fs = require('fs');
var path = require('path');
var Batch = require('batch');

var file_cache = {};

function getMaxTimeStamp(dir, cb, concurrency) {
  if (!dir || !cb) throw new Error('stat(dir, cb[, concurrency])');

  fs.readdir(dir, function(err, files) {
    if (err) return cb(err);
    if (!files) return cb(new Error('Got null files array from fs.readdir'));

    var batch = new Batch();
    batch.concurrency(concurrency || 10);

    var maxModifiedTime = 0;

    files.forEach(function(file) {
      batch.push(function(done) {

        var filename = path.join(dir, file);
        // console.log(filename);

        const nodeModulesMatch = filename.match(/node_modules/g);
        const microsoftMatch = filename.match(/node_modules[\/\\](?:@ms|@microsoft)/g);

        if (nodeModulesMatch) {
          if (nodeModulesMatch.length > 1) {
            done();
            return;
          }
          if ((file != 'node_modules') && (!microsoftMatch)) {
            done();
            return;
          }
        }

        fs.stat(filename, (err, stats) => {

          if (!(filename in file_cache)) {
            file_cache[filename] = stats.mtime;
            // console.log(filename); // + ': ' + stats.mtime);
          } else {
            throw 'err: ' + filename;
          }

          // console.log(stats.mtime > maxModifiedTime);
          if (stats.mtime > maxModifiedTime) {
            maxModifiedTime = stats.mtime;
          }

          if (stats.isDirectory()) {
            getMaxTimeStamp(filename, (time) => {
              if (time > maxModifiedTime) {
                maxModifiedTime = time;
              }
              done();
            });
          } else {
            done();
          }
        });
      });
    });

    batch.end(function(err, stats) {
      cb(maxModifiedTime);
    });
  });
}

module.exports = getMaxTimeStamp;

var start = new Date();
getMaxTimeStamp(process.cwd(), (maxDate) => {
  end = new Date();
  console.log('Took ' + (end - start) / 1000 + ' seconds');
  console.log(maxDate);
});