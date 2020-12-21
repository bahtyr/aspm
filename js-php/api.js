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
 * @params {int} request 	0: tokens 1: refresh
 * @result					when request is "tokens", returns spotify.accessToken & spotify.refreshToken
 * 							request is "refrseh", returns spotify.accessToken
 */
function requestTokens(request) {
	let data_;
	if (request == 0)
		data_ = { request: "tokens", code: spotify.code, redirect_uri: window.location.href.match(/^[^\#\?]+/)[0] };
	else data_ = { request: "refresh", refresh_token: spotify.refreshToken };

	$.ajax({
		method: "GET",
		url: "./js-php/requests.php",
		data: data_,
		success: function(data, status) {
			console.log("this one right");
			console.log(data);
			console.log(status);
			// when we make a REFRESH request, it does not return a refresh token
			data_ = JSON.parse(data);
			if (data_["refresh_token"] != null)
				saveSpotifyAuthData(spotify.code, data_["access_token"], data_["refresh_token"]);
			else saveSpotifyAuthData(spotify.code, data_["access_token"], spotify.refreshToken);

			spotifyFlow();
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("Request Failed. " + textStatus);
		}
	});
}

// ---------------------------------------------------------------------------------------- USER

function requestCurrentUser() {
	$.ajax({
		method: "GET",
		url: "./js-php/requests.php",
		data: { request: "get_current_user", access_token: spotify.accessToken},
		success: function(data, status) {
			if (data.length > 10) {
				data_ = JSON.parse(data);
				user.name = data_["display_name"];
				user.image = data_["images"][0]["url"];
				user.id = data_["id"];
				saveUser();
				printUser();
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("Request Failed. " + textStatus);
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
	if (localStorage.spotify != null) {
		let spotify_ = JSON.parse(localStorage.spotify);

		// if refreshToken is not empty, other vals are also not empty, we can use it
		if (spotify_.refreshToken != "") {
			spotify = spotify_;

			const timeDiff = Math.floor((Date.now() - spotify.dateInMs) / 1000);
			if (timeDiff >= 3600)
				requestTokens(1)
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

// ---------------------------------------------------------------------------------------- SAVE DATA

function saveSpotifyAuthData(code, accessToken, refreshToken) {
	spotify.code = code;
	spotify.accessToken = accessToken;
	spotify.refreshToken = refreshToken;
	spotify.dateInMs = Date.now();
	localStorage.setItem("spotify", JSON.stringify(spotify));
	setTimeout(() => requestTokens(true), 3600 * 1000);
}

function saveUser() {
	localStorage.setItem("user", JSON.stringify(user));
}


// ---------------------------------------------------------------------------------------- HTML

function printUser() {
	$(".login").addClass("is-gone");
	$(".user-name").removeClass("is-gone").text(user.name);
}