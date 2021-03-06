var util = require("util"),
    path = require("path"),
    fs   = require("fs"),
    sc   = require("./simple-cache");

module.exports = {

  id: "local", 

  publish: function(options, publisher, cb) {
    sc.getItems([
      "feather-options",
      "feather-logger"
    ], function(err, cacheItems) {
      var appOptions = cacheItems["feather-options"],
        logger = cacheItems["feather-logger"],
        publishDir = path.join(appOptions.publicRoot, options.config.publishLocation),
        publishPath = path.join(publishDir, publisher.id),
        baseUrl = options.config.publishLocation,
        condolidatedContent = publisher.concat();

      if (baseUrl[0] !== "/") baseUrl = "/" + baseUrl;

      var publishResult = {
        files: [],
        consolidatedUrl: path.join(baseUrl, publisher.id)
      };
      
      for (var p in publisher.components) {
        publishResult.files.push({url: publisher.components[p].url});
      }

      path.exists(publishDir, function(exists) {
        if (exists) {
          fs.stat(publishDir, function(err, stats) {
            if (err) cb(err); else {
              if (stats.isDirectory()) {
                fs.writeFile(publishPath, condolidatedContent, "utf-8", function(err) {
                  cb(err, publishResult);
                });
              } else {
                cb(publishDir + " exists, but is not a directory");
              }
            }
          });
        } else {
          fs.mkdir(publishDir, 0755, function(err) {
            if (!err || err.code === 'EEXIST') { // Someone else may have created it before we tried.
              fs.writeFile(publishPath, condolidatedContent, "utf-8", function(err) {
                cb(err, publishResult);
              });
            } else {
              logger.error("Could not create " + publishDir + ".  err is " + util.inspect(err) );
              cb(publishDir + " does not exist and couldn't be created: " + err);
            }
          });
        }
      });
    });
  }
};