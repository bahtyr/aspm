let currentTrack = {};

let playlists = [];
let playlistsProtected = []; // Keeps the initial playlist, in case the user turns off all the filters, the list would be empty
let showPrivate = true;
let showPublic = true;
let newRulePlaylists = [];

let allRules = [];
let matchingAvailableRules = [];

let selectedPlaylistID;
let selectedPlaylistIndex;

$(function() {
	initButtons();
	$(".popup-page").removeClass("is-gone"); 
	// popup element has is-gone attribute to hide its animation when the page is first loaded, it has done it's purpose it can now be removed
});

function initButtons() {
	$("#btn-refresh").click(() => getCurrentlyPlaying());
	$("#btn-new-rule").click(() => showNewRulePage());
	$("#btn-remove-track").dblclick(() => deleteTrackAlso());

	// NEW RULE PLAYLIST FILTERS
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

	$("#btn-save-rule").click(() => {
		// console.log(newRulePlaylists);
		$(".popup-page").addClass("is-hidden");

		// save new rule, but first load existing rules and combine them
		if (localStorage.automationRules != null) {
			let rules_ = JSON.parse(localStorage.automationRules);
			if (rules_.length < 1)
				rules_ = []; // an attempt to make rules_ an array if it isn't
			rules_.push(newRulePlaylists);

			localStorage.setItem("automationRules", JSON.stringify(rules_));
		} else localStorage.setItem("automationRules", JSON.stringify([newRulePlaylists]));

		sectionTwo();
	});
}

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
						loadMoreInfoOfPlaylist();
					}
				}

				// contextType; playlist | album | artist | null (like_songs)
				// the context uri might include user's name if the user is playing their playlist, however it is also possible that the user name is missing
				// therefore this is not a reliable method to confirm if playlist is owned by the user or not.

				// TODO - properly save / handle track context type, might display it with an icon in future

				$(".currently-playing p:nth-child(1)").text(`${currentTrack.contextType} : UNKNOWN`);
				$(".currently-playing p:nth-child(2)").text(`${currentTrack.name} - ${currentTrack.artists.toString()}`);

				sectionTwo();

			}
		})
		.catch((error) => {
			console.log(error);
		});
}

function showNewRulePage() {
	$(".popup-page").removeClass("is-hidden");
	apiGetMyPlaylists()
		.then((result) => {
			playlistsProtected = result;
			printPlaylistsHandler(result);
			// listenImagePicker();
			// initButtons();
		})
		.catch((error) => { console.log(error) });
}

function printPlaylistsHandler(data) {
	$(".image-item").off("click"); // remove listeners to prevent adding multiple listeners
	$(".image-item:not(.is-gone)").remove(); // remove every item besides the teamplate
	playlists = []; // remove existing items
	console.log(playlists);

	data.forEach(item => {
		if (user.id == item["owner"]["id"]) {
			if (showPublic && showPrivate) playlists.push(item);
			else if (showPublic && !showPrivate && item["public"] == true) playlists.push(item);
			else if (!showPublic && showPrivate && item["public"] == false) playlists.push(item);
		}
	});

	printPlaylists(playlists);

	$(".image-item").click(function() {
		let i = $(this).index() - 1; //substract hidden element
		selectedPlaylistID = playlists[i]["id"];
		selectedPlaylistIndex = i;

		if (newRulePlaylists.length > 1) // if two playlists are already selected, reset selection
			newRulePlaylists = [];

		console.log(getAnImageFromArray(playlists[i]["images"]));
		newRulePlaylists.push({
			name: playlists[i]["name"], 
			uri: playlists[i]["uri"].split(":")[2], 
			image: getAnImageFromArray(playlists[i]["images"])}); // TODO - verify uri last index for other people's playlists

		let selectionText = `Selected: 1- ${newRulePlaylists[0].name}`;
		if (newRulePlaylists.length > 1)
			selectionText += `, 2- ${newRulePlaylists[1].name}`;

		$(".popup-page .description-wrapper p").text(selectionText);
	});
}

