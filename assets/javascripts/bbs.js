// レスのアンカーを作る
Handlebars.registerHelper('renderMessage', function(txt) {
	txt = txt.replace(/>>(\d+)/g, function(s, id) {
		return $("<div/>").append($("<a/>").text(s).attr("href", "#post-" + id)).html();
	});
	return new Handlebars.SafeString(txt);
});

$(document).ready(function() {
	var socket = io.connect('http://localhost:2525');
	var postTemplate = Handlebars.compile($("#post-template").html());
	var currentThreadId = null;

	socket.on('postlist', function(data) {
		$("#thread-view").show();
		$("#thread-name").text(data.thread.name);
		$("#plist").empty().append(postTemplate({posts: data.posts}));
	});
	socket.on('threadlist', function(tlist) {
		$("#tlist").empty();
		$.each(tlist, function(i) {
			$("#tlist").append(
				$("<li/>")
					.addClass(i % 2 == 0 ? "even" : "odd")
					.text(this.name)
					.attr("id", "th-" + this._id)
					.bind("click", function() {
						var tid = $(this).attr("id").substring(3);
						currentThreadId = tid;
						socket.emit('postlist', {threadId: tid});
					})
			);
		});
	});

	socket.on('update post', function(msg) {
		$("#plist").append(postTemplate({posts: [msg]}));
	});

	$("#thread-form").submit(function(e) {
		var f = $(this);
		socket.emit('create thread', {
			projectId: 1,
			name: $(":input[name=name]", f).val(),
			post: {
				username: $(":input[name=username]", f).val(),
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
		.focus(function() {
			socket.emit('writing now', {username: $(":input[name=username]").val() });
		})
		.blur(function() {
			socket.emit('writing stop', {username: $(":input[name=username]").val() });
		});
	$("#thread-view").hide();
	socket.emit('threadlist', {projectId: 1});

});
