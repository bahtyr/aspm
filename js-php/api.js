// AUTH

/**
 * Initial request to be made, user needs to authorize my client first. Will request tokens with given data.
 *
 * @result Returns spotify.code
 */
function apiAuthRedirect() {
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
function apiGetTokens(request) {
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

// GET

/** 
 * @return {string/json} User object		Returns user data such as their ID, display name and image.
 */
function apiGetMe() {
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "GET",
			url: `https://api.spotify.com/v1/me`,
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, textStatus) => resolve(data),
			error: (textStatus, errorThrown) => reject([textStatus, errorThrown])
		});
	});
}

/** 
 * @params {int} type 	0: tracks 		1: artists
 * @params {int} type 	0: short_term	1: long_term
 */
function apiGetMyTop(type, timeRange) {
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

/*
 * Get current user's every playlist, including liked playlists of others.
 */
function apiGetMyPlaylists() {
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

/*
 * Get public playlists of a user.
 */
function apiGetUserPlaylists(userID) {
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "GET",
			url: `https://api.spotify.com/v1/users/${userID}/playlists`,
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			data: {limit: 25},
			success: (data, textStatus) => resolve(data),
			error: (textStatus, errorThrown) => reject([textStatus, errorThrown])
		});
	});
}

/*
 * Get current user's liked / saved tracks.
 */
function apiGetMySavedTracks(url_next, limit_) {
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "GET",
			url: url_next != null && url_next != "" ? url_next : `https://api.spotify.com/v1/me/tracks`,
			data: {limit: limit_ == null ? 50 : limit_},
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, textStatus) => resolve(data),
			error: (textStatus, errorThrown) => reject([textStatus, errorThrown])
		});
	});
}

/*
 * Get a playlist's tracks.
 */
function apiGetPlaylistTracks(playlistID, url_next) {
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "GET",
			url: url_next != "" ? url_next : `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
			data: {limit: 100, fields: "total,limit,next,items(added_at,track(uri,id,name,artists(id,name),album(id,name,images)))"}, // max 100
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, textStatus) => resolve(data),
			error: (textStatus, errorThrown) => reject([textStatus, errorThrown])
		});
	});
}

/*
 * Get a playlist's info. Almost a dupe of function above.
 */
function apiGetPlaylistInfo(playlistID) {
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "GET",
			url: `https://api.spotify.com/v1/playlists/${playlistID}`,
			data: {fields: "name,description,images,owner(display_name,id)"}, // max 100
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, textStatus) => resolve(data),
			error: (textStatus, errorThrown) => reject([textStatus, errorThrown])
		});
	});
}

// PUT, POST

/*
 * @result 					Returns playlist object, most important keys are "href", "id".
 */
function apiCreatePlaylist(name, description) {
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
 * Replaces a playlist's cover image.
 */
function apiUploadPlaylistCover(playlistID, imgBase64) {
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
 * Replaces a playlist's cover image.
 */
function apiUpdatePlaylistInfo(playlistID, name, description, public_) {
	let data_;
	if (description == null || !description.trim())
		data_ = {name: name, public: public_ == null ? true : public_}
	else data_ = {name: name, description: description, public: public_ == null ? true : public_}

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "PUT",
			url: `https://api.spotify.com/v1/playlists/${playlistID}`,
			data: JSON.stringify(data_),
			processData: false,
			contentType: "application/json",
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, textStatus) => resolve(data),
			error: (textStatus, errorThrown) => reject([textStatus, errorThrown])
		});
	});
}

/*
 * @param {int}				playlistID			Playlist ID.
 * @param {array[string]}	trackURIs			A list of track URIs in an array.
 * @result 										Returns snpashot_id in JSON object.
 */
function apiAddTracksToPlaylist(playlistID, trackURIs) {
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

/*
 * @param {int}				playlistID			Playlist ID.
 * @param {array[string]}	trackURIs			A list of track URIs in an array.
 * @result 										Returns snpashot_id in JSON object.
 */
function apiRemoveTrackFromPlaylist(playlistID, trackURIs) {
	let data_ = {"tracks": []};
	for (i in trackURIs) 
		data_.tracks.push({"uri": trackURIs[i]});

	return new Promise((resolve, reject) => {
		$.ajax({
			method: "DELETE",
			url: `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
			data: JSON.stringify(data_),
			processData: false,
			contentType: "application/json",
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, status) => resolve(data),
			error: (jqXHR, textStatus, errorThrown) => resolve(jqXHR)
		});
	});
}

/*
 *
 */
function apiGetCurrentlyPlayingTrack() {
	return new Promise((resolve, reject) => {
		$.ajax({
			method: "GET",
			url: `https://api.spotify.com/v1/me/player`,
			contentType: "application/json",
			headers: {"Authorization": "Bearer " + spotify.accessToken},
			success: (data, status) => resolve(data),
			error: (jqXHR, textStatus, errorThrown) => resolve(jqXHR)
		});
	});
}