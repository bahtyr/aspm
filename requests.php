<?php
check_getpost();

// SPOTIFY AUTHORIZATION

function spotify_authorize($client_id, $client_secret) {
	$redirect_uri = "http://localhost/aspm/requests.php?spotify_response=auth"; //!!LINK
	$scopes = "playlist-modify-private playlist-modify-public playlist-read-collaborative playlist-read-private user-follow-read user-library-read user-library-modify user-read-recently-played user-top-read ugc-image-upload";
	$url = "https://accounts.spotify.com/authorize?"
		."response_type=code&client_id={$client_id}&client_secret={$client_secret}&redirect_uri={$redirect_uri}&scope={$scopes}";
	header("Location: {$url}");
}

function spotify_request_tokens($auth_encoded, $code) {
	$redirect_uri = "http://localhost/aspm/requests.php?spotify_response=auth"; //!!LINK

	$url = "https://accounts.spotify.com/api/token";
	$contents = array('grant_type' => 'authorization_code', 'code' => $code, 'redirect_uri' => $redirect_uri);
	$headers = "Content-type: application/x-www-form-urlencoded\r\nAuthorization: Basic {$auth_encoded}\r\n";
	api_request("request_tokens", $url, "POST", $headers, $contents, true);
}

function spotify_refresh_tokens($auth_encoded, $refresh_token) {
	$redirect_uri = "http://localhost/aspm/requests.php?spotify_response=auth"; //!!LINK

	$url = "https://accounts.spotify.com/api/token";
	$contents = array('grant_type' => 'refresh_token', 'refresh_token' => $refresh_token);
	$headers = "Content-type: application/x-www-form-urlencoded\r\nAuthorization: Basic {$auth_encoded}\r\n";
	api_request("request_tokens", $url, "POST", $headers, $contents, true);
}

// SPOTIFY OTHER

function spotify_get_current_user($access_token) {
	$url = "https://api.spotify.com/v1/me";
	$headers = "Content-type: application/x-www-form-urlencoded\r\nAuthorization: Bearer {$access_token}\r\n";
	api_request("", $url, "GET", $headers, "", true);
}

function spotify_get_current_user_playlists($access_token) {
	$url = "https://api.spotify.com/v1/me/playlists";
	$contents = array('limit' => '50', 'offset' => '0');
	$headers = "Authorization: Bearer {$access_token}\r\n";
	
	$result = api_request_looped("", $url, "GET", $headers, $contents, 50);
	echo json_encode(api_declutter_playlists($result));
}

function spotify_get_playlist_tracks($access_token, $playlist_id) {
	$url = "https://api.spotify.com/v1/playlists/".$playlist_id."/tracks";
	$contents = array('limit' => '100','offset' => '0'); //fields
	$headers = "Authorization: Bearer {$access_token}\r\n";

	$result = api_request_looped("", $url, "GET", $headers, $contents, 100);
	echo json_encode(api_declutter_playlist_tracks($result));
}

// OTHER

function check_getpost() {
	$client_id = "818359d1ffe44cc8856e83f047b1840a";
	$client_secret = "0af9b4f2baf84e32a8b379bf3d7eadfa";
	$auth_encoded = base64_encode($client_id.":".$client_secret);

	// WITHIN PROJECT

	if (isset_get("request_auth")) {
		if ($_GET["request_auth"] == "auth") spotify_authorize($client_id, $client_secret);
		elseif ($_GET["request_auth"] == "tokens" && isset_get("code")) spotify_request_tokens($auth_encoded, $_GET["code"]);
		elseif ($_GET["request_auth"] == "refresh" && isset_get("refresh_token")) spotify_refresh_tokens($auth_encoded, $_GET["refresh_token"]);
	} elseif (isset_get("request")) {
		if ($_GET["request"] == "get_current_user" && isset_get("access_token")) spotify_get_current_user($_GET["access_token"]);
		if ($_GET["request"] == "get_current_user_playlists" && isset_get("access_token"))spotify_get_current_user_playlists($_GET["access_token"]);
		if ($_GET["request"] == "get_playlist_tracks" && isset_get("playlist_id") && isset_get("access_token")) 
			spotify_get_playlist_tracks($_GET["access_token"], $_GET["playlist_id"]);
	}

	// FROM SPOTIFY

	if(isset_get("spotify_response")){
		if($_GET["spotify_response"] == "auth") {
			if(isset_get("code")) { // if auth is successful redirect to home
				header("Location: page_part1.php?code={$_GET["code"]}"); //!!LINK
			}
		}

		if(isset_get("error")) {
			echo $_GET["error"];
		}
	}
}

function isset_get($str) { return isset($_GET[$str]) && !empty($_GET[$str]); }

function isset_post($str) { return isset($_POST[$str]) && !empty($_POST[$str]); }

function api_request($debug, $url, $method, $headers, $parameters, $echo) {
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
	
	if ($result === false) {
		echo $debug.": ".error_get_last()['message'];
	} else {
		if ($echo) echo $result;
		else return $result;
	}
}

function api_request_looped($debug, $url, $method, $headers, $parameters, $limit) {
	$result = api_request($debug, $url, $method, $headers, $parameters, false);

	$json = json_decode($result);
	$items = $json -> items;
	$items_count = $json -> total;

	for ($i = 1; $i < $items_count / 50; $i++) {
		$parameters['offset'] = ($limit * $i).'';
		$result = api_request($debug, $url, $method, $headers, $parameters, false);
		$json = json_decode($result);
		$items = array_merge($items, $json -> items);
	}

	return $items;
}

function api_declutter_playlists($arr) {
	$new_arr = array();
	$new_val = array();

	foreach ($arr as &$value) {
		$new_val['id'] = $value -> id;
		$new_val['name'] = $value -> name;
		$new_val['description'] = $value -> description;
		$new_val[' image'] = $value -> images[0] -> url;
		$new_val['owner_name'] = $value -> owner -> display_name;
		$new_val['owner_id'] = $value -> owner -> id;
		$new_val['public'] = $value -> public;
		$new_val['collaborative'] = $value -> collaborative;
		array_push($new_arr, $new_val);
	}

	unset($value);
	unset($new_val);
	return $new_arr;
}

function api_declutter_playlist_tracks($arr) {
	$new_arr = array();
	$new_val = array();

	foreach ($arr as &$value) {
		$new_val['added_at'] = $value -> added_at;
		$new_val['is_local'] = $value -> is_local;

		$new_val['track']['duration_ms'] = $value -> track -> duration_ms;
		$new_val['track']['id'] = $value -> track -> id;
		$new_val['track']['name'] = $value -> track -> name;
		$new_val['track']['popularity'] = $value -> track -> popularity;
		$new_val['track']['preview_url'] = $value -> track -> preview_url;
		$new_val['track']['type'] = $value -> track -> type;

		$new_val['track']['album']['id'] = $value -> track -> album -> id;
		$new_val['track']['album']['image'] = $value -> track -> album -> images[0] -> url;
		$new_val['track']['album']['name'] = $value -> track -> album -> name;
		$new_val['track']['album']['release_date'] = $value -> track -> album -> release_date;

		foreach ($value -> track -> artists as &$artist) {
			$new_val['track']['artists']['id'] = $artist -> id;
			$new_val['track']['artists']['name'] = $artist -> name;
		}

		unset($artist);
		array_push($new_arr, $new_val);
	}

	unset($value);
	unset($new_val);
	return $new_arr;
}

?>