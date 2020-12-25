let savedTracks = [];
let playlists = [];
let allPlaylistsTracks = [];

let arrSavedOnly = [];
let arrInPlaylists = [];

let requestCounter = 0;
let trackURIs = [];



$(function() {
	
	init();
});

function init() {
	$("#btn-start").click(() => doitmore());
	$("#btn-create-playlist").click(() => createPlaylistMaybe());

}

function doitmore() {
	updateProgress("Loading Saved Tracks");
	requestSavedTracks("")
		.then((data) => {
			new Promise((resolve, reject) => requestSavedTracksWrapper(data, resolve, reject)) // load all saved tracks
				.then(() => {
					requestCurrentUserPlaylists() // load all user playlists
						.then((data) => {
							declutterPlaylists(data);
							updateProgress("Playlists: " + data.length + " / " + data.length);

							new Promise((resolve, reject) => requestPlaylistTracksWrapper(resolve, reject))
								.then(() => {
										updateProgress("Comparing");

										// compare(savedTracks, allPlaylistsTracks);
										compare2(savedTracks, allPlaylistsTracks, arrSavedOnly);
										updateProgress("Done!");
										showWarning("Finished comparing!", true);


										// console.log("savedOnly");
										// console.log(arrSavedOnly);

										printTableTracks(arrSavedOnly, 0);
									})
									.catch();
							 // every playlists' tracks all
						})
						.catch(); // user playlists all
				})
				.catch(); // saved tracks all
		})
		.catch(); // saved tracks 1
}

async function requestSavedTracksWrapper(data, resolve, reject) {
	declutterSavedTracks(data["items"]);
	updateProgress("Saved Tracks: " + data["limit"] + " / " + data["total"]);
	let next_url = data["next"];
	// for (let i = 0; i < 10; i++) {
	for (let i = 0; i < data["total"] / 50; i++) {
		incremenetRequestCounter();
		if (next_url != null || next_url != "") {
			let tracks = await requestSavedTracks(next_url);
			next_url = tracks["next"];
			declutterSavedTracks(tracks["items"]);
			updateProgress("Saved Tracks: " + (data["limit"] * i) + " / " + data["total"]);

		}
	}

	resolve();
}

async function requestPlaylistTracksWrapper(resolve, reject) {

	// for (let i = 0; i < 1; i++) {
	for (let i = 0; i < playlists.length; i++) { //all playlists
		let next_url = `https://api.spotify.com/v1/playlists/${playlists[i]["id"]}/tracks`;
		for (let x = 0; x < playlists[i]["tracks_total"] / 100; x++) { //all tracks
			incremenetRequestCounter();
			updateProgress(`Playlist ${i} / ${playlists.length} - Tracks ${100*x} / ${playlists[i]["tracks_total"]}`);
		if (next_url != null || next_url != "") {

			await requestPlaylistTracks("", next_url)
				.then((data) => {
					next_url = data["next"];
					// add playlist_id to tracks, and save them to allplaylisttracks		
					data["items"].forEach(item => {
						let temp = item["track"];
						if (temp != null) {
						temp["playlist_id"] = playlists[i]["id"];
						temp["playlist_name"] = playlists[i]["name"];
						allPlaylistsTracks.push(temp);
						}
					});
				});
			}
			
		}
	}
	resolve();
}

//

function compare2(arr1, arr2, arrToUpdate) {
	for (let x = 0; x < arr1.length; x++) {
		let existsIn2 = false;

		for (let y = 0; y < arr2.length; y++) {

			// found in arr2
			if (!existsIn2 && arr1[x]["id"] == arr2[y]["id"]) {
				existsIn2 = true;
				break;
			}
		} // arr2 loop end

		if (!existsIn2)
			arrToUpdate.push(arr1[x]);
	} // arr1 loop end
}

