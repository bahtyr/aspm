/**
 * TODO
 * 
 * Other;
 * - CSS optimization / scaling for mobile devices.
 * 
 * Rules;
 * - rename rule's playlist id from "id" to "playlistID"
 * - rename rule's owner id from "id" to "ownerID"
 * - edit a rule / rules
 * - add multiple conditions to one rule
 * - rule type: artist
 * - batch rule creation
 * 
 * Rules QOI;
 * - show public / private icon for rules @printRules
 * - for .item.multi clicking on the body of the item triggers thumbsup (couldn't do css hover effect properly)
 * - add track anyway confirmation, if attempting to add to a rule which doesn't fit
 * - attempt to update playlist images / info for existing rules
 * - dont do anything if track is already added / removed @listenRuleClicks
 * - save rules to cloud and bind it with user id
 * - optional. don't remove track if at the beginning / end of the flow.
 */

let currentTrack = {name: "", artists: "", image: "", uri: ""};
let currentTrackBackup;
let savedPlaylists = [];
let rules = [];

let modalNewRule = new Modal("#modal__new-rule");
let modalPlaylistPicker = new Modal("#modal__playlist-picker");

$(function() {
	if (!isLoggedIn()) return;

	console.log(`Run "reset();" function to clear chosen playlists.`);

	// currently playing
	getCurrentlyPlaying();
	$(".icon-player-refresh").click(() => getCurrentlyPlaying());

	// load savedPlaylists[]
	if (localStorage.pautoSavedPlaylists != null) {
		savedPlaylists = JSON.parse(localStorage.pautoSavedPlaylists);
		printSavedPlaylists(savedPlaylists);
	}

	// load rules[]
	if (localStorage.pautoRules != null) {
		rules = JSON.parse(localStorage.pautoRules);
		printRules(rules);
	}

	loadPlaylists();

	listenNewButtonForSavedPlaylists();
	listenNewButtonForNewRule();
	initNewRuleModal();
});

// ---------------------------------------------------------- get currently playing track & info

/**
 * Get currently playing track.
 */
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

			currentTrack.image = getAnImageFromArray(data.item.album.images);

			$("#p-auto__player__track__text").html(`${currentTrack.name}<span> &bull; ${currentTrack.artists}`);
			$("#p-auto__player__track__image").attr("src", currentTrack.image);


			if (data.context == null) {
				currentTrack.contextType = "library";
				clearCurrentTrackPlaylistInfo();
			} else {
				currentTrack.contextType = data.context.type;

				if (currentTrack.contextType == "playlist") {
					let uri =  data.context.uri.split(':');
					currentTrack.playlistID = uri[uri.length - 1];
					loadCurrentPlayingPlaylist();
				} else clearCurrentTrackPlaylistInfo();
			}

			findMatchingRules();
			setTimeout(() => getCurrentlyPlaying(), 15000);
		})
		.catch((error) => {
			console.log(error);
		});
}

/**
 * Requests playlist information for currently playing track.
 */
function loadCurrentPlayingPlaylist() {
	apiGetPlaylistInfo(currentTrack.playlistID, "")
		.then((data) => {
			currentTrack.playlistID = data.id;
			currentTrack.playlistName = data.name;
			currentTrack.playlistImages = data.images;
			currentTrack.playlistDescription = data.description;
			currentTrack.playlistOwnerID = data.owner.id;
			currentTrack.playlistOwnerName = data.owner.display_name;
			currentTrack.playlistPublic = data.public;
			if (data.owner.display_name == null || data.owner.display_name == "")
				currentTrack.playlistOwnerName = data.owner.id;

			$("#p-auto__player__playlist__image").attr("src", getAnImageFromArray(data.images));
			$("#p-auto__player__playlist__text").html(`${currentTrack.playlistName}  &bull;  ${currentTrack.playlistOwnerName}`);

			findMatchingRules();
		})
		.catch((error) => {
			console.log(error);
		});
}

/**
 * Clears playlist info from currentTrack. Used when current track's context is unavailable.
 */
function clearCurrentTrackPlaylistInfo() {
	currentTrack.playlistID = "";
	currentTrack.playlistName = "";
	currentTrack.playlistImages = "";
	currentTrack.playlistDescription = "";
	currentTrack.playlistOwnerID = "";
	currentTrack.playlistOwnerName = "";
	currentTrack.playlistPublic = "";

	$("#p-auto__player__playlist__image").attr("src", getAnImageFromArray(null));
	$("#p-auto__player__playlist__text").html("Playlist &bull; Owner");
}

