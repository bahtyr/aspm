let playlists = [];
let playlistsProtected = []; // Keeps the initial playlist, in case the user turns off all the filters, the list would be empty

let selection = {playlistID: "", playlistIndex: 0, itemIndex: 0};
let filters = {private: true, public: true, view: "large"};

let newImage = "";
let isImageUpdated = false;

let modal = new Modal();

$(function() {
	if (!isLoggedIn()) return;

	loadPlaylists();
	// => printPlaylistsHandler(result);
	// // => listenPlaylistItemClicks();
	// //initFilterViewButtons();
	// //listenContextActions();
	// //listenEditActions();

	modal.addStack(".modal__pl-context", true);
	modal.addStack(".modal__pl-edit", false);
});

function loadPlaylists() {
	updateProgressBar(2.5, 4);
	apiGetMyPlaylists()
		.then((result) => {
			updateProgressBar(4, 4);

			playlistsProtected = result;
			
			printPlaylistsHandler(result);
			// => listenPlaylistItemClicks();
			initFilterViewButtons();
			listenContextActions();
			listenEditActions();
		})
		.catch((error) => console.log("err: load playlists"));
}

function printPlaylistsHandler(data) {
	$(".item").off("click"); // remove listeners to prevent adding multiple listeners
	$(".item:not(.is-gone)").remove(); // remove every item besides the teamplate
	playlists = []; // remove existing items

	data.forEach(item => {
		if (user.id == item.owner.id) {
			if (filters.public && filters.private) playlists.push(item);
			else if (filters.public && !filters.private && item.public == true) playlists.push(item);
			else if (!filters.public && filters.private && item.public == false) playlists.push(item);
		}
	});

	printPlaylists(playlists);
	listenPlaylistItemClicks();
}

/* ---------------------------------------------------------------------------------------- */
/* filters and list clicks */

function initFilterViewButtons() {
	$(".filter").click(function(e) {
		$(this).toggleClass("is-active");

		let id = e.target.id != null && e.target.id != '' ? e.target.id : e.target.parentElement.id;

		if (id == "filter-private" || id == "filter-private") {
			filters.private = !filters.private;
		} else if (id == "filter-public" || id == "filter-public") {
			filters.public = !filters.public;
		}

		// if both of the filter are disabled, enable opposite of selection
		if (!filters.private && !filters.public) {
			if (id == "filter-private" || id == "filter-private") {
				filters.private = false;
				filters.public = true;
				$(".filter-public").addClass("is-active");
			} else if (id == "filter-public" || id == "filter-public") {
				filters.private = true;
				filters.public = false;
				$(".filter-private").addClass("is-active");
			}
		}

		printPlaylistsHandler(playlistsProtected);
	});

	$(".view").click(function() {
		const v = $(".view");
		const list = $(".item-list");

		v.toggleClass("is-active");

		if (list.hasClass("medium"))
			list.removeClass("medium");
		else list.addClass("medium"); 

		if (list.hasClass("large"))
			list.removeClass("large");
		else list.addClass("large"); 

		// keep the value to save & load on next visits of the page
		if (list.hasClass("medium"))
			filters.view = "medium";
		else filters.view = "large";
	});
}

function listenPlaylistItemClicks() {
	$(".item").click(function() {
		let i = $(this).index() - 1; // substract template element
		selection.playlistID = playlists[i].id;
		selection.playlistIndex = i;
		selection.itemIndex = i + 2;

		modal.show();

		// put info on context menu
		$(".modal__playlist-image").attr("src", playlists[selection.playlistIndex].images[0].url);
		$(".modal__playlist-name").text(playlists[selection.playlistIndex].name);

		// put info on edit menu
		$(".modal__pl-edit__image").attr("src", playlists[selection.playlistIndex].images[0].url);
		$(".modal__pl-edit__name").val(playlists[selection.playlistIndex].name);
		$(".modal__pl-edit__desc").val(playlists[selection.playlistIndex].description);

		// activate the right toggle
		if (playlists[selection.playlistIndex].public) {
			$("#toggle-public").addClass("is-active");
			$("#toggle-private").removeClass("is-active");
		} else {
			$("#toggle-public").removeClass("is-active");
			$("#toggle-private").addClass("is-active");
		}
	});
}

/* ---------------------------------------------------------------------------------------- */
/* modal actions */

