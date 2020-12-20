const isLocal = false;
//api
let spotify = { accessToken: ""};
let user = { name: "", id: ""};
//page
let section = 2;
//playlist
let playlists = [];
let selectedPlaylistID;

$(function() {
	// loadTempData();
	check_params();
	// saveTempData();
	hideLogin();
	printSectionSelection();

	if (spotify.accessToken != "") {
		getMe();
		getMyPlaylists(null);
		listenImagePick();
		// listenPlaylistClick(); -- called @printPlaylists()
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
		localStorage.setItem("temp", JSON.stringify(spotify));
	}
}

function loadTempData() {
	if (localStorage.temp != null)
		spotify = JSON.parse(localStorage.temp);
}

// API

function spotifyAuth() {
	const client_id = "818359d1ffe44cc8856e83f047b1840a";
	const redirect_uri = !isLocal ? "https://aspm.bahtyr.com/playlist-cover.html" : "http://localhost/aspm/playlist-cover.html";
	const scope = "user-read-private user-read-email ugc-image-upload playlist-modify-public playlist-modify-private";

	const params = `client_id=${client_id}&response_type=token&redirect_uri=${redirect_uri}&scope=${scope}&show_dialog=true`;
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
			user.id = data["id"];
			printUser(data["display_name"], data["images"][0]["url"]);
		},
		error: function(textStatus, errorThrown) {
			console.log("user error");

		}
	});
}

function getMyPlaylists(url) {
	// url is used to call this playlist again using the "next link" provided in the link
	// url given by spotify contains params, don't put anything if we are using url param
	$.ajax({
		url: url != null ? url : "https://api.spotify.com/v1/me/playlists",
		data: url != null ? "" : {limit: 50, offset: 0},
		type: "GET",
		headers: {"Authorization": "Bearer " + spotify.accessToken},
		success: function(data, textStatus) {
			if (data["next"] != null)
				getMyPlaylists(data["next"]);

			let lastItem = (playlists.length > 1) ? playlists.length : 0;
			data["items"].forEach(item => {
				if (user.id == item["owner"]["id"])
					playlists.push(item)
			});
			printPlaylists(playlists, lastItem);
		},
		error: function(textStatus, errorThrown) { }
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

// LISTENERS

function listenPlaylistClick() {
	//Add listener to playlist items to trigger image picker on click.
	$(".item-tile").click(function() {
		let i = $(this).index() - 1; //substract hidden element
		selectedPlaylistID = playlists[i]["id"];
		$("#input-image-picker").click();
	});
}

function listenImagePick() {
	//Add listener to image-picker to load the image, validate and update playlist cover.
	$("#input-image-picker").change(function() { //changing function() to => breaks '$(this)'
		let f = $(this)[0].files[0];
		$(this).val(null); //reset file picker
		// TODO show loading
		promieFileBase64(f) //read image (to base64)
			.then(result => {
				let img = new Image();
				img.src = result;
				img.onload = () => { //load image to validate
					if (validateNewPlaylistImage(f["type"], f["size"], img.width, img.height)) //finally put
						putPlaylistCover(selectedPlaylistID, result.substr(23));
				}
			})
			.catch(error => {
				window.alert("Failed to upload selected image.");
				console.log("Promise failed to read file.");
				console.log(error);
			});
	});
}

function validateNewPlaylistImage(fileType, fileSize, imgWidth, imgHeight) {
	let isOK = true;
	let msg = "Error";
	const err = {
		fileType: "Image must be in JPEG format, it is ",
		fileSize: "File size must be less then 250KB, it is ",
		imgSize: "Image is too small, it must be at least 300x300, it is "
	};

	if (fileType.substr(6) != "jpeg") {
		msg += "\r\n" + err.fileType + fileType.substr(6) + ".";
		isOK = false; 
	}

	if (fileSize > 256000) {
		msg += "\r\n" + err.fileSize + Math.floor(fileSize / 1000) + "KB.";
		isOK = false;
	}

	if (imgWidth < 300 && imgHeight < 300) {
		msg += "\r\n" + err.imgSize + imgWidth + "x" + imgHeight + ".";
		isOK = false;
	}

	if (!isOK) 
		window.alert(msg);
	return isOK;
}

// BUTTON ASSIGNMENTS

function btn_login() { spotifyAuth(); }

// HTML MODIFICATIONS

function hideLogin() {
	if (spotify.accessToken != "")
		$(".full-page-cover").css("display", "none");
}

function printSectionSelection() {
	$(`nav li`).removeClass("is-active");
	$(`nav li:nth-child(${section})`).addClass("is-active");
}

function printUser(name, image) {
	$(".header.user img").attr("src", image).removeClass("is-hidden");
	$(".header.user p").text(name);
}

function printPlaylists(data, offset) {
	//this function can be called multiple times for the same container
	//clear existing filler items to append more
	$(".content .item-tile.is-filler").each(function() {
		$(this).remove();
	});

	//remove existing click listeners to not dupe it again
	$(".content .item-tile").off("click");

	let list = [];
	const template = $(".item-tile")[0].outerHTML;

	for (let i = offset; i < data.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		if (data[i]["images"].length > 0)
			holder.find("img").attr("src", data[i]["images"][0]["url"]);
		else { 
			holder.find("img").removeAttr("src", "");
			holder.find("img").addClass("is-hidden");
		}
		
		let name = data[i]["name"];
		if (name.length > 25)
			name = name.substr(0, 25) + "...";
		holder.find("p span").text(name);

		if (data[i]["public"])
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

	$(".content").append(list);

	listenPlaylistClick();
}

// FUNCTIONS

function promieFileBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload =  () => resolve(reader.result);
		reader.onerror = error => reject(error);
	});
}