var spotify = { accessToken: ""};
var section = 2;

$(function() {
	loadTempData();
	check_params();
	saveTempData();
	hideLogin();
	printSectionSelection();

	if (spotify.accessToken != "") {
		getMe();
		getMyPlaylists();
		printAttempt();
	}
});

// DATA MANGEMENT

function check_params() {
	const urlHash = window.location.hash;
	const urlParams = new URLSearchParams(window.location.search);

	if (urlHash.length > 100) {
		spotify.accessToken = urlHash.substr(14, urlHash.toString().indexOf("token_type") - 15);
	}

	if(urlParams.has("section")) {
		section = urlParams.get("section");
	}
}

function saveTempData() {
	if (spotify.accessToken != "") {
		// localStorage.setItem("temp", JSON.stringify(spotify));
	}
}

function loadTempData() {
	var temp = JSON.parse(localStorage.temp);
	if (temp.accessToken != "")
		spotify = temp;
}

// API

function spotifyAuth() {
	var client_id = "818359d1ffe44cc8856e83f047b1840a";
	var redirect_uri = "http://localhost/aspm/index.html";
	var scope = "user-read-private user-read-email";

	var params = `client_id=${client_id}&response_type=token&redirect_uri=${redirect_uri}&scope=${scope}&show_dialog=true`;
	window.open("https://accounts.spotify.com/authorize?" + params, "_self");

	// Using AJAX method results in a CORS error.
}

function getMe() {
	$.ajax({
		url: "https://api.spotify.com/v1/me",
		type: "GET",
		headers: {"Authorization": "Bearer " + spotify.accessToken},
		success: function(data, textStatus) {
			// TODO save temp user
			printUser(data["display_name"], data["images"][0]["url"]);
		},
		error: function(textStatus, errorThrown) {
			console.log("user error");

		}
	});
}

function getMyPlaylists() {
	$.ajax({
		url: "https://api.spotify.com/v1/me/playlists",
		data: {limit: 50, offset: 0},
		type: "GET",
		headers: {"Authorization": "Bearer " + spotify.accessToken},
		success: function(data, textStatus) {
			console.log("SUCCESS");
			printAttempt(data["items"]);
		},
		error: function(textStatus, errorThrown) {
			console.log("error?");

		}
	});
}

// HTML RELATED

function btn_login() { spotifyAuth(); }

function hideLogin() {
	if (spotify.accessToken != "")
		$(".full-page-cover").css("display", "none");
}

function printSectionSelection() {
	$(`nav li`).removeClass("is-active");
	$(`nav li:nth-child(${section})`).addClass("is-active");
}

function printUser(name, image) {
	$(".user img").attr("src", image).removeClass("is-hidden");
	$(".user p").text(name);
}

function printAttempt(data) {
	var list = [];
	var template = $(".item-tile")[0].outerHTML;

	for (i in data) {
		var holder = $($.parseHTML(template));
		holder.find("img").attr("src", data[i]["images"][0]["url"]);
		let name = data[i]["name"];
		if (name.length > 25)
			name = name.substr(0, 25) + "...";
		holder.find("p span").text(name);
		if (data[i]["public"])
			holder.addClass("is-public");
		else holder.removeClass("is-public");
		list.push(holder);
	}

	console.log(list);

	$(".content").append(list);
}