// ---------------------------------------------------------- load user's playlist

let playlists = [];
let playlistsProtected = []; // Keeps the initial playlist, in case the user turns off all the filters, the list would be empty
let filters = {private: true, public: true, view: "large"};
let selectedPlaylist = {};
let selectedPlaylistIndex;

/**
 * Loads every playlist of user.
 * Then calls the following actions; print playlist, set click listeners and initialize filter actions.
 */
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

/**
 * Handles playlist public / private filters then uses printPlaylists function from base.js to print.
 */
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

/* -------------------------------- filters and list clicks */

/**
 * Initializes filter actions such as user's public / private playlists and list view modes.
 */
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

/**
 * Save selected item info and hide playlist modal.
 * Actions regarding playlist selection should be done with modal.onDismiss() callback, initiliaze it after triggering modal.show().
 */
function listenPlaylistItemClicks() {
	$("#p-auto__new-playlists-list .item").click(function() {
		let i = $(this).index() - 1;
		
		/**
		 * i: index of selection according to playlists[]
		 * i + 2: index of selection for html element (one for template, one for html elements starting from 1)
		 */
		
		selectedPlaylist = playlists[i];
		selectedPlaylistIndex = i;

		modalPlaylistPicker.hide();
	});
}

// ------------------------------------------------------------ saved playlists

/**
 * Shows modalPlaylistPicker.
 * Adds the selected playlist to saved list, if it's not a duplicate.
 */
function listenNewButtonForSavedPlaylists() {
	$("#p-auto__saved-playlists-list .p-auto__item-add").click(function() {
		modalPlaylistPicker.show();
		modalPlaylistPicker.onDismiss(function() {
			if (selectedPlaylistIndex == null) return;

			// check if selected playlist already exist
			let isDupe = false;
			for (let i = 0; i < savedPlaylists.length; i++) {
				if (savedPlaylists[i].id == selectedPlaylist.id)
					isDupe = true;
			}

			if (!isDupe) {
				savedPlaylists.push(selectedPlaylist); // add to my array
				printSavedPlaylists([savedPlaylists[savedPlaylists.length - 1]]); // only print the selection
				localStorage.setItem("pautoSavedPlaylists", JSON.stringify(savedPlaylists)); // save it
			}

			selectedPlaylistIndex = null;
		});
	});
}

/**
 * Prints saved playlists and sets clicklisteners.
 * @param {object} item				Playlist object.
 */
function printSavedPlaylists(items) {
	let list = [];
	const template = $(".item")[0].outerHTML;

	for (let i = 0; i < items.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		holder.find(".image").attr("src", getAnImageFromArray(items[i].images));
		holder.find(".text").text(trimmedText(items[i].name, 30));
		if (items[i].public)
			holder.addClass("is-public");
		else holder.removeClass("is-public");

		list.push(holder);
	}

	for (let i in list) {
		$(list[i]).insertBefore("#p-auto__saved-playlists-list .p-auto__item-add");
	}

	initSavedPlaylistClickListeners();
}

/**
 * Adds current track to selected saved playlists.
 */
function initSavedPlaylistClickListeners() {
	$("#p-auto__saved-playlists-list .item:not(.p-auto__item-add)").off("click");
	$("#p-auto__saved-playlists-list .item:not(.p-auto__item-add)").click(function() {
		let i = $(this).index() - 1;
		addCurrentTrackToPlaylist(savedPlaylists[i]);
	});
}

// ------------------------------------------------------------ new rule

let newRule = {name: "", type: "", playlists: []};

/**
 * Shows modalNewRule.
 * If user is listening to a playlist, shows it as an radio input and adds it to newRule.playlists[]
 */
