<?php

check_getpost();

// AUTHENTICATION

function spotify_authorize($redirect_uri, $client_id, $client_secret) {
	$scopes = "playlist-modify-private playlist-modify-public playlist-read-collaborative playlist-read-private user-follow-read user-library-read user-library-modify user-read-recently-played user-top-read ugc-image-upload";
	$url = "https://accounts.spotify.com/authorize?"
		."response_type=code&client_id={$client_id}&client_secret={$client_secret}&redirect_uri={$redirect_uri}&scope={$scopes}";
	header("Location: {$url}");
}

function spotify_request_tokens($redirect_uri, $auth_encoded, $code) {
	$url = "https://accounts.spotify.com/api/token";
	$contents = array('grant_type' => 'authorization_code', 'code' => $code, 'redirect_uri' => $redirect_uri);
	$headers = "Content-type: application/x-www-form-urlencoded\r\nAuthorization: Basic {$auth_encoded}\r\n";
	api_request($url, "POST", $headers, $contents, true);
}

function spotify_refresh_tokens($auth_encoded, $refresh_token) {
	$url = "https://accounts.spotify.com/api/token";
	$contents = array('grant_type' => 'refresh_token', 'refresh_token' => $refresh_token);
	$headers = "Content-type: application/x-www-form-urlencoded\r\nAuthorization: Basic {$auth_encoded}\r\n";
	api_request($url, "POST", $headers, $contents, true);
}

// USER

function spotify_get_current_user($access_token) {
	$url = "https://api.spotify.com/v1/me";
	$headers = "Content-type: application/x-www-form-urlencoded\r\nAuthorization: Bearer {$access_token}\r\n";
	api_request($url, "GET", $headers, "", true);
}

function spotify_get_top_tracks_artists($access_token, $type, $time_range) {
	$url = "https://api.spotify.com/v1/me/top/" . $type;
	$contents = array('time_range' => $time_range, 'limit' => 20);
	$headers = "Accept: application/json\r\nContent-type: application/json\r\nAuthorization: Bearer {$access_token}\r\n";
	api_request($url, "GET", $headers, $contents, true);
}

// OTHER

function check_getpost() {
	$client_id = "818359d1ffe44cc8856e83f047b1840a";
	$client_secret = "6f88deff5e034b28a8bd7c81e67a804d";

	if(isset_get("request")) {
		if ($_GET["request"] == "auth") 
			spotify_authorize($_GET["redirect_uri"], $client_id, $client_secret);
		
		elseif ($_GET["request"] == "tokens" && isset_get("code")) 
			spotify_request_tokens($_GET["redirect_uri"], encode_auth($client_id, $client_secret), $_GET["code"]);

		elseif ($_GET["request"] == "refresh" && isset_get("refresh_token")) 
			spotify_refresh_tokens(encode_auth($client_id, $client_secret), $_GET["refresh_token"]);

		elseif ($_GET["request"] == "get_current_user") 
			spotify_get_current_user($_GET["access_token"]);

		elseif ($_GET["request"] == "get_top_tracks_artists") 
			spotify_get_top_tracks_artists($_GET["access_token"], $_GET["type"], $_GET["time_range"]);
	}
}

function isset_get($str) { return isset($_GET[$str]) && !empty($_GET[$str]); }

function isset_post($str) { return isset($_POST[$str]) && !empty($_POST[$str]); }

function encode_auth($client_id, $client_secret) { return base64_encode($client_id.":".$client_secret); }

/**
 * Makes a HTTP request
 *
 * @param String	$url
 * @param String	$method 		GET / POST
 * @param String	$headers 		can be empty	
 * @param String	$parameters 	can be empty
 * @param Boolean	$echo 			TRUE: echo the result, FALSE: return the result
 * @return Object 					returns the result if $echo is FALSE
 */
function api_request($url, $method, $headers, $parameters, $echo) {
	$contents = "";
	$query = http_build_query($parameters);

	if ($method == "GET") $url = $url.'?'.$query;
	elseif ($method == "POST") $contents = $query;

	$options = array(
	    'http' => array(
	        'method'  => $method,
	        'header'  => $headers,
	        'content' => $contents
	    )
	);

	$context = stream_context_create($options);
	$result = file_get_contents($url, false, $context);

	$return_ = array();

	// $http_response_header has status code at index 0
	if(is_array($http_response_header)) {
		$status = explode(' ', $http_response_header[0]);
		if(count($status) > 1) //HTTP/1.0 <code> <text>
 	    	$return_["status"] = intval($status[1]);
 	} else $return_["status"] = 0;

    $return_["content"] = $result;
	$return_["message"] = $result === false ? $http_response_header[0] : "";
	$return_["url"] = $result === false ? $url : ""; // only send URL on error

	// $return_["header"] = var_dump($http_response_header); // saving this just in case for future
	// $return_["message"] = error_get_last()['message']; // saving this just in case for future

	if ($echo) echo json_encode($return_);
	else return $result;
}

?>