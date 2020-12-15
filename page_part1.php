<?php 
	header('Access-Control-Allow-Origin: *');
	header('Access-Control-Allow-Methods: GET, POST');
	header("Access-Control-Allow-Headers: X-Requested-With");
?>

<html>
	<head>
		<title>ASPM - Part 1</title>
		<link rel="icon" href="data:;base64,iVBORw0KGgo=">

		<link rel="stylesheet" href="./css/page_part1.css">
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
		<script src="./js/page_part1.js"></script>
	</head>
	<body>

		<div>
			<button id="btn_temp">Do Something</button>
			<br>
			<button id="btn_s_auth" class="btn_spotify">Authorize Spotify</button>
			<button id="btn_s_request" class="btn_spotify">Request Tokens</button>
			<button id="btn_s_refresh" class="btn_spotify">Refresh Token</button>
			<br>
			<button id="btn_get_current_user">Get Current User</button>
			<button id="btn_get_current_user_playlists">Get Playlists</button>
			<button id="btn_get_playlist">Get Playlist</button>
			<br>
			<button id="btn_save_playlists">Save Playlists</button>
		</div>
		<div>
			<p id="text"></p>
		</div>
	</body>
</html>