function sectionTwo() {
	if (localStorage.automationRules != null) {
		let rules_ = JSON.parse(localStorage.automationRules);
		allRules = rules_;
		let txt = "";
		for (i in rules_) {
			if (txt.length > 0)
				txt += "\n";
			txt += `${rules_[i][0].name} > ${rules_[i][1].name}`;
		}

		prettyPrintAllRules();

		if (currentTrack.playlistID != null) {
			matchingAvailableRules = []; // reset
			
			for (i in rules_) {
				if (currentTrack.playlistID == rules_[i][0].uri)
					matchingAvailableRules.push(rules_[i][1]);
			}

			// console.log(matchingAvailableRules);
			printMatchingRules();
		}
	}
}

function printMatchingRules() {
	$(".highlighted-rules-list .inline-image-item").off("click");
	$(".highlighted-rules-list .inline-image-item:not(.is-gone)").remove(); // remove every item besides the teamplate

	let list = [];
	const template = $(".highlighted-rules-list .inline-image-item")[0].outerHTML;

	for (let i = 0; i < matchingAvailableRules.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		// IMAGE
		if (matchingAvailableRules[i]["image"] != null)
			holder.find("img").attr("src", matchingAvailableRules[i]["image"]);
		else { 
			holder.find("img").removeAttr("src", "");
			holder.find("img").addClass("is-hidden");
		}
		
		// NAME
		let name = matchingAvailableRules[i]["name"];
		if (name.length > 30)
			name = name.substr(0, 30) + "...";
		holder.find("p").text(name);

		list.push(holder);
	}

	$(".highlighted-rules-list").append(list);

	addToActionListener();
}

function addToActionListener() {
	$(".highlighted-rules-list .inline-image-item").click(function() {
		let i = $(this).index() - 1; //substract hidden element
		selectedPlaylistID = matchingAvailableRules[i]["uri"];
		selectedPlaylistIndex = i;

		doMoveThings();
	});
}

function doMoveThings() {
	apiAddTracksToPlaylist(selectedPlaylistID, [currentTrack.uri])
		.then((data) => {
			console.log("did we do it mate?");
		})
		.catch((error) => {
			console.log(error);
		});
}

function prettyPrintAllRules() {
	$(".rules-list .rule-box-wrapper").off("click");
	$(".rules-list .rule-box-wrapper:not(.is-gone)").remove(); // remove every item besides the teamplate

	let list = [];
	const template = $(".rules-list .rule-box-wrapper")[0].outerHTML;

	for (let i = 0; i < allRules.length; i++) {
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		for (var x = 0; x < 2; x++) {

			// IMAGE
			if (allRules[i][x]["image"] != null)
				holder.find(`.inline-image-item:nth-child(${x+1}) img`).attr("src", allRules[i][x]["image"]);
			else { 
				holder.find(`.inline-image-item:nth-child(${x+1}) img`).removeAttr("src", "");
				holder.find(`.inline-image-item:nth-child(${x+1}) img`).addClass("is-hidden");
			}
			
			// NAME
			let name = allRules[i][x]["name"];
			if (name.length > 30) name = name.substr(0, 30) + "...";
			holder.find(`.inline-image-item:nth-child(${x+1}) p`).text(name);
		}
		
		list.push(holder);
	}

	$(".rules-list").append(list);
	ruleDeleteListener();
}

function ruleDeleteListener() {
	$(".rules-list .rule-box-wrapper .btn-delete").click(function() {
		let i = $(this).parent().index() - 1; //substract hidden element
		let selectedRuleIndex = i;

		allRules.splice(i, 1);
		localStorage.setItem("automationRules", JSON.stringify(allRules));
		sectionTwo();
	});
}

function deleteTrackAlso() {
	apiRemoveTrackFromPlaylist(currentTrack.playlistID, [currentTrack.uri])
		.then((data) => {
			console.log(data);
		})
		.catch((error) => {
			console.log(error);
		});
}

function loadMoreInfoOfPlaylist() {
	apiGetPlaylistInfo(currentTrack.playlistID)
		.then((data) => {
			if (data["images"] != null || data["images"][0]["url"] != null)
				$(".currently-playing img").attr('src', data["images"][0]["url"]);

			$(".currently-playing p:nth-child(1)").text(`${data.name}`);
		})
		.catch((error) => {
			console.log(error);
		});
}

// TODO - save playlist img when creating new rules
// TODO - notification on actions