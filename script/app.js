var app = require('express').createServer(),
    io = require('socket.io').listen(app),
    uuid = require('node-uuid'),
    mongoose = require('mongoose');

app.listen(2525);

var ObjectId = mongoose.Schema.ObjectId;

var PostsSchema = new mongoose.Schema({
	seq: Number,
	username: String,
	message: String,
	postedAt: Date,
	threadId: String
    });

var ThreadsSchema = new mongoose.Schema({
	name: String,
	projectId: Number,
	lastmodified: Number,
    });

var Thread = mongoose.model('Thread', ThreadsSchema);
var Post   = mongoose.model('Post',   PostsSchema);

mongoose.connect('mongodb://localhost/threads');

io.sockets.on('connection', function (socket) {
	console.log('connected');
	socket.on('threadlist', function (data) {
		Thread.find({projectId: data.projectId}, function (err,threads) {
			socket.emit('threadlist', threads);
		});
	});

	var postFunc = function (msg) {
		msg.postedAt = new Date();
		Post.count({threadId: msg.threadId}, function (err, cnt) {
			msg.seq = cnt + 1;
			if (!msg.username) msg.username = '名無しさん';

			var post = new Post(msg);
			post.save();

			socket.broadcast.emit('update post', msg);
			socket.emit('update post', msg);
		});
	};

	var threadUpdateFunc = function(th, lastmodified) {
	    th.lastmodified = lastmodified
	    th.save();

	    var query = Thread.find({})
		.where("projectId", th.projectId)
		.desc("lastmodified");

	    query.exec(function (err, threads) {
	        socket.broadcast.emit('threadlist', threads);
	        socket.emit('threadlist', threads);
	    });
	};

	socket.on('create thread', function(th) {
	  th.lastmodified = new Date().getTime();
	  var msg = th.post;
	  delete th["post"];

	  var thread = new Thread(th);
	  thread.save();
	  msg.threadId = thread._id;

	  var query = Thread.find({})
		.where("projectId", th.projectId)
		.desc("lastmodified");
	  query.exec(function (err, threads) {
	        socket.broadcast.emit('threadlist', threads);
	        socket.emit('threadlist', threads);
	  });

	  postFunc(msg);
  });

  socket.on('postlist', function (data) {
	Thread.findById(data.threadId, function (err, th) {
	    Post.find({threadId: th._id}, function (err, msgs) {
	        socket.emit('postlist', {thread: th, posts: msgs});
	    }); 
        });
  });

  socket.on('post', function(data) {
	  Thread.findById(data.threadId, function (err, th) {
	      data.post.threadId = th._id;
	      postFunc(data.post);
	      threadUpdateFunc(th);
          });
  });

  socket.on('disconnect', function() {
    console.log('disconnected');
  });
});
