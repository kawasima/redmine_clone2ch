var http = require('http');
var jsdom = require('jsdom');
var $ = require('jquery');
var fs = require('fs'),
props = require('props');

var settings = fs.readFileSync('config/settings.yml','utf8');
var config = props(settings);

function User(user) {
    this.id = user.id;
    this.login = user.login;
    this.firstname = user.firstname;
    this.lastname = user.lastname;
    this.mail = user.mail;
    this.projects = user.projects;
}

exports.getUser = function (userId, callback) {
    var request = http.get(
	{
	    "host":  config.redmine.host,
	    "port":  Number(config.redmine.port),
	    "path":  config.redmine.path + '/users/'+userId+'.xml?include=memberships',
	    "auth":  config.redmine.admin.user + ":" + config.redmine.admin.password
	},
	function(res) {
	    res.setEncoding('utf8');
	    res.on('data', function (content) {
		var document = jsdom.jsdom(content);
		console.log("content: " + content);
		var data = {
		    id: $("user > id", document).text(),
		    login: $("user > login", document).text(),
		    firstname: $("user > firstname", document).text(),
		    lastname: $("user > lastname", document).text(),
		    mail: $("user > mail", document).text(),
		    projects: [ ]
		};
		$("memberships > membership", document).each(function(i, m) {
		    data.projects.push($("project", m).attr("id"));
		});
		var user = new User(data);
		console.log(user);
		callback.apply(this, [user]);
	    });
	}
    );

    request.on('error', function (e) {
	console.error(e);
    });
};
