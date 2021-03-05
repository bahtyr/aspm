let currentTrack = {};

let playlists = [];
let playlistsProtected = []; // Keeps the initial playlist, in case the user turns off all the filters, the list would be empty
let showPrivate = true;
let showPublic = true;


let rules = []; 
let matchingRules = [];
let newRuleHolder = [];



let selectedPlaylistID;
let selectedPlaylistIndex;

$(function() {
	$(".popup-page").removeClass("is-gone");
	// popup element has is-gone attribute to hide its animation when the page is first loaded,
	// it has done it's purpose it can now be removed
	
	reloadRules();
	showAllRules();

	getCurrentlyPlaying();
	// -> findMatchingRules();

	initButtons();
	initNewRulePageActions();
	//load rules
	
	setTimeout(() => getCurrentlyPlaying(), 200000);
});

function initButtons() {
	$("#btn-refresh").click(() => getCurrentlyPlaying());
	
	$("#btn-new-rule").click(() => {
		$(".popup-page").removeClass("is-hidden");
		loadPlaylists();
	});
	
	$("#btn-remove-track").dblclick(() => removeTrackFromPlaylist());
}

function initNewRulePageActions() {
	// private / public filters
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

	// save rule
	$("#btn-save-rule").click(() => {

		rules.push(newRuleHolder);
		saveRules();

		findMatchingRules();
		showAllRules();

		$(".popup-page").addClass("is-hidden");
	});
}

// Currently Playing

function getCurrentlyPlaying() {
	apiGetCurrentlyPlayingTrack()
		.then((data) => {

			if (data["item"] != null) {
				currentTrack.name = data["item"]["name"];
				currentTrack.uri = data["item"]["uri"];
				currentTrack.artists = "";
				for (i in data["item"]["artists"]) {
					if (currentTrack.artists.length > 0)
						currentTrack.artists += ", ";
					currentTrack.artists += data["item"]["artists"][i]["name"];
				}

				if (data["context"] == null)
					currentTrack.contextType = "library";
				else {
					currentTrack.contextType = data["context"]["type"];

					if (currentTrack.contextType == "playlist") {
						let uri =  data["context"]["uri"].split(':');
						currentTrack.playlistID = uri[uri.length - 1];
						loadPlaylistInfo();
					}
				}

				// contextType; playlist | album | artist | null (like_songs)
				// the context uri might include user's name if the user is playing their playlist, however it is also possible that the user name is missing
				// therefore this is not a reliable method to confirm if playlist is owned by the user or not.

				// TODO - properly save / handle track context type, might display it with an icon in future

				$(".currently-playing p:nth-child(1)").text(`${currentTrack.contextType} : UNKNOWN`);
				$(".currently-playing p:nth-child(2)").text(`${currentTrack.name} - ${currentTrack.artists.toString()}`);

				findMatchingRules();
			}
		})
		.catch((error) => {
			console.log(error);
		});
}

function loadPlaylistInfo() {
	apiGetPlaylistInfo(currentTrack.playlistID)
		.then((data) => {

			let img = getAnImageFromArray(data["images"]);
			if (img != null)
				$(".currently-playing img").attr('src', img);

			$(".currently-playing p:nth-child(1)").text(`${data.name}`);
		})
		.catch((error) => {
			console.log(error);
		});
}

// New Rule Page / Playlist Picker

function loadPlaylists() {
	apiGetMyPlaylists()
		.then((data) => {
			playlistsProtected = data;
			printPlaylistsHandler(data);
		})
		.catch((error) => { console.log(error) });
}

function printPlaylistsHandler(data) {
	// clear previous data, check filters, print & add listener

	// these actions are done within a separate function, it needs to be called from filters as well

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

	printPlaylists(playlists); // @base.js

	listenPlaylistPicker();
}

function listenPlaylistPicker() {
	// register selected playlists for a new rule

	$(".image-item").click(function() {
		let i = $(this).index() - 1; // substract hidden element

		if (newRuleHolder.length > 1) // if two playlists are already selected, reset selection
			newRuleHolder = [];

		newRuleHolder.push({
			name: playlists[i]["name"], 
			uri: playlists[i]["uri"].split(":")[2], 
			image: getAnImageFromArray(playlists[i]["images"])}); // TODO - verify uri last index for other people's playlists


		// show selected playlists on top

		let selectionText = `Selected: 1- ${newRuleHolder[0].name}`;
		if (newRuleHolder.length > 1)
			selectionText += `, 2- ${newRuleHolder[1].name}`;

		$(".popup-page .description-wrapper p").text(selectionText);
	});	
}

