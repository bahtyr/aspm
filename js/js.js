$(function() {
	check_params();
});

var access_token;

function check_params() {
	if (window.location.hash.length > 100) {
		access_token = window.location.hash.substr(14, window.location.hash.toString().indexOf("token_type") - 15);
		console.log(access_token);
	}
}

function button1() { spotifyAuth(); }
function button2() { testPost(); }

function spotifyAuth() {
	var client_id = "818359d1ffe44cc8856e83f047b1840a";
	var redirect_uri = "http://localhost/aspm/index.html?";
	var scope = "user-read-private user-read-email";

	// $.ajax({
	// 	url: "https://accounts.spotify.com/authorize",
	// 	data: {client_id: client_id, response_type: "token", redirect_uri: redirect_uri, scope: scope, show_dialog: true},
	// 	type: "GET",
	// 	success: function(data, textStatus) {
	// 		console.log("success?");
	// 	},
	// 	error: function(textStatus, errorThrown) {
	// 		console.log("error?");

	// 	}
	// });

	var params = `client_id=${client_id}&response_type=token&redirect_uri=${redirect_uri}&scope=${scope}&show_dialog=true`;
	window.open("https://accounts.spotify.com/authorize?" + params, "_self");
}

function getMe() {
	var client_id = "818359d1ffe44cc8856e83f047b1840a";
	// var redirect_uri = "http://localhost/aspm/index.html?";
	// var scope = "user-read-private user-read-email";

	$.ajax({
		url: "https://api.spotify.com/v1/me",
		// data: {client_id: client_id, response_type: "token", redirect_uri: redirect_uri, scope: scope, show_dialog: true},
		type: "GET",
		headers: {"Authorization": "Bearer " + access_token},
		success: function(data, textStatus) {
			console.log("SUCCESS");
			console.log(data);
		},
		error: function(textStatus, errorThrown) {
			console.log("error?");

		}
	});
}

function getMyPlaylist() {
	var url = "https://api.spotify.com/v1/me/playlists"

	$.ajax({
		url: url,
		data: {limit: 50, offset: 0},
		type: "GET",
		headers: {"Authorization": "Bearer " + access_token},
		success: function(data, textStatus) {
			console.log("SUCCESS");
			console.log(data);
		},
		error: function(textStatus, errorThrown) {
			console.log("error?");

		}
	});
}

function readClip() {
	navigator.clipboard.readText().then(function(clipText) {
		console.log(clipText);
	})
	// console.log(navigator.clipboard.readText());
}

function testPost() {
	$.ajax({
    url: "https://reqres.in/api/users",
    type: "POST",
    data: {
        name: "paul rudd",
        movies: ["I Love You Man", "Role Models"]
    },
    success: function(response){
        console.log(response);
    }
});
}

function printSmh() {
	console.log("hello");
}