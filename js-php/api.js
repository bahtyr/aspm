
/**
 * Initial request to be made, user needs to authorize my client first. Will request tokens with given data.
 *
 * @result Returns spotify.code
 */
function requestAuthorization() {
	const redirect_uri = window.location.href.match(/^[^\#\?]+/)[0];
	window.location.href = "./js-php/requests.php?request=auth&redirect_uri=" + redirect_uri;
}

/**
 * My client is authorized, now request tokens to use in the future requests.
 * 
 * @params {int} request 	0: tokens  1: refresh
 * @result					0: returns spotify.accessToken & spotify.refreshToken
 * 							1: returns spotify.accessToken
 */
function requestTokens(request) {
	return new Promise((resolve, reject) => {
		let params;
		if (request == 0)
			params = { request: "tokens", code: spotify.code, redirect_uri: window.location.href.match(/^[^\#\?]+/)[0] };
		else params = { request: "refresh", refresh_token: spotify.refreshToken };

		$.ajax({
			method: "GET",
			url: "./js-php/requests.php",
			data: params,
			dataType: "json",
			success: function(data, status) {
				if (data["status"] == 200) { // SUCCESS
					resolve(data);
				} else if (data["status"] == 400) { // BAD REQUEST
					// probably we attempted to request tokens with an expired auth code, nvm this.
				} else {
					reject(data);
				}
			},
			error: (jqXHR, textStatus, errorThrown) => // this is only for our php requests, it is not the actual response from spotify
				reject("PHP Request Failed. " + textStatus)
		});
	});
}

function requestCurrentUser() {
	return new Promise((resolve, reject) => {
		$.ajax({
			method: "GET",
			url: "./js-php/requests.php",
			data: { request: "get_current_user", access_token: spotify.accessToken},
			dataType: "json",
			success: function(data, status) {
				if (data["status"] == 200) {
					resolve(data);
				} else {
					reject(data);
				}
			},
			error: (jqXHR, textStatus, errorThrown) => 
				reject("PHP Request Failed. " + textStatus)
		});
	});
}

/** 
 * @params {int} type 	0: tracks 		1: artists
 * @params {int} type 	0: short_term	1: long_term
 */
function requestTopTracksArtists(type, timeRange) {
	return new Promise((resolve, reject) => {
		$.ajax({
			method: "GET",
			url: "./js-php/requests.php",
			data: { request: "get_top_tracks_artists", type: type, time_range: timeRange, access_token: spotify.accessToken},
			dataType: "json",
			success: function(data, status) {
				if (data["status"] == 200) {
					resolve(data);
				} else {
					reject(data);
				}
			},
			error: (jqXHR, textStatus, errorThrown) =>
				reject("PHP Request Failed. " + textStatus)
		});
	});
}

function requestCurrentUserPlaylists() {
	return new Promise((resolve, reject) => {
		$.ajax({
			method: "GET",
			url: "./js-php/requests.php",
			data: { request: "get_current_user_playlists", access_token: spotify.accessToken},
			dataType: "json",
			success: function(data, status) {
				if (data["status"] == 200) {

					const content = JSON.parse(data["content"]);
					resolve(content);
				} else {
					console.log(data);
					reject(false);
				}
			},
			error: (jqXHR, textStatus, errorThrown) => {
				console.log("PHP Request Failed. " + textStatus);
				reject(false);
			}
		});
	});
}

function putPlaylistCover(playlistID, imgBase64) {
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "PUT",
			url: `https://api.spotify.com/v1/playlists/${playlistID}/images`,
			data: imgBase64,
			processData: false,
			contentType: "image/jpeg",
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, textStatus) => resolve(),
			error: (textStatus, errorThrown) => reject([textStatus, error])
		});
	});
}

/*
 * @result 					Returns playlist object, most important keys are "href", "id".
 */
function postCreatePlaylist(name, description) {
	return new Promise((resolve, reject) => {
		$.ajax({
			method: "POST",
			url: `https://api.spotify.com/v1/users/${user.id}/playlists`,
			data: `{"name": "${name}", "description": "${description}", "public": true}`,
			processData: false,
			contentType: "application/json",
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, status) => resolve(data),
			error: (jqXHR, textStatus, errorThrown) => resolve(jqXHR)
		});
	});
}


/*
 * @param {int}				playlistID			Playlist ID.
 * @param {array[string]}	trackURIs			A list of track URIs in an array.
 * @result 										Returns snpashot_id in JSON object.
 */
function postAddTracks(playlistID, trackURIs) {
	return new Promise((resolve, reject) => {
		$.ajax({
			method: "POST",
			url: `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
			data: `{"uris": ${JSON.stringify(trackURIs)}}`,
			processData: false,
			contentType: "application/json",
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, status) => resolve(data),
			error: (jqXHR, textStatus, errorThrown) => resolve(jqXHR)
		});
	});
}