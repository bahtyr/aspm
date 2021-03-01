let savedTracks = [];
let trackURIs = [];
let requestCounter = 0;


$(function() {
	initButtons();
});

function initButtons() {
	$("#btn-load").click(() => startRequests());
	$("#btn-create-playlist").click(() => createPlaylistMaybe());
}

function startRequests() {
	updateProgress("Loading Saved Tracks");
	apiGetMySavedTracks("")
		.then((data) => {
			// console.log(data);
			new Promise((resolve, reject) => requestSavedTracksWrapper(data, resolve, reject))
				.then(() => {
					$("#btn-create-playlist").removeClass("is-hidden");
					printTableTracks(savedTracks, 20);

					console.log("done");
				})
				.catch(() => {
					console.log("failed");
				});
		})
		.catch(() => {
			updateProgress("An error occured. Please try again in a few minutes.");
		});
}

async function requestSavedTracksWrapper(data, resolve, reject) {
	declutterSavedTracks(data["items"]);
	updateProgress("Saved Tracks: " + data["limit"] + " / " + data["total"]);
	let next_url = data["next"];
	// for (let i = 0; i < 10; i++) {
	for (let i = 0; i < data["total"] / 50; i++) {
		incremenetRequestCounter();
		if (next_url != null || next_url != "") {
			let tracks = await apiGetMySavedTracks(next_url);
			next_url = tracks["next"];
			declutterSavedTracks(tracks["items"]);
			updateProgress("Saved Tracks: " + (data["limit"] * i) + " / " + data["total"]);
		}
	}

	resolve();
}

// Playlist Creation

function createPlaylistMaybe() {
	if (savedTracks == null || savedTracks.length == 0)
		return;

	showWarning("Creating playlist.", false);

	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	var today = new Date();
	var mm = months[today.getMonth()];
	var yy = today.getFullYear().toString().slice(-2);
	
	let name = `Liked Songs - ${mm} '${yy}`;
	let description = "";
	// description = `${X} of ${Y} saved tracks are not in any of my playlists.`;

	for (let i = 0; i < savedTracks.length; i++) {
		if (i == savedTracks.length) break;
		trackURIs.push("spotify:track:" + savedTracks[i]["id"]);
	}

	apiCreatePlaylist(name, description)
		.then((data) => {
			showWarning("Adding tracks.", false);
			
			new Promise((resolve, reject) => 
				createPlaylistWrapper(resolve, reject, data["id"])
			);
			
		})
		.catch((error) => {
			showWarning("Failed to create the playlist.", true);
			console.log(error);
		});
}

async function createPlaylistWrapper(resolve, reject, playlistID) {
	
	for (let i = 0; i < (savedTracks.length / 100); i++) {
		showWarning(`Adding tracks. ${(i*100)+100} / ${trackURIs.length}`, false);
		let arr = trackURIs.slice(i*100, (i*100)+100);
		await apiAddTracksToPlaylist(playlistID, arr)
					.then((data) => {})
					.catch((error) => showWarning("Failed to add tracks to the playlist."));
	}

	showWarning("All tracks are added to the playlist.", true);	
	resolve();
}

// Update progress text to keep user up to date.

function updateProgress(text) { $("#text-progress").text(text); }

// Count the number of requests made to wait a few seconds after reaching a certain amount.

async function incremenetRequestCounter() {
	requestCounter++;
	if (requestCounter % 20)
		await new Promise((resolve, reject) => setTimeout(() => resolve(), 5000)); 
}

// Functions to remove unncesseray data from Spotify response data.

function declutterSavedTracks(arr) {
	for(i in arr) {
		let temp = {};
		temp["id"] = arr[i]["track"]["id"];
		temp["name"] = arr[i]["track"]["name"];
		temp["artists"] = [];

		for (x in arr[i]["track"]["artists"]) {
			let tempX = {};
			tempX["id"] = arr[i]["track"]["artists"][x]["id"];
			tempX["name"] = arr[i]["track"]["artists"][x]["name"];
			temp["artists"].push(tempX);
		}

		temp["album"] = {images: [{}]};
		temp["album"]["id"] = arr[i]["track"]["album"]["id"];
		temp["album"]["name"] = arr[i]["track"]["album"]["name"];

		let imgArrLength = arr[i]["track"]["album"]["images"].length;
		if (imgArrLength > 0)
			temp["album"]["images"][0]["url"] = arr[i]["track"]["album"]["images"][imgArrLength > 2 ? 1 : 0]["url"];
		else temp["album"]["images"][0]["url"] = "";

		savedTracks.push(temp);
	}
}