function listenNewButtonForNewRule() {
	// create new rule
	$("#p-auto__saved-rules-list .p-auto__item-add").click(function() {
		
		// get a backup of current playlist, in case it chagnes
		currentTrackBackup = null;
		if (currentTrack.contextType != null && currentTrack.contextType == "playlist") {
			currentTrackBackup = {
				contextType: currentTrack.contextType,
				playlistID: currentTrack.playlistID,
				playlistName: currentTrack.playlistName,
				playlistImages: currentTrack.playlistImages,
				playlistDescription: currentTrack.playlistDescription,
				playlistOwnerID: currentTrack.playlistOwnerID,
				playlistOwnerName: currentTrack.playlistOwnerName,
				playlistPublic: currentTrack.playlistPublic};
		}

		// reset previous actions on the modal
		clearNewRulePlaylistSelection();
		$("#modal__new-rule .modal__input-text").val("");
		
		// if a currently playing from a playlist, show it, check it's radio option
		if (currentTrack.contextType != null && currentTrack.contextType == "playlist") {
			$("#modal__new-rule label[for='rule-type-1']").text(currentTrackBackup.playlistName);
			$("#modal__new-rule input#rule-type-1").prop('disabled', false);
			$("#modal__new-rule input#rule-type-1").prop('checked', true);
			createNewRulePlaylistLine({heading: "add to", text: "Select a playlist"});
			newRule.playlists.push(getAsPlaylist(currentTrackBackup, "currentTrack"));
			newRule.type = "current";

			if (currentTrack.playlistOwnerID != user.id) {
				$("#modal__new-rule label[for='rule-type-2']").text(`${currentTrackBackup.playlistOwnerName}'s playlists`);
				$("#modal__new-rule input#rule-type-2").prop('disabled', false);
			} else {
				$("#modal__new-rule label[for='rule-type-2']").text("a user's playlists");
				$("#modal__new-rule input#rule-type-2").prop('disabled', true);
			}
		} else {
			$("#modal__new-rule label[for='rule-type-1']").text("this playlist");
			$("#modal__new-rule label[for='rule-type-2']").text("a user's playlists");
			$("#modal__new-rule input#rule-type-1").prop('disabled', true);
			$("#modal__new-rule input#rule-type-2").prop('disabled', true);
			$("#modal__new-rule input#rule-type-4").prop('checked', true);
			createNewRulePlaylistLine({heading: "from", text: "Select a playlist"});
			newRule.type = "mine";
		}

		initNewRulePlaylistLineListeners();

		modalNewRule.show();
	});
}

/**
 * Handles the following functions of newRuleModal;
 * Rule Type Radios: Listens to rule type changes. Creates required lines, clears previous selection.
 * Save Button: Attempts to create rule if valid.
 * Cancel Button: Hides modalNewRule.
 */ 
function initNewRuleModal() {
	$("#modal__new-rule input[name='rule-type']").on("change", function() {
		newRule.type = this.value;

		clearNewRulePlaylistSelection();
		
		switch (this.value) {
			case "current":
			case "person":
			case "notmine": createNewRulePlaylistLine({heading: "add to", text: "Select a playlist"}); break;
			case "mine": createNewRulePlaylistLine({heading: "from", text: "Select a playlist"}); break;
		}

		initNewRulePlaylistLineListeners();
	});

	$("#btn__new-rule__save").click(function() {
		newRule.name = $("#modal__new-rule .modal__input-text").val();
		if (newRule.name == "") return;
		if (newRule.playlists == [] || newRule.playlists.length == 0) return;
		if (newRule.type == "mine" && newRule.playlists.length == 1) return;
		if (newRule.type == "person") 
			newRule.playlistOwner = currentTrackBackup.playlistOwnerID;
		 
		// abort if a rule with the same name exists
		for (let i in rules) {
			if (newRule.name == rules[i].name)
				return;
		}

		rules.push(Object.assign({}, newRule));

		// save rules locally
		localStorage.setItem("pautoRules", JSON.stringify(rules));

		// print it to rules list
		printRules([rules[rules.length - 1]]);

		modalNewRule.hide();
	});

	$("#btn__new-rule__cancel").click(() => modalNewRule.hide());
}

/**
 * Resets selected playlists from newRule and removes all .rule-playlist-line elements from modalNewRule.
 */ 
function clearNewRulePlaylistSelection() {
	// keep the first playlist, which is currently playling playlist in the array.
	newRule.playlists = [];

	if (newRule.type == "current")
		newRule.playlists.push(getAsPlaylist(currentTrackBackup, "currentTrack"));

	$(".rule-playlist-line:not(.js-template)").remove();
}

/**
 * Creates new .rule-playlist-line element(s) for modalNewRule.
 * @param {object} item				{heading: purpose of the section such as (from, add to, etc..), text: Either name of the playlist or a message such as "Select a playlist"}
 */ 
function createNewRulePlaylistLine(...items) {
	let list = [];
	const template = $(".rule-playlist-line.js-template")[0].outerHTML;

	for (let i in items) {
		let holder = $($.parseHTML(template));
		holder.removeClass("js-template");
		holder.find("p:nth-child(1)").text(items[i].heading);
		holder.find("p:nth-child(2)").text(trimmedText(items[i].text));
		list.push(holder);
	}

	$(".playlist-line-container").append(list);
}

