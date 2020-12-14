$(function() {
	check_params();
	// console.log(spotify_code);
});

// create spotify object
var spotifyAuth = {code: "", accessToken: "", refreshToken: "", expiresIn: 0, isExpired: true};
var spotifyAuthTimer;
// var spoitfy = new Object();
// var spotify_code;
// var spotify_access_token;
// var spotify_refresh_token;
// var spotify_expires_in;
// var spotify_is_expired;

function check_params() {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	if(urlParams.has("code"));
		spotifyAuth.code = urlParams.get("code");

}

function btn_temp() {
	console.log(spotifyAuth.accessToken);
}

function btn_login1() {
	window.location.href = "./requests.php?aspm_spotify_auth=1";
}

function btn_login2() {
	$.get("./requests.php",
		{ aspm_spotify_access: "1", code : spotifyAuth.code },
		function(data, status) {
			spotifyAuth.accessToken = data["access_token"];
			spotifyAuth.refreshToken = data["refresh_token"];
			spotifyAuth.expiresIn = data["expires_in"];
			spotifyAuth.expiresIn = false;
			start_spotify_expiration_countdown();
		}, "json");
}

function btn_login3() {
	$.get("./requests.php",
		{ aspm_spotify_refresh: "1", refresh_token : spotifyAuth.refreshToken },
		function(data, status) {
			spotifyAuth.accessToken = data["access_token"];
			spotifyAuth.refreshToken = data["expires_in"];
			spotifyAuth.expiresIn = data["expires_in"];
			spotifyAuth.expiresIn = false;
			start_spotify_expiration_countdown();
		}, "json");
}

function start_spotify_expiration_countdown() {
	clearTimeout(spotifyAuthTimer);
	spotifyAuthTimer = setTimeout(function() {
		spotifyAuth.isExpired = true;
	}, spotifyAuth.expiresIn);
}