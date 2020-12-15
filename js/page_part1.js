$(function() {
	check_params();
	initButtons();
});

var spotifyAuth = {code: "", accessToken: "", refreshToken: "", expiresIn: 0, isExpired: true, scope: ""};
var spotifyAuthTimer;
var user = {name: "", image: "", id: ""};
var playlists = [];

function check_params() {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	if(urlParams.has("code")); {
		spotifyAuth.code = urlParams.get("code");
		console.log("Have Authorization");
	}

}

function initButtons() {
	$("#btn_temp").click(doSomething);
	
	$("#btn_s_auth").click(spotifyAuthorize);
	$("#btn_s_request").click(spotifyRequestTokens);
	$("#btn_s_refresh").click(spotifyRefreshTokens);

	$("#btn_get_current_user").click(getCurrentUser);
	$("#btn_get_current_user_playlists").click(getCurrentUserPlaylists);
	$("#btn_get_playlist").click(getPlaylist);
}

function doSomething() {
	console.log(playlists);
}

// SPOTIFY AUTHORIZATION FUNCTIONS

function spotifyAuthorize() {
	window.location.href = "./requests.php?request_auth=auth";
}

function spotifyRequestTokens() {
	$.get("./requests.php",
		{ request_auth: "tokens", code: spotifyAuth.code },
		function(data, status) {
			spotifyAuth.accessToken = data["access_token"];
			spotifyAuth.refreshToken = data["refresh_token"];
			spotifyAuth.expiresIn = data["expires_in"];
			spotifyAuth.isExpired = false;
			spotifyAuth.scope = data["scope"];
			startSpotifyExpirationCountdown();
			console.log("Request Tokens - Success");
		}, "json");
}

function spotifyRefreshTokens() {
	$.get("./requests.php",
		{ request_auth: "refresh", refresh_token: spotifyAuth.refreshToken },
		function(data, status) {
			spotifyAuth.accessToken = data["access_token"];
			spotifyAuth.expiresIn = data["expires_in"];
			spotifyAuth.isExpired = false;
			spotifyAuth.scope = data["scope"];
			startSpotifyExpirationCountdown();
			console.log("Refresh Tokens - Success");
		}, "json");
}

function startSpotifyExpirationCountdown() {
	clearTimeout(spotifyAuthTimer);
	spotifyAuthTimer = setTimeout(function() {
		spotifyAuth.isExpired = true;
	}, spotifyAuth.expiresIn);
}

// SPOTIFY OTHER

function getCurrentUser() {
	$.get("./requests.php",
		{ request: "get_current_user", access_token: spotifyAuth.accessToken},
		function(data, status) {
			user.name = data["display_name"];
			user.image = data["images"][0]["url"];
			user.id = data["id"];
			console.log("Get Current User - Success");
		}, "json");
}

function getCurrentUserPlaylists() {
	$.get("./requests.php",
		{ request: "get_current_user_playlists", access_token: spotifyAuth.accessToken},
		function(data, status) {
			playlists = data;
			console.log("Get Current User Playlists - Success");
		}, "json");
}

function getPlaylist() {
	var pid = playlists[0]["id"];
	$.get("./requests.php",
		{ request: "get_playlist_tracks", playlist_id: pid, access_token: spotifyAuth.accessToken},
		function(data, status) {
			// console.log(data);
			console.log("Get Current Playlist - Success");
		});
}