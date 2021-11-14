/**
 * clean up this file
 * - organize functions
 * - check function names
 * - add comments
 * clean up pages.css
 * verify html file
 * 
 * progress bar is just messed up
 */

$(function() {

	// attemptToLoadCache();
	nestedActions(1);

	$(".search__helper__buttons:nth-child(2)").click(() => getCurrentlyPlaying(1));

	$(".search__helper__buttons:nth-child(4)").click(() => getCurrentlyPlaying(2));

	$(".search__helper__buttons:nth-child(5)").click(() => {
		nestedActions(1);
	});

	$("#search__button").click(() => {
		updateProgressBar(1,3);
		searchSaved($("#search__input").val().toLowerCase()); updateProgressBar(2,3);
		searchPlaylists($("#search__input").val().toLowerCase()); updateProgressBar(3,3);
		printHelper();
	});
});

// API REQUESTS

let savedTracks = [];
let playlists = [];

function nestedActions(no) {
	countRequestsAndWait();
	switch (no) {
		case 1: console.log("1"); updateProgressBar(0.5, 3); actionSavedTracks(); break;
		case 2: console.log("2"); updateProgressBar(1, 3); actionGetPlaylists(); break;
		case 3: console.log("3"); updateProgressBar(2, 3); actionGetPlaylistsTracks(); break;
		case 4: console.log("4"); updateProgressBar(3, 3); saveCache(); break;
	}
}

function actionSavedTracks(apiNextUrl) {
	apiGetMySavedTracks(apiNextUrl).then((data) => {
		
		console.log(`Loading Saved Tracks: ${data.offset} / ${data.total}`);
		
		savedTracks.push(...data.items);
		
		if (data.next != null && data.next != "")
			actionSavedTracks(data.next);
		else nestedActions(2);
	});
}

function actionGetPlaylists(apiNextUrl) {
	apiGetMyPlaylistsJS(apiNextUrl).then((data) => {
		
		console.log(`Loading Playlists: ${data.offset} / ${data.total}`);
		
		for (let i in data.items) { //do keep playlists of others
			if (data.items[i].owner.id == user.id)
				playlists.push(data.items[i]);
		}
		
		if (data.next != null && data.next != "")
			actionGetPlaylists(data.next);
		else nestedActions(3);
	});
}

let apiPlaylistCounter = 0;
function actionGetPlaylistsTracks(apiNextUrl) {
	apiGetPlaylistTracks(playlists[apiPlaylistCounter].id, apiNextUrl).then((data) => {

		console.log(`Loading Playlist: ${apiPlaylistCounter} / ${playlists.length} Track: X / ${data.total}`);

		if (playlists[apiPlaylistCounter].items == null) //init items array for this playlist item
			playlists[apiPlaylistCounter].items = [];

		playlists[apiPlaylistCounter].items.push(...data.items);

		if (data.next != null && data.next != "") { //if there are more tracks for current playlist, request next
			actionGetPlaylistsTracks(data.next);
		} else if (apiPlaylistCounter < playlists.length - 1) { //if loaded every track of this playlist, load next playlist
			apiPlaylistCounter++;
			actionGetPlaylistsTracks();
		} else nestedActions(4);
	});
}

// SEARCH

let savedTracksResults = [];
let playlistsResults = [];

function searchSaved(str) {
	savedTracksResults = [];
	for (let i = 0; i < savedTracks.length; i++) {
		let foundMatch = false;

		if (savedTracks[i].track.name.toLowerCase().includes(str)) foundMatch = true;
		if (savedTracks[i].track.album.name.toLowerCase().includes(str)) foundMatch = true;
		for (let a in savedTracks[i].track.artists)
			if (savedTracks[i].track.artists[a].name.toLowerCase().includes(str)) foundMatch = true;

		if (foundMatch) {
			savedTracksResults.push(savedTracks[i]);
		}

	}
}

