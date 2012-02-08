jQuery.noConflict();
// レスのアンカーを作る

var reactions = [
    { id: "GM",   label: "( ノﾟДﾟ)", title: "オハヨウ", display:"" },
    { id: "THX",  label: "(´▽｀)", title: "アリガト", display:"" },
    { id: "SRY",  label: "(m´・ω・｀)m", title: "ゴメン", display:"" },
    { id: "BYE",  label: "( ´Д｀)ﾉ~", title: "バイバイ", display:"" },
    { id: "BR",   label: "( ｀・ω・´)ﾉ", title: "ヨロシク", display:"" },
    { id: "GJ",   label: "(・∀・)", title: "イイネ", display:"" },
    { id: "BAD",  label: "(・A・)", title: "イクナイ", display:"" },
    { id: "OK",   label: "(｀･ω･´)ゞ", title: "ラジャー", display:"" },
    { id: "NG",   label: "(´・д・｀)", title: "ヤダ", display:"" },
    { id: "HERE", label: "(ﾟдﾟ)/", title: "ハイ", display:"" },
    { id: "OMG",  label: "ヽ(`Д´)ﾉ", title: "ウワァァン", display:"" },
    { id: "LOL",  label: "((´∀｀))", title: "wwww", display:"" }
];

var users = { };

