<?php
check_getpost();


function do_spotify_auth($client_id, $client_secret) {
	$redirect_uri = "http://localhost/aspm/requests.php?spotify_response=auth"; //!!LINK
	$scopes = "user-read-private user-read-email";
	$url = "https://accounts.spotify.com/authorize?"
		."response_type=code&client_id={$client_id}&client_secret={$client_secret}&redirect_uri={$redirect_uri}&scopes={$scopes}";
	header("Location: {$url}");
}

function do_spotify_access($client_id, $client_secret, $code) {
	$auth_base64 = base64_encode($client_id.":".$client_secret);
	$redirect_uri = "http://localhost/aspm/requests.php?spotify_response=auth"; //!!LINK


	$url = "https://accounts.spotify.com/api/token";
	$data = array('grant_type' => 'authorization_code', 'code' => $code, 'redirect_uri' => $redirect_uri);
	$options = array(
	    'http' => array(
	        'method'  => 'POST',
	        'header'  => "Content-type: application/x-www-form-urlencoded\r\n".
	        			 "Authorization: Basic {$auth_base64}\r\n",
	        'content' => http_build_query($data)
	    )
	);
	
	$context = stream_context_create($options);
	$result = file_get_contents($url, false, $context);
	
	if ($result === false) {
		echo error_get_last()['message'];
	}

	echo $result;
}

function do_spotify_refresh($client_id, $client_secret, $refresh_token) {
	$auth_base64 = base64_encode($client_id.":".$client_secret);

	$url = "https://accounts.spotify.com/api/token";
	$data = array('grant_type' => 'refresh_token', 'refresh_token' => $refresh_token);
	$options = array(
	    'http' => array(
	        'method'  => 'POST',
	        'header'  => "Content-type: application/x-www-form-urlencoded\r\n".
	        			 "Authorization: Basic {$auth_base64}\r\n",
	        'content' => http_build_query($data)
	    )
	);
	
	$context = stream_context_create($options);
	$result = file_get_contents($url, false, $context);
	
	if ($result === false) {
		echo error_get_last()['message'];
	}

	echo $result;
}


function check_getpost() {
	$client_id = "818359d1ffe44cc8856e83f047b1840a";
	$client_secret = "0af9b4f2baf84e32a8b379bf3d7eadfa";

	// WITHIN PROJECT

	if(isset_get("aspm_spotify_auth")) {
		do_spotify_auth($client_id, $client_secret);
	} elseif (isset_get("aspm_spotify_access") && isset_get("code")) {
		do_spotify_access($client_id, $client_secret, $_GET["code"]);
	} elseif (isset_get("aspm_spotify_refresh") && isset_get("refresh_token")) {
		do_spotify_refresh($client_id, $client_secret, $_GET["refresh_token"]);
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

function base64_url_encode($data) {
 return strtr(base64_encode($data), '+/=', '_');
}

function base64_url_decode($data) {
 return base64_decode(strtr($data, '._-', '+/='));
}
?>