function searchPlaylists(str) {
	playlistsResults = [];
	for (let p = 0; p < playlists.length; p++) {

		let foundMatchPlaylist = false;

		for (let i = 0; i < playlists[p].items.length; i++) {
			if (playlists[p].items[i].track == null) continue;

			let foundMatchTrack = false;

			// LOOK FOR A MATCH
			if (playlists[p].items[i].track.name.toLowerCase().includes(str)) foundMatchTrack = true;
			if (playlists[p].items[i].track.album.name.toLowerCase().includes(str)) foundMatchTrack = true;
			for (let a in playlists[p].items[i].track.artists)
				if (playlists[p].items[i].track.artists[a].name.toLowerCase().includes(str)) foundMatch = true;

			// SAVE RESULTS
			// if this track is a match, and this playlist was not saved yet, create the playlist first
			if (foundMatchTrack && !foundMatchPlaylist) {
				playlistsResults.push(Object.assign({}, playlists[p]));
				playlistsResults[playlistsResults.length - 1].items = [];
				foundMatchPlaylist = true;
			}

			if (foundMatchTrack) {
				playlistsResults[playlistsResults.length - 1].items.push(playlists[p].items[i]);
			}
		}
	}
}


// SAVE & LOAD

function saveCache() {
	try {
		localStorage.setItem(`searchPlaylists`, JSON.stringify(playlists));
		console.log("Saved Playlists to localStorage.");
	} catch (error) { 
		localStorage.removeItem(`searchPlaylists`);
		try { sessionStorage.setItem(`searchPlaylists`, JSON.stringify(playlists)); console.log("Saved Playlists to sessionStorage."); }
		catch (error) { sessionStorage.removeItem(`searchPlaylists`); console.log("Failed to save Playlists.") }
	}

	try {
		localStorage.setItem(`searchSavedTracks`, JSON.stringify(savedTracks));
		console.log("Saved Playlists to localStorage.");
	} catch (error) {
		localStorage.removeItem(`searchSavedTracks`);
		try { sessionStorage.setItem(`searchSavedTracks`, JSON.stringify(savedTracks));  console.log("Saved SavedTracks to sessionStorage."); }
		catch (error) { sessionStorage.removeItem(`searchSavedTracks`); console.log("Failed to save SavedTracks.") }
	}
}

function attemptToLoadCache() {
	if (localStorage.searchSavedTracks) savedTracks = JSON.parse(localStorage.searchSavedTracks);
	else if (sessionStorage.searchSavedTracks) savedTracks = JSON.parse(sessionStorage.searchSavedTracks);

	if (localStorage.searchPlaylists) playlists = JSON.parse(localStorage.searchPlaylists);
	else if (sessionStorage.searchPlaylists) playlists = JSON.parse(sessionStorage.searchPlaylists);

	console.log(`savedTracks[${savedTracks != null ? savedTracks.length : "null"}]. local: ${localStorage.searchSavedTracks != null} session: ${sessionStorage.searchSavedTracks != null}`);
	console.log(`playlists[${playlists != null ? playlists.length : "null"}]. local: ${localStorage.searchPlaylists != null} session: ${sessionStorage.searchPlaylists != null}`);
}


// PRINT

const template = $(".table .row.js-template")[0].outerHTML;
let img, text1, text2, text3, text4, text5;
let holder;

function printHelper() {
	$(".row:not(.js-template,.header)").remove();
	let list = [];

	if (savedTracksResults.length > 0) {
		list.push(createPlaylistLine(-1));
		for (let i in savedTracksResults) {
			list.push(createSavedTrackLine(i));
		}
	}

	if (playlistsResults.length > 0) {
		for (let x in playlistsResults) {
			list.push(createPlaylistLine(x));
			for (let y in playlistsResults[x].items) {
				list.push(createPlaylistTrackLines(x, y));
			}
		}	
	}

	$(".table").append(list);
}