/**
 * Listens to .rule-playlist-line to show modalPlaylistPicker.
 * Then changes the text to selected playlist.
 * Adds the selection to newRule.playlists[].
 * If chosen element is the last, calls createNewRulePlaylistLine().
 */
function initNewRulePlaylistLineListeners() {
	$(".rule-playlist-line").off("click");
	$(".rule-playlist-line").click(function() {
		let i = $(this).index() - 1;

		modalPlaylistPicker.show();

		modalPlaylistPicker.onDismiss(function() {
			if (selectedPlaylistIndex == null) return;

			// loop to check if selection is dupe
			let isDupe = false;
			for (let j in newRule.playlists) {
				if (newRule.playlists[j].id == selectedPlaylist.id) {
					selectedPlaylistIndex == null;
					return;
				}
			}

			// show selection
			$(`.rule-playlist-line:nth-child(${i + 2}) img`).attr("src", getAnImageFromArray(selectedPlaylist.images, 2));
			$(`.rule-playlist-line:nth-child(${i + 2}) p:nth-child(2)`).text(selectedPlaylist.name);

			// add selection to the array
			let arrPos = i;
			if (newRule.type == "current") arrPos++; // 1st spot is reserved for the currently playing playlist
			newRule.playlists.splice(arrPos, 1, getAsPlaylist(selectedPlaylist));

			let createNewLine = false;
			if (newRule.type == "current") 
					createNewLine = $(".rule-playlist-line").length == newRule.playlists.length;
			else createNewLine = $(".rule-playlist-line").length - 1 == newRule.playlists.length;

			if (createNewLine) {
				let str = "then";
				if (i == 0) str = "add to";
				createNewRulePlaylistLine({heading: str, text: "Select playlist"});
				initNewRulePlaylistLineListeners();
			}

			selectedPlaylistIndex == null;
		});
	});
}


/**
 * Returns a playlist object from currentTrack, or minimizes spotify's playlist object.
 */
function getAsPlaylist(obj, sourceType) {
	switch (sourceType) {
		default:
		case "spotifyPlaylist": return {
			id: obj.id,
			name: obj.name,
			images: obj.images,
			description: obj.description,
			ownerName: obj.owner.display_name,
			owner: obj.owner.id,
			public: obj.public};

		case "currentTrack": return {
			id: obj.playlistID,
			name: obj.playlistName,
			images: obj.playlistImages,
			description: obj.playlistDescription,
			ownerName: obj.playlistOwnerName,
			owner: obj.playlistOwnerID,
			public: obj.playlistPublic};
	}
}

// ------------------------------------------------------------

/**
 * Prints all rules and sets click listeners then calls findMatchingRules().
 * @param {object} item				Rule object.
 */ 
function printRules(items) {
	let list = [];
	const template = $("#p-auto__saved-rules-list .item.js-template")[0].outerHTML;
	const imageTemplate = $("#p-auto__saved-rules-list .item.js-template .image-wrapper")[0].outerHTML;

	for (let i in items) {
		let holder = $($.parseHTML(template));
		holder.removeClass("js-template");
		holder.find("p").text(items[i].name);

		if ((items[i].playlists.length == 2 && items[i].playlists[0].owner != user.id)
			|| (items[i].playlists.length == 1 && (items[i].type == "person") || (items[i].type == "notmine"))) {
			//this is a single item
			holder.addClass("single");
			holder.find(".like-btn-wrapper").remove();
			holder.find("img").attr("src", getAnImageFromArray(items[i].playlists[items[i].playlists.length - 1].images)); 
		} else {
			holder.find(".image-wrapper").remove(); //remove this, image elements will be created and added in the loop
			for (let j in items[i].playlists) {
				let imgHolder = $($.parseHTML(imageTemplate));
				imgHolder.find("img").attr("src", getAnImageFromArray(items[i].playlists[j].images));
				imgHolder.insertBefore(holder.find(".like-btn-wrapper"));
			}
		}

		list.push(holder);
	}

	for (let i in list) {
		$(list[i]).insertBefore("#p-auto__saved-rules-list .p-auto__item-add");
	}

	findMatchingRules();
	listenRuleClicks();
}

/**
 * Compares currentTrack vs rules, adds .disabled class if they don't match.
 */
