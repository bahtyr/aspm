let spotify = { code: "", accessToken: "", refreshToken: "", dateInMs: 0};
let user = { name: "", image: "", id: ""};

// ---------------------------------------------------------------------------------------- AUTHENTICATION

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

				const content = JSON.parse(data["content"]);

				// refresh requests don't return refresh token, preserve ours
				if (content["refresh_token"] != null)
					saveSpotifyAuthData(spotify.code, content["access_token"], content["refresh_token"]);
				else saveSpotifyAuthData(spotify.code, content["access_token"], spotify.refreshToken);

				spotifyFlow();

				console.log(content);

			} else if (data["status"] == 400) { // BAD REQUEST
				// probably we attempted to request tokens with an expired auth code, nvm this.
			} else {
				console.log(data);
			}
		},
		error: (jqXHR, textStatus, errorThrown) => // this is only for our php requests, it is not the actual response from spotify
			console.log("PHP Request Failed. " + textStatus)
	});
}

// ---------------------------------------------------------------------------------------- OTHER REQUESTS

function requestCurrentUser() {
	$.ajax({
		method: "GET",
		url: "./js-php/requests.php",
		data: { request: "get_current_user", access_token: spotify.accessToken},
		dataType: "json",
		success: function(data, status) {
			if (data["status"] == 200) {

				const content = JSON.parse(data["content"]);

				user.name = content["display_name"];
				user.image = content["images"][0]["url"];
				user.id = content["id"];
				saveUser();
				printUser();

			} else {
				console.log(data);
			}
		},
		error: (jqXHR, textStatus, errorThrown) =>
			console.log("PHP Request Failed. " + textStatus)
	});
}

/** 
 * @params {int} type 	0: tracks 		1: artists
 * @params {int} type 	0: short_term	1: long_term
 */
