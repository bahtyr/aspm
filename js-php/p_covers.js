let playlists = [];
let playlistsProtected = []; // Keeps the initial playlist, in case the user turns off all the filters, the list would be empty
let selectedPlaylistID;
let selectedPlaylistIndex;
let showPrivate = true;
let showPublic = true;
let isImageUpdated = false;
let imageHolder = "";

$(function() {

	$(".popup-page").removeClass("is-gone");
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
	apiGetMyPlaylists()
		.then((result) => {
			playlistsProtected = result;
			printPlaylistsHandler(result);
			listenImagePicker();
			initButtons();
		})
		.catch((error) => {});
}

function loadPlaylistInfo(playlistID) {
	if (playlists[selectedPlaylistIndex]['images'].length > 0) {
		$(".popup-page img").removeClass("is-hidden");
		$(".popup-page img").attr("src", playlists[selectedPlaylistIndex]['images'][0]["url"]);
	}

	apiGetPlaylistInfo(playlistID)
		.then((data) => {
			$("#modal-text1").val(data["name"]);
			$("#modal-text2").val(data["description"]);
		})
		.catch((error) => {
			console.log(error);
			showWarning("An error occured.", true);
		});
}

function initButtons() {
	// filters
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

	// edit info popup page
	$(".popup-page .image-wrapper").click(() => $("#input-image-picker").click());
	$("#btn-cancel").click(() => {
		$(".popup-page").addClass("is-hidden");
		$(".popup-page img").addClass("is-hidden");
		$(".popup-page img").attr("src", "");
		$(".popup-page input").val("");
		isImageUpdated = false;
	});
	$("#btn-save").click(() => doSave());
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
		$(".popup-page").removeClass("is-hidden");
		loadPlaylistInfo(selectedPlaylistID);
	});
}

// Load a user selected image, validate and update playlist cover.
function listenImagePicker() {
	$("#input-image-picker").change(function() {
		let f = $(this)[0].files[0];
		$(this).val(null); //reset file picker
		
		showWarning("Loading your image.", true);
		promieFileBase64(f) //read image (to base64)
			.then(result => {
				let img = new Image();
				img.src = result;
				img.onload = () => { //load image to validate
					if (validateNewPlaylistImage(f["type"], f["size"], img.width, img.height)) {
						isImageUpdated = true;
						imageHolder = result;
						// show image no my popup page, before submitting
						$(".popup-page img").removeClass("is-hidden");
						$(".popup-page img").attr("src", result);
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

function doSave() {
	if ($("#modal-text1").val() == null || !$("#modal-text1").val().trim()) {
		showWarning("Playlist name can't be empty", true);
		return;
	}

	if (isImageUpdated) {
		apiUploadPlaylistCover(selectedPlaylistID, imageHolder.substr(23))
			.then(() => {
				showWarning("Successfully updated playlist cover.", true);
				submitNewChanges();
			})
			.catch((error) => showWarning("Failed to update playlist cover.", true));
	} else {
		submitNewChanges();
	}
}

function submitNewChanges() {
	showWarning("Upading playlist information.", false);
	let desc_ = $("#modal-text2").val();
	apiUpdatePlaylistInfo(selectedPlaylistID, $("#modal-text1").val(), desc_)
		.then((data) => {
			$(".popup-page").addClass("is-hidden");
			$(`.image-item:nth-child(${selectedPlaylistIndex+2}) p span`).text($("#modal-text1").val()); // update playlist title on our main grid
			if (isImageUpdated) {
				$(`.image-item:nth-child(${selectedPlaylistIndex + 2}) img`).attr("src", imageHolder);
				playlists[selectedPlaylistIndex]["images"] = [{"url": imageHolder}];
			}
			playlists[selectedPlaylistIndex]["name"] = $("#modal-text1").val();

			imageHolder = "";
			isImageUpdated = false;
			showWarning("Playlist updated successfully.", true);
		})
		.catch((error) => {
			console.log(error);
			showWarning("An error occured.", true);
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