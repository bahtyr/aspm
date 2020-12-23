let playlists = [];
let playlistsProtected = []; // Keeps the initial playlist, in case the user turns off all the filters, the list would be empty
let selectedPlaylistID;
let selectedPlaylistIndex;
let showPrivate = true;
let showPublic = true;

$(function() {

	$("#btn-how-to").click(() => {
		$(".description-wrapper").toggleClass("is-gone");
		if ($(".description-wrapper").hasClass("is-gone"))
			$("#btn-how-to p").text("Show How-To");
		else $("#btn-how-to p").text("Hide How-To");
	});

	if (isLoggedIn()) myTasks();
	else loginCallback = myTasks;
});

function myTasks() {
	requestCurrentUserPlaylists()
		.then((result) => {
			playlistsProtected = result;
			printPlaylistsHandler(result);
			listenImagePicker();
			initButtons();
		})
		.catch((error) => {});
}

function initButtons() {
	$(".radio-wrapper:nth-child(1) p").click(function() {
		if ($(this).index() > 0) {
			$(this).toggleClass("is-active");
			if ($(this).index() == 1)
				showPrivate = !showPrivate;
			else if ($(this).index() == 2)
				showPublic = !showPublic;

			printPlaylistsHandler(playlistsProtected);
		}
	});
}

// Do necessary things to print playlists.
function printPlaylistsHandler(data) {
	$(".image-item").off("click"); // remove listeners to prevent adding multiple listeners
	$(".image-item:not(.is-gone)").remove(); // remove every item besides the teamplate
	playlists = []; // remove existing items

	data.forEach(item => {
		if (user.id == item["owner"]["id"]) {
			if (showPublic && showPrivate) playlists.push(item);
			else if (showPublic && !showPrivate && item["public"] == true) playlists.push(item);
			else if (!showPublic && showPrivate && item["public"] == false) playlists.push(item);
		}
	});

	printPlaylists(playlists);
	listenPlaylistClick();
}

// Trigger image picker on click.
function listenPlaylistClick() {
	$(".image-item").click(function() {
		let i = $(this).index() - 1; //substract hidden element
		selectedPlaylistID = playlists[i]["id"];
		selectedPlaylistIndex = i;
		$("#input-image-picker").click();
	});
}

// Load a user selected image, validate and update playlist cover.
function listenImagePicker() {
	$("#input-image-picker").change(function() {
		let f = $(this)[0].files[0];
		$(this).val(null); //reset file picker
		
		showWarning("Loading your image.", false);
		promieFileBase64(f) //read image (to base64)
			.then(result => {
				let img = new Image();
				img.src = result;
				img.onload = () => { //load image to validate
					if (validateNewPlaylistImage(f["type"], f["size"], img.width, img.height)) {
						putPlaylistCover(selectedPlaylistID, result.substr(23))
							.then(() => {
								showWarning("Successfully updated playlist cover.", true);
								$(`.image-item:nth-child(${selectedPlaylistIndex + 2}) img`).attr("src", result);
							})
							.catch((error) => showWarning("Failed to update playlist cover.", true));
					}
				}
			})
			.catch(error => {
				showWarning("Failed to upload selected image.", true);
				console.log("Promise failed to read file.");
				console.log(error);
			});
	});
}

// Check if the loaded image meets Spotify's specifications
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

function promieFileBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload =  () => resolve(reader.result);
		reader.onerror = error => reject(error);
	});
}