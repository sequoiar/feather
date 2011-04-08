jojo.ns("blog");

blog.latestposts = jojo.widget.create({
  name: "blog.latestposts",
  path: "widgets/latestposts/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
    },
    getPosts: function(cb) {
      var me = this;
      var posts = [];
      jojo.blog.api.getPosts(function(err, dbResult) {
        if (!err) {
          dbResult.forEach(function(key, doc, id) {
            posts.push(doc); // id, key, value { pub_date, summary, post }
          });
          cb({posts: posts});
        } else {
          cb({error: err.reason});
        }
      });
    }
  } // end prototype
});
