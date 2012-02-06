var io = require('socket.io').listen(2525);
var redmine = require('./redmine');
var mongoose = require('mongoose');

var SettingsSchema = new mongoose.Schema({
    userId: Number,
    watchThreads: [ String ],
    notificationTypes: [ String ]
});

var ReactionsSchema = new mongoose.Schema({
    userId: Number,
    reactionId: String,
    reactedAt: Date
});

var PostsSchema = new mongoose.Schema({
    seq: Number,
    userId: Number,
    message: String,
    postedAt: Date,
    threadId: String,
    reactions: [ ReactionsSchema ]
});

var ThreadsSchema = new mongoose.Schema({
    name: String,
    projectId: Number,
    lastmodified: Number
});

var Setting = mongoose.model('Setting', SettingsSchema);
var Reaction = mongoose.model('Reaction', ReactionsSchema);
var Post   = mongoose.model('Post',   PostsSchema);
var Thread = mongoose.model('Thread', ThreadsSchema);

mongoose.connect('mongodb://localhost/clone2ch');

var users = { };

var observe = io.of('/observe').on('connection', function (socket) {
    var userId = users[socket.handshake.query["userId"]];
    var user = redmine.getUser(userId);
    users[userId] = user;
    
    for (var i=0; i < user.projects.length; i++) {
	socket.join(user.projects[i]);
    }
    socket.on('disconnect', function() {
	for (var i=0; i<user.projects; i++) {
	    socket.leave(user.projects[i]);
	}
    });
});

var bbs = io.of('/bbs').on('connection', function (socket) {
    var userId = socket.handshake.query["userId"];
    var projectId = socket.handshake.query["projectId"];

    var user = null;
    redmine.getUser(userId, function(u) {
	user = u;
	users[user.id] = user;
	socket.join(projectId);
    });

    socket.on('threadlist', function (data) {
	Thread.find({projectId: projectId}, function (err,threads) {
	    socket.emit('threadlist', threads);
	});
    });

    var postFunc = function (msg) {
	msg.postedAt = new Date();
	Post.count({threadId: msg.threadId}, function (err, cnt) {
	    msg.seq = cnt + 1;
	    msg.userId = user.id;
	    
	    var post = new Post(msg);
	    post.save();

	    var postedUser = users[msg.userId];
	    msg.username = postedUser.login;
	    msg.mail = postedUser.mail;
		
	    socket.broadcast.to(projectId).emit('update post', msg);
	    // TODO inefficient
	    socket.to(projectId).emit('update post', msg);
	});
    };

    var threadUpdateFunc = function(th, lastmodified) {
	th.lastmodified = lastmodified
	th.save();
	
	var query = Thread.find({})
	    .where("projectId", th.projectId)
	    .desc("lastmodified");

	query.exec(function (err, threads) {
	    socket.broadcast.to(projectId).emit('threadlist', threads);
	    // TODO inefficient
	    socket.to(projectId).emit('threadlist', threads);
	});
    };

    socket.on('create thread', function(th) {
	th.lastmodified = new Date().getTime();
	th.projectId = projectId;
	var msg = th.post;
	delete th["post"];

	var thread = new Thread(th);
	thread.save();

	msg.threadId = thread._id;
	msg.userId = userId;
	
	var query = Thread.find({})
	    .where("projectId", projectId)
	    .desc("lastmodified");
	query.exec(function (err, threads) {
	    console.log(threads);
	    socket.broadcast.to(projectId).emit('threadlist', threads);
	    socket.to(projectId).emit('threadlist', threads);
	});

	postFunc(msg);
    });

    socket.on('postlist', function (data) {
	Thread.findById(data.threadId, function (err, th) {
	    Post.find({threadId: th._id}, function (err, posts) {
		var msgs = [ ];
		for (var i=0; i<posts.length; i++) {
		    var msg = posts[i].toObject();

		    var postedUser = users[msg.userId];
		    msgs.push(msg);
		    if (postedUser) {
			msg["username"] = postedUser.login;
			msg["mail"] = postedUser.mail;
		    } else {
			redmine.getUser(msg.userId, function (u) {
			    users[u.id] = u;
			});
		    }
		}
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
