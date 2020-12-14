$(function() {
	check_params();
	// console.log(spotify_code);
});

// create spotify object
var spotify_code;
var spotify_access_token;
var spotify_refresh_token;
var spotify_expires_in;
var spotify_is_expired;
var spotify_timer;

function check_params() {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	if(urlParams.has("code"));
		spotify_code = urlParams.get("code");

}

function btn_temp() {
	console.log(spotify_access_token);
}

function btn_login1() {
	window.location.href = "./requests.php?aspm_spotify_auth=1";
}

function btn_login2() {
	$.get("./requests.php",
		{ aspm_spotify_access: "1", code : spotify_code },
		function(data, status) {
			spotify_access_token = data["access_token"];
			spotify_refresh_token = data["refresh_token"];
			spotify_expires_in = data["expires_in"];
			spotify_is_expired = false;
			start_spotify_expiration_countdown();
		}, "json");
}

function btn_login3() {
	$.get("./requests.php",
		{ aspm_spotify_refresh: "1", refresh_token : spotify_refresh_token },
		function(data, status) {
			spotify_access_token = data["access_token"];
			spotify_expires_in = data["expires_in"];
			spotify_is_expired = false;
		}, "json");
}

function start_spotify_expiration_countdown() {
	clearTimeout(spotify_timer);
	spotify_timer = setTimeout(function() {
		spotify_is_expired = true;
	}, spotify_expires_in);
}