function createPlaylistLine(i) {
	holder = $($.parseHTML(template));
	holder.removeClass("js-template");
	
	//https://misc.scdn.co/liked-songs/liked-songs-300.png
	//https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png
	img = i == -1 ? "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png" : getAnImageFromArray(playlistsResults[i].images, 3);
	text1 = "";
	text2 = i == -1 ? "Liked Songs" : playlistsResults[i].name;
	text3 = "";
	text4 = "";
	text5 = "";

	holder.find("span:nth-child(3)").attr("title", text2);
	holder.find("span:nth-child(4)").attr("title", text3);
	holder.find("span:nth-child(5)").attr("title", text4);

	holder.find("span:nth-child(1)").text(text1);
	holder.find("img").attr("src", img);
	holder.find("span:nth-child(3)").text(trimmedText(text2, 50));
	holder.find("span:nth-child(4)").text(trimmedText(text3, 25));
	holder.find("span:nth-child(5)").text(trimmedText(text4, 25));
	holder.find("span:nth-child(6)").text(text5);

	holder.addClass("primary");

	return holder;
}

function createPlaylistTrackLines(p, i) {
	holder = $($.parseHTML(template));
	holder.removeClass("js-template");
	
	img = "";
	text1 = parseInt(i) + 1;
	text2 = playlistsResults[p].items[i].track.name;
	text3 = "";
	text4 = playlistsResults[p].items[i].track.album.name;
	text5 = getDateWithComma(playlistsResults[p].items[i].added_at);

	for (let aa in playlistsResults[p].items[i].track.artists) {
		if (aa > 0) text3 += ", ";
		text3 += playlistsResults[p].items[i].track.artists[aa].name;
	}

	holder.find("span:nth-child(3)").attr("title", text2);
	holder.find("span:nth-child(4)").attr("title", text3);
	holder.find("span:nth-child(5)").attr("title", text4);

	holder.find("span:nth-child(1)").text(text1);
	holder.find("img").attr("src", "");
	holder.find("span:nth-child(3)").text(trimmedText(text2, 50));
	holder.find("span:nth-child(4)").text(trimmedText(text3, 25));
	holder.find("span:nth-child(5)").text(trimmedText(text4, 25));
	holder.find("span:nth-child(6)").text(text5);

	holder.addClass("secondary");

	return holder;
}

function createSavedTrackLine(i) {
	holder = $($.parseHTML(template));
	holder.removeClass("js-template");
	
	img = "";
	text1 = parseInt(i) + 1;
	text2 = savedTracksResults[i].track.name;
	text3 = "";
	text4 = savedTracksResults[i].track.album.name;
	text5 = getDateWithComma(savedTracksResults[i].added_at);

	for (let aa in savedTracksResults[i].track.artists) {
		if (aa > 0) text3 += ", ";
		text3 += savedTracksResults[i].track.artists[aa].name;
	}

	holder.find("span:nth-child(3)").attr("title", text2);
	holder.find("span:nth-child(4)").attr("title", text3);
	holder.find("span:nth-child(5)").attr("title", text4);

	holder.find("span:nth-child(1)").text(text1);
	holder.find("img").attr("src", "");
	holder.find("span:nth-child(3)").text(trimmedText(text2, 50));
	holder.find("span:nth-child(4)").text(trimmedText(text3, 25));
	holder.find("span:nth-child(5)").text(trimmedText(text4, 25));
	holder.find("span:nth-child(6)").text(text5);

	holder.addClass("secondary");

	return holder;
}


// PLAYING
let currentTrack = {name: "", artists: ""};
function getCurrentlyPlaying(mode) {
	apiGetCurrentlyPlayingTrack()
		.then((data) => {
			if (data == null || data.item == null) return;

			currentTrack.name = data.item.name;
			currentTrack.artists = "";

			for (let i in data.item.artists) {
				if (currentTrack.artists.length > 0)
					currentTrack.artists += ", ";
				currentTrack.artists += data.item.artists[i].name;
			}

			switch (mode) {
				case 1: $("#search__input").val(currentTrack.name); break;
				case 2: $("#search__input").val(currentTrack.artists); break;
			}
		})
		.catch((error) => {
			console.log(error);
		});
}