// Matching Rules

function findMatchingRules() {
	reloadRules();

	if (currentTrack.playlistID != null) {
		matchingRules = []; // reset
		
		if (rules.length > 0) {
			for (i in rules) {
				if (currentTrack.playlistID == rules[i][0].uri)
					matchingRules.push(rules[i][1]);
			}

			printMatchingRules();
		}
	}
}

function listenMatchingRulesClick() {
	// Add current track to selected playlist

	$(".highlighted-rules-list .inline-image-item").click(function() {
		let i = $(this).index() - 1; //substract hidden element
		selectedPlaylistID = matchingRules[i]["uri"];
		selectedPlaylistIndex = i;

		apiAddTracksToPlaylist(selectedPlaylistID, [currentTrack.uri])
			.then((data) => {
				// console.log("Track added to new playlist");
			})
			.catch((error) => {
				console.log(error);
			});
	});
}

// All Rules

function showAllRules() {
	printRules();
}

function listenRuleDeleteClick() {
	// Delete selected rule

	$(".rules-list .rule-box-wrapper .btn-delete").click(function() {
		let i = $(this).parent().index() - 1; //substract hidden element

		rules.splice(i, 1);
		showAllRules();
		saveRules();
	});
}

// Remove Track

function removeTrackFromPlaylist() {
	apiRemoveTrackFromPlaylist(currentTrack.playlistID, [currentTrack.uri])
		.then((data) => {
			// console.log("Track deleted from playlist.");
		})
		.catch((error) => {
			console.log(error);
		});
}

// Print Functions

function printMatchingRules() {
	$(".highlighted-rules-list .inline-image-item").off("click");
	$(".highlighted-rules-list .inline-image-item:not(.is-gone)").remove(); // remove every item besides the teamplate

	let list = [];
	const template = $(".highlighted-rules-list .inline-image-item")[0].outerHTML;

	for (let i = 0; i < matchingRules.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		// IMAGE
		if (matchingRules[i]["image"] != null)
			holder.find("img").attr("src", matchingRules[i]["image"]);
		else { 
			holder.find("img").removeAttr("src", "");
			holder.find("img").addClass("is-hidden");
		}
		
		// NAME
		let name = matchingRules[i]["name"];
		if (name.length > 30)
			name = name.substr(0, 30) + "...";
		holder.find("p").text(name);

		list.push(holder);
	}

	$(".highlighted-rules-list").append(list);

	listenMatchingRulesClick();
}

function printRules() {
	$(".rules-list .rule-box-wrapper").off("click");
	$(".rules-list .rule-box-wrapper:not(.is-gone)").remove(); // remove every item besides the teamplate

	let list = [];
	const template = $(".rules-list .rule-box-wrapper")[0].outerHTML;

	for (let i = 0; i < rules.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		for (var x = 0; x < 2; x++) {

			// IMAGE
			if (rules[i][x]["image"] != null)
				holder.find(`.inline-image-item:nth-child(${x+1}) img`).attr("src", rules[i][x]["image"]);
			else { 
				holder.find(`.inline-image-item:nth-child(${x+1}) img`).removeAttr("src", "");
				holder.find(`.inline-image-item:nth-child(${x+1}) img`).addClass("is-hidden");
			}
			
			// NAME
			let name = rules[i][x]["name"];
			if (name.length > 30) name = name.substr(0, 30) + "...";
			holder.find(`.inline-image-item:nth-child(${x+1}) p`).text(name);
		}
		
		list.push(holder);
	}

	$(".rules-list").append(list);

	listenRuleDeleteClick();
}

// Etc

function reloadRules() {
	if (localStorage.automationRules != null) {
		rules = JSON.parse(localStorage.automationRules);
	}
}

function saveRules() {
	localStorage.setItem("automationRules", JSON.stringify(rules));	
}

// TODO - notification on actions