function requestTopTracksArtists(type, timeRange) {
	$.ajax({
		method: "GET",
		url: "./js-php/requests.php",
		data: { request: "get_top_tracks_artists", type: type, time_range: timeRange, access_token: spotify.accessToken},
		dataType: "json",
		success: function(data, status) {
			if (data["status"] == 200) {

				const content = JSON.parse(data["content"]);

				// console.log(type);
				if (type == "tracks")
					printTableTracks(content["items"]);
				else if (type == "artists") {
					printTableArtists(content["items"]);
					// console.log(content["items"]);
				}
			} else {
				console.log(data);
			}
		},
		error: (jqXHR, textStatus, errorThrown) =>
			console.log("PHP Request Failed. " + textStatus)
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
					printPlaylists(content);
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
	$.ajax({
		type: "PUT",
		url: `https://api.spotify.com/v1/playlists/${playlistID}/images`,
		data: imgBase64,
		processData: false,
		contentType: "image/jpeg",
		headers: {"Authorization": "Bearer " + spotify.accessToken},
		success: function(data, textStatus) {
			window.alert("Updated playlist cover.");
		},
		error: function(textStatus, errorThrown) {
			window.alert("Failed to update playlist cover.");
		}
	});
}

// ---------------------------------------------------------------------------------------- SPOTIFY FLOW

/**
 * Make the neceserray requests in order. 
 * 
 * if we have existing tokens & if it didn't it expire: use it, set timer or refresh
 * else read url & request tokens
 */
function spotifyFlow() {
	// check local data
	if (localStorage.spotify != null && localStorage.spotify != "") {
		let spotify_ = JSON.parse(localStorage.spotify);

		// if refreshToken is not empty, other vals are also not empty, we can use it
		if (spotify_.refreshToken != "") {
			spotify = spotify_;

			const timeDiff = Math.floor((Date.now() - spotify.dateInMs) / 1000);
			if (timeDiff >= 3600)
				requestTokens(1);
			else setTimeout(() => requestTokens(true), (3600 - timeDiff) * 1000);
		}
	}

	// check if we need to read URL params
	if (spotify.refreshToken == "" && spotify.accessToken == "") {

		const urlParams = new URLSearchParams(window.location.search);

		if(urlParams.has("code")) {
			spotify.code = urlParams.get("code");
			requestTokens(0);
		}
	}

	// USER

	if (localStorage.user != null) {
		user = localStorage.user;
		printUser();
	} else if (spotify.refreshToken != "") {
		requestCurrentUser();
	} 
}

function isLoggedIn() {
	return spotify.code != "" && spotify.accessToken != "" && spotify.refreshToken != "";
}

// ---------------------------------------------------------------------------------------- SAVE DATA

function saveSpotifyAuthData(code, accessToken, refreshToken) {
	spotify.code = code;
	spotify.accessToken = accessToken;
	spotify.refreshToken = refreshToken;
	spotify.dateInMs = Date.now();
	localStorage.setItem("spotify", JSON.stringify(spotify));
	if (spotify.refreshToken != "")
		setTimeout(() => requestTokens(true), 3600 * 1000);
}

function saveUser() {
	localStorage.setItem("user", JSON.stringify(user));
}

function logout() {
	spotify.code = "";
	spotify.accessToken = "";
	spotify.refreshToken = "";
	spotify.dateInMs = 0;
	localStorage.removeItem("spotify");

	user.name = "";
	user.image = "";
	user.id = "";
	localStorage.removeItem("user");

	$(".login").removeClass("is-gone");
	$(".user-name").addClass("is-gone");
}

// ---------------------------------------------------------------------------------------- HTML

function printUser() {
	$(".login").addClass("is-gone");
	$(".user-name").removeClass("is-gone").text(user.name);
}

function printPlaylists(items) {
	let list = [];
	const template = $(".image-item")[0].outerHTML;

	for (let i = 0; i < items.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		// IMAGE
		let imgArrLength = items[i]["images"].length;
		if (imgArrLength > 0)
			holder.find("img").attr("src", items[i]["images"][imgArrLength > 2 ? 1 : 0]["url"]);
		else { 
			holder.find("img").removeAttr("src", "");
			holder.find("img").addClass("is-hidden");
		}
		
		// NAME
		let name = items[i]["name"];
		if (name.length > 30)
			name = name.substr(0, 30) + "...";
		holder.find("p span").text(name);

		// IS PRIVATE / PUBLIC
		if (items[i]["public"])
			holder.addClass("is-public");
		else holder.removeClass("is-public");

		list.push(holder);
	}

	// add empty elements at the of the grid to properly align the last row of tiles
	for (let i = 0; i < 6; i++) {
		let holder = $($.parseHTML(template));
		holder.html("");
		holder.addClass("is-filler");
		holder.removeClass("is-gone");
		list.push(holder);
	}

	$("main").append(list);
}

function printTableTracks(items) {
	let list = [];
	const template = $("table tr")[1].outerHTML;

	for (let i = 0; i < items.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		// TREND
		let random = Math.floor(Math.random() * 4) + 1;
		if (random < 4)
			holder.find(`td:nth-child(1) svg:nth-child(${random})`).removeClass("is-gone");

		// NO
		holder.find("td:nth-child(2)").text(i + 1);

		// IMAGE
		let imgArrLength = items[i]["album"]["images"].length;
		if (imgArrLength > 0)
			holder.find("td:nth-child(3) img").attr("src", items[i]["album"]["images"][0]["url"]);
		else { 
			holder.find("td:nth-child(3) img").removeAttr("src", "");
			holder.find("td:nth-child(3) img").addClass("is-hidden");
		}
		
		// TITLE
		let name = items[i]["name"];
		if (name.length > 25)
			name = name.substr(0, 25) + "...";
		holder.find("td:nth-child(3) span").text(name);

		// ARTISTS
		// TODO loop artists
		let artists = items[i]["artists"][0]["name"];
		if (artists.length > 25)
			artists = artists.substr(0, 25) + "...";
		holder.find("td:nth-child(4)").text(artists);

		// ALBUM
		let album = items[i]["album"]["name"];
		if (album.length > 25)
			album = album.substr(0, 25) + "...";
		holder.find("td:nth-child(5)").text(album);

		list.push(holder);
	}

	$("table").append(list);
}

function printTableArtists(items) {
	let list = [];
	const template = $("table tr")[1].outerHTML;

	for (let i = 0; i < items.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		// TREND
		let random = Math.floor(Math.random() * 4) + 1;
		if (random < 4)
			holder.find(`td:nth-child(1) svg:nth-child(${random})`).removeClass("is-gone");

		// NO
		holder.find("td:nth-child(2)").text(i + 1);

		// IMAGE
		let imgArrLength = items[i]["images"].length;
		if (imgArrLength > 0)
			holder.find("td:nth-child(3) img").attr("src", items[i]["images"][imgArrLength - 1]["url"]);
		else { 
			holder.find("td:nth-child(3) img").removeAttr("src", "");
			holder.find("td:nth-child(3) img").addClass("is-hidden");
		}
		
		// TITLE
		let name = items[i]["name"];
		if (name.length > 25)
			name = name.substr(0, 25) + "...";
		holder.find("td:nth-child(3) span").text(name);

		// POPULARITY
		holder.find("td:nth-child(4)").text(items[i]["popularity"]);

		// GENRES
		if (items[i]["genres"].length > 0)
			holder.find("td:nth-child(5)").text(items[i]["genres"].join("\r\n"));
		else holder.find("td:nth-child(5)").text("");

		list.push(holder);
	}

	$("table").append(list);
}