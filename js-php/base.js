$(function() {
	document.getElementsByTagName("body")[0].classList.add("animate");
	
	initHeaderButtons();

	readSpotifyCookies();
	printUserMaybe();
	authorizeMaybe();

	initModalDismissListener();
});

// ---------------------------------------------------------------------------------------- API FUNCTIONS

let spotify = { code: "", accessToken: "", refreshToken: "", dateInMs: 0};
let user = { name: "", image: "", id: ""};
let loginCallback;

function readSpotifyCookies() {
	if (localStorage.spotify != null) {

		let spotify_ = JSON.parse(localStorage.spotify);
		if (spotify_.refreshToken != "") { // if refreshToken is not empty, other vals are also not empty, we can use it
			spotify = spotify_;

			// check if our tokens expired
			const timeDiff = Math.floor((Date.now() - spotify.dateInMs) / 1000);
			if (timeDiff >= 3600)
				apiGetTokensHandler(1);
			else setTimeout(() => apiGetTokensHandler(1), (3600 - timeDiff) * 1000); // start expiration timer
		}
	}
}

function printUserMaybe() {
	if (isLoggedIn()) {
		if (localStorage.user != null) {
			user = JSON.parse(localStorage.user);
			printUser();
		}
	}
}

function authorizeMaybe() {
	if (!isLoggedIn()) {
		const urlParams = new URLSearchParams(window.location.search);

		if(urlParams.has("code")) {
			spotify.code = urlParams.get("code");
			apiGetTokensHandler(0);
		}
	}
}

/**
 * 1 - Request tokens & save. 
 * 2 - If first time request user data.
 * 3 - Run loginCallback()
 *
 * A apiGetTokens() wrapper, the function was being called multiple times.
 */
function apiGetTokensHandler(request) {
	apiGetTokens(request)
		.then((data) => {
			const content = JSON.parse(data["content"]);

			const isFirstTime = content["refresh_token"] != null;

			if (isFirstTime)
				saveSpotifyAuthData(spotify.code, content["access_token"], content["refresh_token"]);
			else saveSpotifyAuthData(spotify.code, content["access_token"], spotify.refreshToken);

			if (isFirstTime) {
				apiGetMe()
					.then((data) => {
						saveUser(data);
						printUser();
						if (loginCallback instanceof Function)
							loginCallback();
					})
					.catch((error) => console.log(error));
			} else {
				if (loginCallback instanceof Function)
					loginCallback();
			}
		})
		.catch((error) => {
			console.log(error);
		});
}

function saveSpotifyAuthData(code, accessToken, refreshToken) {
	spotify.code = code;
	spotify.accessToken = accessToken;
	spotify.refreshToken = refreshToken;
	spotify.dateInMs = Date.now();
	localStorage.setItem("spotify", JSON.stringify(spotify));
	if (spotify.refreshToken != "")
		setTimeout(() => apiGetTokens(1), 3600 * 1000);
}

