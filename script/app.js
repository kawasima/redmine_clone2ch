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

var observe = io.of('/observe').on('connection', function (socket) {
    var userId = socket.handshake.query["userId"];
    redmine.getUser(userId, function(u) {
	for (var i=0; i < user.projects.length; i++) {
	    socket.join(user.projects[i]);
	}
	socket.on('disconnect', function() {
	    for (var i=0; i<user.projects; i++) {
		socket.leave(user.projects[i]);
	    }
	});
    });
});

var users = {};
var bbs = io.of('/bbs').on('connection', function (socket) {
    var userId = socket.handshake.query["userId"];
    var projectId = socket.handshake.query["projectId"];

    var user = null;
    redmine.getUser(userId, function(u) {
	user = u;
	socket.join(projectId);
	if (!users[projectId]) {
	    console.log("--- initialize users")
	    users[projectId] = [];
	}

	// TODO multiple connection
	users[projectId].push(u);

	socket.broadcast.to(projectId).emit('join', user);
	socket.to(projectId).emit('connected');
    });

    socket.on('list users', function () {
	socket.to(projectId).emit('list users', users[projectId]);
    });

    socket.on('threadlist', function (data) {
	Thread.find({projectId: projectId}, null, { sort: { lastmodified: -1 }}, function (err,threads) {
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

	    socket.broadcast.to(projectId).emit('update post', msg);
	    // TODO inefficient
	    socket.to(projectId).emit('update post', msg);
	});
    };

    var threadUpdateFunc = function(th) {
        th.lastmodified = new Date().getTime();
	th.save();

	var query = Thread.find({})
	    .where("projectId", th.projectId)
	    .sort("-lastmodified");

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
	    .sort("-lastmodified");
	query.exec(function (err, threads) {
	    console.log(threads);
	    socket.broadcast.to(projectId).emit('threadlist', threads);
	    socket.to(projectId).emit('threadlist', threads);
	});

	postFunc(msg);
    });

    socket.on('postlist', function (data) {
	Thread.findById(data.threadId, function (err, th) {
	    Post.find({threadId: th._id}, null, {sort: {seq: 1}}, function (err, posts) {
	        socket.emit('postlist', {thread: th, posts: posts});
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

    socket.on('react', function(data) {
	Post.find({threadId: data.threadId, seq: data.seq}, function(err, posts) {
	    if (posts.length != 1) return;

	    var post = posts[0];
	    var reaction = {
		userId: user.id,
		reactionId: data.reactionId,
		reactedAt: Date.now()
	    };
	    post.reactions.push(reaction);
	    post.save(function (err) {
		socket.broadcast.to(projectId).emit('react', post)
		socket.to(projectId).emit('react', post)
	    });
	});
    });

    socket.on('call user', function (data) {
	socket.broadcast.to(projectId).emit('call user', data);
    });

    socket.on('start writing', function (data) {
	socket.broadcast.to(projectId).emit('start writing', { user: user, threadId: data.threadId });
    });

    socket.on('stop writing', function (data) {
	socket.broadcast.to(projectId).emit('stop writing', { user: user, threadId: data.threadId });
    });

    socket.on('disconnect', function() {
	if (users[projectId]) {
	    var ary = [];
	    for (var i=0; i<users[projectId].lentgh; i++) {
	        if (users[projectId][i].id != user.id)
		    ary.push(users[projectId][i]);
	    };
	    users[projectId] = ary;
	}
	socket.broadcast.to(projectId).emit('leave', user);
	socket.leave(projectId);
    });
});
