let currentTrack = {name: "", artists: "", image: "", uri: ""};
let savedPlaylists = [];

$(function() {
	console.log(`Run "reset();" function to clear chosen playlists.`)
	if (!isLoggedIn()) return;

	getCurrentlyPlaying();

	if (localStorage.pautoSavedPlaylists != null) {
		savedPlaylists = JSON.parse(localStorage.pautoSavedPlaylists);
		printSavedPlaylists(savedPlaylists);
	}

	loadPlaylists();
	// => printPlaylistsHandler(result);
	// // => listenPlaylistItemClicks();
	// //initFilterViewButtons();

	$(".icon-player-refresh").click(() => getCurrentlyPlaying());
	$(".p-auto__item-add").click(() => showModal(true));
	setTimeout(() => getCurrentlyPlaying(), 30000);
});

// ---------------------------------------------------------- get currently playing track & info

function getCurrentlyPlaying() {
	apiGetCurrentlyPlayingTrack()
		.then((data) => {
			if (data == null || data.item == null) {
				return;
			}

			currentTrack.name = data.item.name;
			currentTrack.uri = data.item.uri;
			currentTrack.artists = "";
			for (i in data.item.artists) {
				if (currentTrack.artists.length > 0)
					currentTrack.artists += ", ";
				currentTrack.artists += data.item.artists[i].name;
			}

			currentTrack.image = data.item.album.images[data.item.album.images.length - 2].url;

			$("#p-auto__player__track__text").html(`${currentTrack.name}<span> &bull; ${currentTrack.artists}`);
			$("#p-auto__player__track__image").attr("src", currentTrack.image);



			if (data.context == null)
				currentTrack.contextType = "library";
			else {
				currentTrack.contextType = data.context.type;

				if (currentTrack.contextType == "playlist") {
					let uri =  data.context.uri.split(':');
					currentTrack.playlistID = uri[uri.length - 1];
					loadCurrentPlayingPlaylist();
				}
			}

			//max text length ??
		})
		.catch((error) => {
			console.log(error);
		});
}

function loadCurrentPlayingPlaylist() {
	apiGetPlaylistInfo(currentTrack.playlistID, "")
		.then((data) => {
			currentTrack.playlistImage = getAnImageFromArray(data.images);
			currentTrack.playlistName = data.name;
			currentTrack.playlistOwnerName = data.owner.display_name;
			if (data.owner.display_name == null || data.owner.display_name == "")
				currentTrack.playlistOwnerName = data.owner.id;

			if (currentTrack.playlistImage != null)
				$("#p-auto__player__playlist__image").attr('src', currentTrack.playlistImage);
			$("#p-auto__player__playlist__text").html(`${currentTrack.playlistName}<span> &bull; ${currentTrack.playlistOwnerName}`);

		})
		.catch((error) => {
			console.log(error);
		});
}

// ---------------------------------------------------------- area reserved for playlist selection

let playlists = [];
let playlistsProtected = []; // Keeps the initial playlist, in case the user turns off all the filters, the list would be empty

let filters = {private: true, public: true, view: "large"};

function loadPlaylists() {
	updateProgressBar(2.5, 4);
	apiGetMyPlaylists()
		.then((result) => {
			updateProgressBar(4, 4);

			playlistsProtected = result;
			
			printPlaylistsHandler(result);
			// => listenPlaylistItemClicks();
			initFilterViewButtons();
		})
		.catch((error) => console.log("err: load playlists"));
}

function printPlaylistsHandler(data) {
	$("#p-auto__new-playlists-list .item").off("click"); // remove listeners to prevent adding multiple listeners
	$("#p-auto__new-playlists-list .item:not(.is-gone)").remove(); // remove every item besides the teamplate
	playlists = []; // remove existing items

	data.forEach(item => {
		if (user.id == item.owner.id) {
			if (filters.public && filters.private) playlists.push(item);
			else if (filters.public && !filters.private && item.public == true) playlists.push(item);
			else if (!filters.public && filters.private && item.public == false) playlists.push(item);
		}
	});

	printPlaylists(playlists, 0, 0, "#p-auto__new-playlists-list");
	listenPlaylistItemClicks();
}

/* -------------------------------- */
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
		const list = $("#p-auto__new-playlists-list");

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
	$("#p-auto__new-playlists-list .item").click(function() {
		let i = $(this).index() - 1; // substract template element
		// let itemIndex = i + 2;
		// let playlistIndex = i;
		addItemToSavedPlaylists(i);
		showModal(false);
	});
}

// ------------------------------------------------------------ saved playlists

function addItemToSavedPlaylists(playlistIndex) {
	let isDupe = false;
	for (let i = 0; i < savedPlaylists.length; i++) {
		if (savedPlaylists[i].id == playlists[playlistIndex].id)
			isDupe = true;
	}

	if (!isDupe) {
		savedPlaylists.push({
			id: playlists[playlistIndex].id,
			uri: playlists[playlistIndex].uri,
			name: playlists[playlistIndex].name,
			image: getAnImageFromArray(playlists[playlistIndex].images),
			public: playlists[playlistIndex].public,
		});

		printSavedPlaylists([savedPlaylists[savedPlaylists.length - 1]]);

		localStorage.setItem("pautoSavedPlaylists", JSON.stringify(savedPlaylists));
	}
}

function printSavedPlaylists(items) {
	let list = [];
	const template = $(".item")[0].outerHTML;

	for (let i = 0; i < items.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		// IMAGE
		if (items[i].image != null)
			holder.find(".image").attr("src", items[i].image);
		else { 
			holder.find(".image").removeAttr("src", "");
			holder.find(".image").addClass("is-hidden");
		}
		
		// NAME
		let name = items[i].name;
		if (name.length > 30)
			name = name.substr(0, 30) + "...";
		holder.find(".text").text(name);

		// IS PRIVATE / PUBLIC
		if (items[i].public)
			holder.addClass("is-public");
		else holder.removeClass("is-public");

		list.push(holder);
	}

	for (let i in list) {
		$(list[i]).insertBefore(".p-auto__item-add");
	}

	initSavedPlaylistClickListeners();
}

// -------------------------------------------------------------- 

function initSavedPlaylistClickListeners() {
	$("#p-auto__saved-playlists-list .item:not(.p-auto__item-add)").off("click");
	$("#p-auto__saved-playlists-list .item:not(.p-auto__item-add)").click(function() {
		let i = $(this).index() - 1; // substract template element
		// let itemIndex = i + 2;
		// let playlistIndex = i;
		apiAddTracksToPlaylist(savedPlaylists[i].id, [currentTrack.uri])
		.then((data) => {
			showWarning(`Track added to ${savedPlaylists[i].name}`, true);
		})
		.catch((error) => {
			console.log(error);
			showWarning(`Failed to add track to ${savedPlaylists[i].name}`, true);
		});
	});
}

function reset() {
	localStorage.removeItem("pautoSavedPlaylists");
}