function saveUser(data) {
	const content = JSON.parse(data["content"]);
	user.name = content["display_name"];
	user.image = content["images"][0]["url"];
	user.id = content["id"];

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

function isLoggedIn() {
	return spotify.code != "" && spotify.accessToken != "" && spotify.refreshToken != "";
	//
}

// ---------------------------------------------------------------------------------------- PRINTERS

function showWarning(text, autoHide) {
	const sticky = $(".sticky-top");
	const stickyText = $(".sticky-top p");
	stickyText.text(text);
	sticky.removeClass("is-hidden");
	if (autoHide)
		setTimeout(() =>  sticky.addClass("is-hidden"), 2000);
}

function printUser() {
	$(".login").addClass("is-gone");
	$(".user-name").removeClass("is-gone").text(user.name);
}

function printTableTracks(items, limit) {
	let limit_ = limit != 0 ? limit : items.length
	let list = [];
	const template = $("table tr")[1].outerHTML;

	for (let i = 0; i < limit_; i++) {
		if (i == items.length) break;

		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

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

	for (let i = 0; i < 20; i++) {
		if (i == items.length) break;
		
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

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

// ---------------------------------------------------------------------------------------- SITE HEADER & DARK MODE

function initHeaderButtons() {
	$(".darkmode-toggle").click(() => enableDarkMode(localStorage.darkMode == 0 ? 1 : 0));
	$(".menu").click(() => $(".site-header").toggleClass('is-expanded'));
	// $(".login").click(() => apiAuthRedirect());
	// $(".user-name").dblclick(() => logout());
}

function enableDarkMode(yes) {
	if (yes) {
		localStorage.darkMode = 1;
		$(".darkmode-toggle .icon-wrapper:nth-child(1)").removeClass('active');
		$(".darkmode-toggle .icon-wrapper:nth-child(2)").addClass('active');
		$('body, .bar').addClass('dark');
	} else {
		localStorage.darkMode = 0;
		$(".darkmode-toggle .icon-wrapper:nth-child(1)").addClass('active');
		$(".darkmode-toggle .icon-wrapper:nth-child(2)").removeClass('active');
		$('body, .bar').removeClass('dark');
	}
}

// ---------------------------------------------------------------------------------------- ETC

function getAnImageFromArray(arr) {
	if (arr == null || !Array.isArray(arr))
		return null;

	let imgArrLength = arr.length;
	if (imgArrLength > 0)
		return arr[imgArrLength > 2 ? 1 : 0]["url"];
	else return null;
}

// ---------------------------------------------------------------------------------------- NEW

// Count requests made and wait if necessary
let requestCounter = 0;
async function countRequestsAndWait() {
	requestCounter++;
	if (requestCounter % 20)
		await new Promise((resolve, reject) => setTimeout(() => resolve(), 5000)); 
}

function updateProgressBar(x, y) {
	const p = $(".top-progress-bar");

	p.css("width", `${x*100/y}%`);

	if (x >= y) {
		setTimeout(() => {
			p.css("transition", "none");
			p.css("width", "0");
			setTimeout(() => p.css("transition", ""), 200);
		}, 1000);
	}
}

// A function to only keep essential data from a track items array
function declutterLibraryTracks(arr, newArr) {
	for(i in arr) {
		let temp = {};
		temp.id = arr[i].track.id;
		temp.name = arr[i].track.name;
		temp.artists = [];

		for (y in arr[i].track.artists) {
			let tempY = {};
			tempY.id = arr[i].track.artists[y].id;
			tempY.name = arr[i].track.artists[y].name;
			temp.artists.push(tempY);
		}

		temp.album = {images: [{}]};
		temp.album.id = arr[i].track.album.id;
		temp.album.name = arr[i].track.album.name;

		let imgArrLength = arr[i].track.album.images.length;
		if (imgArrLength > 0)
			temp.album.images[0].url = arr[i].track.album.images[imgArrLength > 2 ? 1 : 0].url;
		else temp.album.images[0].url = "";

		temp.dateAdded = arr[i].added_at;

		newArr.push(temp);
	}
}

// Returns a date in "Jan 21, 2021" format
function getDateWithComma(str) {
	let d = new Date(str).toDateString();
	let s = d.slice(4, 10);
	if (s.charAt(4) == "0") s = s.slice(0, 4) + s.slice(5);
	return s + ',' + d.slice(10);
}

// !important: uses a decluttered tracks items list
function printTableTracks_(items, limit, offset) {
	limit = limit != null && limit != 0 ? limit : items.length;
	offset = offset != null && offset != 0 ? offset : 0;
	let list = [];
	const template = $(".table .row")[1].outerHTML;

	for (let i = offset; i < offset + limit; i++) {
		if (i == offset + limit) break;

		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		//

		let name = items[i].name;
		let artists = "";
		let album = items[i].album.name;
		let dateAdded = getDateWithComma(items[i].dateAdded);

		for (y in items[i].artists) {
			if (y > 0) artists += ", ";
			artists += items[i].artists[y].name;
		}

		holder.find("span:nth-child(2)").attr("title", name);
		holder.find("span:nth-child(3)").attr("title", artists);
		holder.find("span:nth-child(4)").attr("title", album);

		if (name.length > 50) name = name.substr(0, 50) + "...";
		if (artists.length > 25) artists = artists.substr(0, 25) + "...";
		if (album.length > 25) album = album.substr(0, 25) + "...";

		holder.find("span:nth-child(1)").text(i + 1);
		holder.find("span:nth-child(2)").text(name);
		holder.find("span:nth-child(3)").text(artists);
		holder.find("span:nth-child(4)").text(album);
		holder.find("span:nth-child(5)").text(dateAdded);

		list.push(holder);
	}

	$(".table").append(list);
}

function printPlaylists(items, limit, offset) {
	limit = limit != null && limit != 0 ? limit : items.length;
	offset = offset != null && offset != 0 ? offset : 0;
	let list = [];
	const template = $(".item")[0].outerHTML;

	for (let i = offset; i < offset + limit; i++) {
		if (i == offset + limit) break;

		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		// IMAGE
		let imgArrLength = items[i].images.length;
		if (imgArrLength > 0)
			holder.find(".image").attr("src", items[i].images[imgArrLength > 2 ? 1 : 0].url);
		else { 
			holder.find(".image").removeAttr("src", "");
			holder.find(".image").addClass("is-hidden");
		}
		
		// NAME
		let name = items[i]["name"];
		if (name.length > 30)
			name = name.substr(0, 30) + "...";
		holder.find(".text").text(name);

		// IS PRIVATE / PUBLIC
		if (items[i].public)
			holder.addClass("is-public");
		else holder.removeClass("is-public");

		list.push(holder);
	}

	// add empty elements at the of the grid to properly align the last row of tiles
	for (let i = 0; i < 6; i++) {
		let holder = $($.parseHTML(template));
		holder.addClass("is-filler");
		holder.removeClass("is-gone");
		list.push(holder);
	}

	$(".item-list").append(list);
}


// show modal
function showModal(foo) {
	if (foo) {
		$(".modal-wrapper").removeClass("hide");
		$(".modal-wrapper").addClass("show");
	} else {
		$(".modal-wrapper").removeClass("show");
		$(".modal-wrapper").addClass("hide");
	}
}

function initModalDismissListener() {
	$(".dismiss-area").click((e) => {
		if ($(e.target).attr("class") == "dismiss-area") {
			showModal(false);
		}
	});
}