function compare(arr1, arr2) {
	updateProgress("Comparing " + arr1.length + " Saved Tracks to " + arr2.length + " tracks in playlists");
	for (let x = 0; x < arr1.length; x++) {
		let existsInB = false;

		for (let y = 0; y < arr2.length; y++) {

			// found in arr2
			if (arr1[x]["id"] == arr2[y]["id"]) {
				existsInB = true;

				// check if this already exists in our found array
				// if it is just add this one's playlist id
				if (arrInPlaylists.length > 0
					&& arrInPlaylists[arrInPlaylists.length - 1]["id"] == arr2[y]["id"]) {
					arrInPlaylists[arrInPlaylists.length - 1]["playlist_ids"].push(arr2[y]["playlist_id"]);
				} else {
					arr2[y]["playlist_ids"] = [arr2[y]["playlist_id"]];
					arrInPlaylists.push(arr2[y]);
					// delete arrInPlaylists[arrInPlaylists.length - 1]["playlist_id"];
				}
			}
		} // arr2 loop end

		if (!existsInB)
			arrSavedOnly.push(arr1[x]);
	} // arr1 loop end
}

// 

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

function declutterPlaylists(arr) {
	for(i in arr) {
		if (arr[i]["owner"]["id"] == user.id) {
			let temp = {};

			temp["collaborative"] = arr[i]["collaborative"];
			temp["id"] = arr[i]["id"];
			temp["name"] = arr[i]["name"];
			temp["public"] = arr[i]["public"];
			temp["tracks_total"] = arr[i]["tracks"]["total"]; //href, total
			
			temp["owner"] = {};
			temp["owner"]["display_name"] = arr[i]["owner"]["display_name"];
			temp["owner"]["id"] = arr[i]["owner"]["id"];

			temp["images"] = [{}];
			let imgArrLength = arr[i]["images"].length;
			if (imgArrLength > 0)
				temp["images"][0]["url"] = arr[i]["images"][imgArrLength > 2 ? 1 : 0]["url"];
			else temp["images"][0]["url"] = "";

			playlists.push(temp);
		}
	}
}

//

function updateProgress(text) { $("#text-progress").append("<br>"+text); }

async function incremenetRequestCounter() {
	requestCounter++;
	if (requestCounter % 20)
		await setTimeout(() => { }, 5000);
}



function createPlaylistMaybe() {
	if (arrSavedOnly == null || arrSavedOnly.length == 0)
		return;

	showWarning("Creating playlist.", false);

	let name = "Saved Tracks Without Playlists"

	let description;
	var today = new Date();
	var dd = String(today.getDate()).padStart(2, '0');
	var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
	var yyyy = today.getFullYear();
	today = mm + '/' + dd + '/' + yyyy;
	
	description = `${arrSavedOnly.length} of ${savedTracks.length} saved tracks are not in any of my playlists.`;
	console.log(description);
	for (let i = 0; i < arrSavedOnly.length; i++) {
		if (i == arrSavedOnly.length) break;
		trackURIs.push("spotify:track:" + arrSavedOnly[i]["id"]);
	}

	// console.log(trackURIs);

	postCreatePlaylist(name, description)
		.then((data) => {
			showWarning("Adding tracks.", false);
			
			new Promise((resolve, reject) => {
				createPlaylistWrapper(resolve, reject, data["id"]);
				showWarning("All tracks are added to the playlist.", true);
			});
			
		})
		.catch((error) => {
			showWarning("Failed to create the playlist.", true);
			console.log(error);
		});
}


async function createPlaylistWrapper(resolve, reject, playlistID) {
	
	for (let i = 0; i < (arrSavedOnly.length / 100); i++) {
		showWarning(`Adding tracks. ${(i*100)+100} / ${trackURIs.length}`, false);
		let arr = trackURIs.slice(i*100, (i*100)+100);
		await postAddTracks(playlistID, arr)
					.then((data) => {})
					.catch((error) => showWarning("Failed to add tracks to the playlist."));
	}

	resolve();
}