jQuery(document).ready(function($) {
    Handlebars.registerHelper('renderMessage', function(txt) {
	txt = txt.replace(/>>(\d+)/g, function(s, id) {
	    return $("<div/>").append($("<a/>").text(s).attr("href", "#post-" + id)).html();
	});
	return new Handlebars.SafeString(txt);
    });

    Handlebars.registerHelper('renderGravatar', function(userId) {
	if (!users[userId]) { return "" }
	var email = users[userId].mail;
	var digest = Crypto.util.bytesToHex(Crypto.MD5(email.toLowerCase(), { asBytes: true}));
	var gravatarTag = '<img src="https://secure.gravatar.com/avatar/' + digest + '?s=20&d=wavatar"/>';
	return new Handlebars.SafeString(gravatarTag);
    });

    Handlebars.registerHelper('renderReaction', function(reactionId) {
	for (var i=0; i<reactions.length; i++) {
	    if (reactions[i].id == reactionId) {
		return reactions[i].label + reactions[i].title;
	    }
	}
	return "";
    });

    Handlebars.registerHelper('renderUsername', function (userId) {
	if (!users[userId]) { return "名無しさん" }
	return users[userId].login;
    });

    Handlebars.registerHelper('renderDate', function (date) {
        var d = null;
	if (typeof(date) == 'string') {
  	    d = new Date(date);
	} else if (typeof(date) == 'number') {
	    d = new Date(); d.setTime(date);
	}
	return I18n.strftime(d, "%Y/%m/%d(%a) %-H:%M:%S");
    });

    var projectId = $("#projectId").val();
    var userId = $("#userId").val();

    var socket = io.connect('http://' + location.hostname + ':2525/bbs?projectId=' + projectId + '&userId=' + userId);
    var threadTemplate = Handlebars.compile($("#thread-template").html());
    var postTemplate = Handlebars.compile($("#post-template").html());
    var reactionBtnTemplate = Handlebars.compile($("#reaction-btn-template").html());
    var userTemplate = Handlebars.compile($("#user-template").html());

    var currentThreadId = null;

    socket.on('connected', function () {
	$(".contextual span.label").addClass("label-success").text("connected");
	$.ajax({
	    url: "clone2ch/users.json",
	    success: function(data) {
		$.each(data.users, function(i, user) {
		    users[user.id] = user;
		});
		socket.emit('list users');
		socket.emit('threadlist', {});
		if (location.hash) {
		    var tid = location.hash.substring("#".length);
		    currentThreadId = tid;
		    socket.emit('postlist', {threadId: tid});
		}
	    }
	});
    });

    socket.on('disconnect', function () {
	$(".contextual span.label").removeClass("label-success").text("disconnected");
    });

    socket.on('postlist', function(data) {
	$("#thread-view").show();
	$("#thread-name").text(data.thread.name);
	$("#plist").empty().append(postTemplate({posts: data.posts}));
    });
    socket.on('threadlist', function(tlist) {
	$("#tlist").empty();
	$.each(tlist, function(i) {
	    $("#tlist").append(threadTemplate(this));
	    $("#th-" + this._id)
	      .bind("click", function() {
		var id = $(this).attr("id");
		var tid = id.substring(3);
		location.hash = tid;
		currentThreadId = tid;
		socket.emit('postlist', {threadId: tid});
		return false;
	      });
	});
    });

    socket.on('update post', function(msg) {
	if (currentThreadId == msg.threadId) {
	    $("#plist").append(postTemplate({posts: [msg]}));
	}
	if (userId != msg.userId) {
	    $.gritter.add({
		title: Handlebars.helpers["renderUsername"](msg.userId),
		text: msg.message,
		sticky: false});
	}
    });

    socket.on('react', function (msg) {
	$("#plist dt#post-" + msg.seq + " + dd").remove();
	$("#plist dt#post-" + msg.seq).replaceWith(postTemplate({ posts: [msg] }));
    });

    socket.on("list users", function (userList) {
	$("#user-list").empty();
	$(userList).each(function(i, user) {
	    $("#user-list").append(userTemplate(user));
	    $("#user-list li#user-" + user.id).data("login", user.login);
	});
    });

    socket.on("join", function (user) {
	$("#user-list").append(userTemplate(user));
	$("#user-list li#user-" + user.id).data("login", user.login);
	$.gritter.add({
	    title: 'ログイン',
	    text: user.login + 'が接続しました',
	    sticky: false});
    });

    socket.on("leave", function (user) {
	$("#user-list li#user-" + user.id).remove();
    });

    socket.on("call user", function (data) {
	var caller = users[data.caller];
	var name = (caller) ? caller.login : "誰かさん";
	if (data.callee == userId && window.confirm(name + "が呼んでいます")) {
	    socket.emit('reply calling', data)
	}
    })
    socket.on("reply calling", function(u) {
	
    });

    // Calling directly
    $("#user-list li.user-icon").live("click", function() {
	if (window.confirm($(this).data("login") + "を呼び出します")) {
	    var callee = $(this).attr("id").substring("user-".length);
	    socket.emit('call user', {caller: userId, callee: callee});
	}
    });

    $("#thread-form").submit(function(e) {
	var f = $(this);
	socket.emit('create thread', {
	    name: $(":input[name=name]", f).val(),
	    post: {
		message:  $(":input[name=message]", f).val()
	    }
	});
	return false;
    });

    $("#post-form").submit(function(e) {
	var f = $(this);
	socket.emit('post', {
	    threadId: currentThreadId,
	    post: {
		username: $(":input[name=username]", f).val(),
		message:  $(":input[name=message]", f).val()
	    }
	});
	return false;
    });

    $("#post-form :input[name=message]")
	.focus(function () {
	    socket.emit('writing now', {username: $(":input[name=username]").val() });
	})
	.blur(function () {
	    socket.emit('writing stop', {username: $(":input[name=username]").val() });
	});

    $.each(reactions, function (i, reaction) {
	$("ul.dropdown-menu").append(reactionBtnTemplate(reaction));
    });
    $("ul.dropdown-menu").hide();

    $("#plist dt.post a.dropdown-toggle").live("click", function () {
	var $this = $(this);
	$("ul.dropdown-menu")
	    .show()
	    .css({top: $this.position().top+20, left: $this.position().left})
	    .data("seq", $(this).parents("dt.post").attr("id").substring(5));
	return false;
    });

    $("ul.dropdown-menu a").click(function() {
	$("ul.dropdown-menu").hide();
	var seq = $("ul.dropdown-menu").data("seq");
	var reactionId = $(this).attr("id").substring("reaction-".length);
	socket.emit('react', { threadId: currentThreadId, seq: seq, reactionId: reactionId});
	return false;
    });

    $("#thread-view").hide();
});
