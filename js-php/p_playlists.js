// let isImageUpdated = false;
// let imageHolder = "";

let playlists = [];
let playlistsProtected = []; // Keeps the initial playlist, in case the user turns off all the filters, the list would be empty
let selection = {playlistID: "", playlistIndex: 0};
let filters = {private: true, public: true};

$(function() {
	if (!isLoggedIn()) return;

	loadPlaylists();
});

function loadPlaylists() {
	updateProgressBar(2.5, 4);
	apiGetMyPlaylists()
		.then((result) => {
			updateProgressBar(4, 4);
			playlistsProtected = result;
			printPlaylistsHandler(result);
			listenItemClicks();
			initButtons();
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
	// listenPlaylistClick();
}

function initButtons() {

	$(".filter").click(function(e) {
		$(this).toggleClass("is-active");

		if (e.target.id == "filter-private" || e.target.parentElement.id == "filter-private") {
			filters.private = !filters.private;
			printPlaylistsHandler(playlistsProtected);
		} else if (e.target.id == "filter-public" || e.target.parentElement.id == "filter-public") {
			filters.public = !filters.public;
			printPlaylistsHandler(playlistsProtected);
		}


		if (!filters.private && !filters.public) {
			if (e.target.id == "filter-private" || e.target.parentElement.id == "filter-private") {
				filters.private = false;
				filters.public = true;
				$(".filter-public").addClass("is-active");
				printPlaylistsHandler(playlistsProtected);
			} else if (e.target.id == "filter-public" || e.target.parentElement.id == "filter-public") {
				filters.private = true;
				filters.public = false;
				$(".filter-private").addClass("is-active");
				printPlaylistsHandler(playlistsProtected);
			}
		}
	});

	$(".view").click(function() {
		$(".view").toggleClass("is-active");

		if ($(".item-list").hasClass("medium"))
			$(".item-list").removeClass("medium");
		else $(".item-list").addClass("medium"); 

		if ($(".item-list").hasClass("large"))
			$(".item-list").removeClass("large");
		else $(".item-list").addClass("large"); 
	});
}

function listenItemClicks() {
	$(".item").click(function() {
		let i = $(this).index() - 1; // substract template element
		selection.playlistID = playlists[i].id;
		selection.playlistIndex = i;
		selection.itemIndex = i;

		showModal(true);

		$(".modal__playlist-image").attr("src", playlists[selection.playlistIndex].images[0].url);
		$(".modal__playlist-name").text(playlists[selection.playlistIndex].name);

		$(".modal__pl-edit__image").attr("src", playlists[selection.playlistIndex].images[0].url);
		$(".modal__pl-edit__name").val(playlists[selection.playlistIndex].name);
		$(".modal__pl-edit__desc").val(playlists[selection.playlistIndex].description);
	});
}