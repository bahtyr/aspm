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

	$("#search__input").keyup(function(event) {
		if (event.keyCode === 13) //enter
			$("#search__button").click();
	});

	$("#search__button").click(() => {
		let s = $("#search__input").val().trim().toLowerCase();
		let isDate = s.length == 10 && s.includes("-"); //this will fail eventually ;)
		if (s.length == 0) return;

		updateProgressBar(1,3);
		searchSaved(s, isDate); updateProgressBar(2,3);
		searchPlaylists(s, isDate); updateProgressBar(3,3);
		printHelper();
	});
});

// API REQUESTS

let savedTracks = [];
let playlists = [];

/*
* the following functions run succesively: calling nestedActions(1) will run 2,3.. afterwards.
*/
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

function searchSaved(str, isDate) {
	savedTracksResults = [];

	savedTracks.forEach(e => {
		let matchFound = false;

		//!! we should do a better comparison, rather then just includes. ie: 03-02 (mm-dd) will find 2003-02;
		if (isDate && compareDates(e.added_at, str))
			matchFound = true;
		if (!isDate && e.track.name.toLowerCase().includes(str) || e.track.album.name.toLowerCase().includes(str))
			matchFound = true;
		e.track.artists.forEach(artist => {
			if (!isDate && artist.name.toLowerCase().includes(str)) matchFound = true;
		});

		if (matchFound)
			savedTracksResults.push(e);
	});
}

function searchPlaylists(str, isDate) {
	playlistsResults = [];

	playlists.forEach(playlist => {
		playlistMatchFound = false;

		playlist.items.forEach(e => {
			matchFound = false;
			if (e.track == null) return;

			//search
			if (isDate && compareDates(e.added_at, str))
				matchFound = true;
			if (!isDate && e.track.name.toLowerCase().includes(str) || e.track.album.name.toLowerCase().includes(str))
				matchFound = true;
			e.track.artists.forEach(artist => {
				if (!isDate && artist.name.toLowerCase().includes(str)) matchFound = true;
			});

			//add
			// if this track is a match, and this playlist was not saved yet, create the playlist first
			if (matchFound && !playlistMatchFound) {
				playlistsResults.push(Object.assign({}, playlist));
				playlistsResults[playlistsResults.length - 1].items = [];
				playlistMatchFound = true;
			}
			if (matchFound) {
				playlistsResults[playlistsResults.length - 1].items.push(e);
			}
		})
	});
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

/**
 * Compares two given dates, factors in wildcard search as well.
 * spotifyDate: added_at: 2022-05-12T20:39:12Z
 * searchDate :           YYYY-MM-DD, put * (s) to skip
**/
function compareDates(spotifyDate, searchDate) {
	// console.log(spotifyDate +"----------------"+ searchDate);
	let yy = searchDate.slice(0,4);
	let mm = searchDate.slice(5,7);
	let dd = searchDate.slice(8,10);
	
	let match = null;

	if (yy == "0000") {}
	else if (spotifyDate.slice(0,4) == yy) match = true;
	else match = false;

	if (match == null || match) {
		if (mm == "00") {}
		else if (spotifyDate.slice(5,7) == mm) match = true;
		else match = false;
	}

	if (match == null || match) {
		if (dd == "00") {}
		else if (spotifyDate.slice(8,10) == dd) match = true;
		else match = false;
	}

	return match;
}