function listenContextActions() {
	$(".btn-icon").click(function(e) {
		let id = e.target.id != null && e.target.id != '' ? e.target.id : e.target.parentElement.id;
		switch (id) {
			case "btn-share":
				if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) /* is mobile */
					navigator.share({ title: '', text: '', url: 'https://open.spotify.com/playlist/' + selection.playlistID});
				else navigator.clipboard.writeText('https://open.spotify.com/playlist/' + selection.playlistID);
				break;
			case "btn-edit":
				modal.showStack(".modal__pl-edit");
				modal.changeDismissAction(switchBackToContextModal);
				modal.hideDismissMesage(true);
				break;
			case "btn-details": /*TODO*/ break;
			case "btn-automation":
				window.location.href = '../auto.html?new=' + selection.playlistID;
				break;
			case "btn-compare":
				window.location.href = '../missing.html?a=' + selection.playlistID;
				break;
		}
	});
}

function listenEditActions() {
	
	// save
	$(".btn__pl-edit__save").click(() => validateAndUpdatePlaylist());

	// cancel
	$(".btn__pl-edit__cancel").click(() => switchBackToContextModal());

	// pick image
	$(".modal__pl-edit__image").click(() => $("#input__image-picker").click());

	// private / public
	$(".modal__pl-edit__toggle").click(() => $(".modal__pl-edit__toggle").toggleClass("is-active"));

	// file uploader
	$("#input__image-picker").change(function() {
		let f = $(this)[0].files[0];
		$(this).val(null); //reset file picker
		
		showWarning("Loading your image.", true);

		promieFileBase64(f) //read image (to base64)
			.then(result => {
				let img = new Image();
				img.src = result;
				img.onload = () => { //load image to validate
					if (validateImageFile(f["type"], f["size"], img.width, img.height)) {
						isImageUpdated = true;
						newImage = result;

						// show placholder?
						$(".modal__pl-edit__image").attr("src", result);
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

/* ---------------------------------------------------------------------------------------- */
/* edit data validation / post api */

function validateAndUpdatePlaylist() {

	if ($(".modal__pl-edit__name").val() == null || !$(".modal__pl-edit__name").val().trim()) {
		showWarning("Playlist name can't be empty", true);
		return;
	}

	if (isImageUpdated) {
		apiUploadPlaylistCover(selection.playlistID, newImage.substr(23))
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
	apiUpdatePlaylistInfo(selection.playlistID, $(".modal__pl-edit__name").val(), $(".modal__pl-edit__desc").val())
		.then((data) => {

			updatePlaylistLocally();
			switchBackToContextModal();

			newImage = ""; // reset
			isImageUpdated = false;

			showWarning("Playlist updated successfully.", true);
		})
		.catch((error) => {
			console.log(error);
			showWarning("An error occured.", true);
		});
}

// change playlist details wherever it's written
function updatePlaylistLocally() {
	const inputName = $(".modal__pl-edit__name");
	const inputDesc = $(".modal__pl-edit__desc");
	const togglePublic = $("#toggle-public");

	let name = inputName.val();
	let desc = inputDesc.val();
	let isPublic = togglePublic.hasClass("is-active");

	if (isImageUpdated)
		$(`.item:nth-child(${selection.itemIndex}) .image`).attr("src", newImage);
	
	$(`.item:nth-child(${selection.itemIndex}) .text`).text(name);

	if ($(`.item:nth-child(${selection.itemIndex})`).hasClass("is-public") != isPublic) // if public status is changed
		$(`.item:nth-child(${selection.itemIndex})`).toggleClass("is-public");

	if (isImageUpdated)
		$(`.modal__playlist-image`).attr("src", newImage);
	
	$(`.modal__playlist-name`).text(name);

	playlists[selection.playlistIndex].name = name;
	playlists[selection.playlistIndex].description = desc;
	playlists[selection.playlistIndex].public = isPublic;
	if (isImageUpdated)
		playlists[selection.playlistIndex].images = [{url: newImage}];
	
	//modal__pl-edit__image
	//modal__pl-edit__name
	//modal__pl-edit__desc
}

/* ---------------------------------------------------------------------------------------- */

// switch back to first modal
function switchBackToContextModal() {
	modal.showStack(".modal__pl-context");
	modal.resetDismissAction();
	modal.hideDismissMesage(false);
}

// check if the loaded image meets Spotify's requirements
function validateImageFile(fileType, fileSize, imgWidth, imgHeight) {
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