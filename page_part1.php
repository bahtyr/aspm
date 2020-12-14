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
			<button id="btn_temp" class="margin_bottom" onclick="btn_temp()">Do Something</button>

			<button id="btn_s_auth" class="btn_spotify" onclick="btn_login1()">Authorize Spotify</button>
			<button id="btn_s_request" class="btn_spotify" onclick="btn_login2()">Request Tokens</button>
			<button id="btn_s_refresh" class="btn_spotify margin_bottom" onclick="btn_login3()">Refresh Token</button>

			<button id="btn_get_playlists" onclick="btn_login3()">Get Playlists</button>
			<button id="btn_save_playlists">Save Playlists</button>
			<button id="btn_get_playlists_content">Get Playlists' Contents</button>
		</div>
		<div>

		</div>
	</body>
</html>