function findMatchingRules() {
	for (let i = 0; i < rules.length; i++) {
		rules[i].isMatching = false;
		switch (rules[i].type) {
			case "person": if (currentTrack.playlistOwnerID == rules[i].playlistOwner) rules[i].isMatching = true; break;
			case "notmine": if (currentTrack.playlistOwnerID != null && currentTrack.playlistOwnerID != ""
					 && currentTrack.playlistOwnerID != user.id) rules[i].isMatching = true; break;
		}

		if (rules[i].type == "current"
			&& rules[i].playlists[i].id == currentTrack.playlistID
			&& rules[i].playlists.length == 2) rules[i].isMatching = false;

		for (let j in rules[i].playlists) {
			if (currentTrack.playlistID == rules[i].playlists[j].id) rules[i].isMatching = true;
		}

		if (!rules[i].isMatching)
			$(`#p-auto__saved-rules-list .item:nth-child(${i+2})`).addClass("disabled");
		else $(`#p-auto__saved-rules-list .item:nth-child(${i+2})`).removeClass("disabled");
	}
}

/**
 * Adds current track to desired playlist, and removes from current playlist if possible.
 */
function listenRuleClicks() {
	$("#p-auto__saved-rules-list .item:not(.p-auto__item-add)").off("click");
	$("#p-auto__saved-rules-list .item:not(.p-auto__item-add)").click(function(e) {
		if ($(this).attr("class").includes("disabled")) return;
		let i = $(this).index() - 1;
		
		let isPositive = true;
		let currentPlaylistIndex = 0;
		let targetPlaylistIndex = 0;

		if ($(e.target).attr("class").includes("negative")) {
			isPositive = false;
		} else if ($(e.target).attr("class").includes("positive")) {
			isPositive = true;
		} else {
			isPositive = true;
		}

		if ($(this).attr("class").includes("single")) {
			targetPlaylistIndex = 1;
		} else {
			for (let j = 0; j < rules[i].playlists.length; j++) {
				if (currentTrack.playlistID == rules[i].playlists[j].id) {
					currentPlaylistIndex = j;
					targetPlaylistIndex = isPositive ? j + 1 : j - 1;
				}
			}
		}

		let canGoUp = true;
		let canGoDown = true;
		let deleteOnly = false;
		if (rules[i].playlists.length - 1 == currentPlaylistIndex || rules[i].playlists.length == targetPlaylistIndex) {
			//can't go up
			canGoUp = false;
		} else if (0  == currentPlaylistIndex || -1 == targetPlaylistIndex) {
			//can't go down
			canGoDown = false;
			deleteOnly = true;
		}

		if ($(this).attr("class").includes("single")) {
			//can go up only goes up
			canGoUp = true;
			canGoDown = false;
		}

		if (canGoUp && isPositive) { // move up
			addCurrentTrackToPlaylist(rules[i].playlists[targetPlaylistIndex]);
			removeCurrentTrackFromPlaylist(rules[i].playlists[currentPlaylistIndex]);
		} else if (canGoDown && !isPositive) { // move down
			addCurrentTrackToPlaylist(rules[i].playlists[targetPlaylistIndex]);
			removeCurrentTrackFromPlaylist(rules[i].playlists[currentPlaylistIndex]);
		} else if (deleteOnly) { // delete
			removeCurrentTrackFromPlaylist(rules[i].playlists[currentPlaylistIndex]);
		}
	});
}

/**
 * Api function apiAddTracksToPlaylist wrapper function.
 */
function addCurrentTrackToPlaylist(playlist) {
	apiAddTracksToPlaylist(playlist.id, [currentTrack.uri])
		.then((data) => {
			showWarning(`Track added to ${playlist.name}`, true);
		})
		.catch((error) => {
			console.log(error);
			showWarning(`Failed to add track to ${playlist.name}`, true);
		});
}

/**
 * Api function apiRemoveTracksFromPlaylist wrapper function.
 */
function removeCurrentTrackFromPlaylist(playlist) {
	if (playlist.owner != user.id) return;
	apiRemoveTracksFromPlaylist(playlist.id, [currentTrack.uri])
		.then((data) => {
			showWarning(`Track removed from ${playlist.name}`, true);
		})
		.catch((error) => {
			console.log(error);
			showWarning(`Failed to remove track from ${playlist.name}`, true);
		});
}

// ------------------------------------------------------------

/**
 * Clears rules & savedPlaylists cache.
 */
function reset() {
	localStorage.removeItem("pautoRules");
	localStorage.removeItem("pautoSavedPlaylists");
}