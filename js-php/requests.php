<?php

$client_id = "818359d1ffe44cc8856e83f047b1840a";
$client_secret = "0af9b4f2baf84e32a8b379bf3d7eadfa";

function spotify_authorize($redirect_uri, $client_id, $client_secret) {
	$redirect_uri = "http://localhost/aspm/requests.php?spotify_response=auth";
	$scopes = "playlist-modify-private playlist-modify-public playlist-read-collaborative playlist-read-private user-follow-read user-library-read user-library-modify user-read-recently-played user-top-read ugc-image-upload";
	$url = "https://accounts.spotify.com/authorize?"
		."response_type=code&client_id={$client_id}&client_secret={$client_secret}&redirect_uri={$redirect_uri}&scope={$scopes}";
	header("Location: {$url}");
}

function spotify_request_tokens($redirect_uri, $auth_encoded, $code) {
	$redirect_uri = "http://localhost/aspm/requests.php?spotify_response=auth";

	$url = "https://accounts.spotify.com/api/token";
	$contents = array('grant_type' => 'authorization_code', 'code' => $code, 'redirect_uri' => $redirect_uri);
	$headers = "Content-type: application/x-www-form-urlencoded\r\nAuthorization: Basic {$auth_encoded}\r\n";
	api_request("request_tokens", $url, "POST", $headers, $contents, true);
}

function spotify_refresh_tokens($redirect_uri, $auth_encoded, $refresh_token) {
	$redirect_uri = "http://localhost/aspm/requests.php?spotify_response=auth";

	$url = "https://accounts.spotify.com/api/token";
	$contents = array('grant_type' => 'refresh_token', 'refresh_token' => $refresh_token);
	$headers = "Content-type: application/x-www-form-urlencoded\r\nAuthorization: Basic {$auth_encoded}\r\n";
	api_request("request_tokens", $url, "POST", $headers, $contents, true);
}

// OTHER

function check_getpost() {

	if ($_GET["request_auth"] == "auth") 
		spotify_authorize($_GET["redirect_uri"], $client_id, $client_secret);
	
	// elseif ($_GET["request_auth"] == "tokens" && isset_get("code")) 
		// spotify_request_tokens(encode_auth(), $_GET["code"]);

	// elseif ($_GET["request_auth"] == "refresh" && isset_get("refresh_token")) 
		// spotify_refresh_tokens(encode_auth(), $_GET["refresh_token"]);
}

function isset_get($str) { return isset($_GET[$str]) && !empty($_GET[$str]); }

function isset_post($str) { return isset($_POST[$str]) && !empty($_POST[$str]); }

function encode_auth() { return base64_encode($client_id.":".$client_secret); }

?>