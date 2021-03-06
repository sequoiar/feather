var fs = require("fs"),
    Semaphore = require("./semaphore"),
    cache = require("./simple-cache");

//TODO: refactor the directory sniffing and file watching to be based on: http://github.com/mikeal/watch
exports.index = function(options, callback) {
  cache.getItems([
    "feather-logger"
  ], function(err, cacheItems) {
    if (err) cb(err); else {
      var logger = cacheItems["feather-logger"],
        indexedFiles = {
          appFiles: {},
          featherFiles: {},
          widgetClientFiles: {},
          cssFiles: {},
          templateFiles: {},
          appDirectories: {}
        },
        topSem = new Semaphore(function() {
          callback(null, indexedFiles);
        }),
        _readdir = function(path, _cb) {
          fs.readdir(path, function(err, files) {
            if (err) callback(err); else {
              _cb(path, files);
              topSem.execute();
            }
          });
        };

      logger.info({message:"Indexing Files", category:"feather.srvr"});

      topSem.increment();
      _readdir(options.publicRoot, function cb(path, files) {
        var dirs = [];
        var localSem = new Semaphore(function() {
          //all stats at this level have completed, "recurse" as needed (not true recursion as the "tail" call is actually async)
          dirs.forEach(function(dir) {
            _readdir(path + "/" + dir, cb);
          });
        });
        files.forEach(function(file) {
          var filePath = path + "/" + file;
          var fObj = {};
          indexedFiles.appFiles[filePath] = fObj;

          if (file.match(/\.feather\.html$/)) {
            indexedFiles.featherFiles[filePath] = fObj;
          } else if (file.match(/\.client\.js$/)) {
            indexedFiles.widgetClientFiles[filePath] = fObj;
          } else if (file.match(/\.css$/)) {
            indexedFiles.cssFiles[filePath] = fObj;
          } else if (file.match(/\.template\.html$/)) {
            indexedFiles.templateFiles[filePath] = fObj;
            var templateData = fs.readFileSync(filePath, "utf8");
            //parse for id="" attributes and add the "${id}_" tokens
            //note: regex looks a bit more complex due to the need to exclude <widget> tags from this process
            templateData = templateData.replace(/<(([^w\/\s]|w[^i\s]|wi[^d\s]|wid[^g\s]|widg[^e\s]|widge[^t\s])*)\s([^>]*id=['"])([^'"\$]*)(['"][^>]*)>/g, "<$1 $3${id}_$4$5>");
            fObj.data = templateData;
          }
          //need to stat it
          topSem.increment();
          localSem.increment();
          fs.stat(filePath, function(err, stats) {
            if (err) {
              logger.error({message: err, category: "feather.indexer"});
            }
            if (stats) {
              fObj.stats = stats;
              if (stats.isDirectory()) {
                dirs.push(file);
                topSem.increment();
                fObj.isDirectory = true;
                indexedFiles.appDirectories[filePath] = fObj;
              }
            }
            localSem.execute();
            topSem.execute();
          });
        });
      });
    }
  });
  
};