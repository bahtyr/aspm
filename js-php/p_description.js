let playlists = [];
let playlistsProtected = []; // Keeps the initial playlist, in case the user turns off all the filters, the list would be empty
let selectedPlaylistID;
let selectedPlaylistIndex;
let showPrivate = true;
let showPublic = true;

$(function() {
	if (isLoggedIn()) myTasks();
	else loginCallback = myTasks;
});

function myTasks() {
	apiGetMyPlaylists()
		.then((result) => {
			playlistsProtected = result;
			printPlaylistsHandler(result);
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

	$("#btn-cancel").click(() => {
		$(".modal").addClass("is-hidden");
		$(".modal input").val("");
	});
	$("#btn-save").click(() => doSave());
}

// Do necessary things to print playlists.
function printPlaylistsHandler(data) {
	$(".image-item").off("click"); // remove listeners to prevent adding multiple listeners
	$(".image-item:not(.is-gone)").remove(); // remove every item besides the template
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
		$(".modal").removeClass("is-hidden");
		loadPlaylistInfo(selectedPlaylistID);
	});
}

function loadPlaylistInfo(playlistID) {
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

function doSave() {
	apiUpdatePlaylistInfo(selectedPlaylistID, $("#modal-text1").val(), $("#modal-text2").val())
		.then((data) => {
			$(".modal").addClass("is-hidden");
			$(`.image-item:nth-child(${selectedPlaylistIndex+2}) p span`).text($("#modal-text1").val());
			showWarning("Playlist updated successfully.", true);
		})
		.catch((error) => {
			console.log(error);
			showWarning("An error occured.", true);
		})
}