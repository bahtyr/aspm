let tracksOffset = 0;
let tracksTotal = 0;
let tracks = [];
let isLoading = true;

$(function() {
	if (!isLoggedIn()) return;

	loadTracks();
	
	$(".btn-export").click(() => {
		if (!isLoading) createPlaylistMaybe(tracks)
	});

	$(".icon-prev").click(() => changePage(-20));
	$(".icon-next").click(() => changePage(20));
});

function loadTracks() {
	apiGetMySavedTracks("")
		.then((data) => {

			tracksTotal = data.total;
			$(".page-count").text(`${tracksOffset + 1} - 20 of ${data.total}`);
			declutterTracks(data.items, tracks);
			printTableTracks_(tracks, 20, 0);

			new Promise((resolve, reject) => requestSavedTracksWrapper(resolve, data.total, data.next))
				.then((success) => {
					isLoading = false;
					console.log("done");
				})
				.catch((error) => {
					console.log("err: load saved");
				});
		})
		.catch((error) => console.log("err: load saved 2"));
}

async function requestSavedTracksWrapper(resolve, total, nextUrl) {
	for (let i = 0; i < total / 50; i++) {
		incremenetRequestCounter();
		if (nextUrl != null || nextUrl != "") {
			let data = await apiGetMySavedTracks(nextUrl);
			nextUrl = data.next;
			declutterTracks(data.items, tracks);
		}
	}

	resolve();
}

// A function to only keep essentioal data from a track items array
function declutterTracks(arr, newArr) {
	for(i in arr) {
		let temp = {};
		temp.id = arr[i].track.id;
		temp.name = arr[i].track.name;
		temp.artists = [];

		for (y in arr[i].track.artists) {
			let tempY = {};
			tempY.id = arr[i].track.artists[y].id;
			tempY.name = arr[i].track.artists[y].name;
			temp.artists.push(tempY);
		}

		temp.album = {images: [{}]};
		temp.album.id = arr[i].track.album.id;
		temp.album.name = arr[i].track.album.name;

		let imgArrLength = arr[i].track.album.images.length;
		if (imgArrLength > 0)
			temp.album.images[0].url = arr[i].track.album.images[imgArrLength > 2 ? 1 : 0].url;
		else temp.album.images[0].url = "";

		temp.dateAdded = arr[i].added_at;

		newArr.push(temp);
	}
}

// Caution uses a decluttered tracks items list
function printTableTracks_(items, limit, offset) {
	let limit_ = limit != 0 ? limit : items.length
	let list = [];
	const template = $(".table .row")[1].outerHTML;

	for (let i = offset; i < offset + limit_; i++) {
		if (i == items.length) break;

		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		//

		let name = items[i].name;
		let artists = "";
		let album = items[i].album.name;
		let dateAdded = getDateWithComma(items[i].dateAdded);

		for (y in items[i].artists) {
			if (y > 0) artists += ", ";
			artists += items[i].artists[y].name;
		}

		holder.find("span:nth-child(2)").attr("title", name);
		holder.find("span:nth-child(3)").attr("title", artists);
		holder.find("span:nth-child(4)").attr("title", album);

		if (name.length > 50) name = name.substr(0, 50) + "...";
		if (artists.length > 25) artists = artists.substr(0, 25) + "...";
		if (album.length > 25) album = album.substr(0, 25) + "...";

		holder.find("span:nth-child(1)").text(i + 1);
		holder.find("span:nth-child(2)").text(name);
		holder.find("span:nth-child(3)").text(artists);
		holder.find("span:nth-child(4)").text(album);
		holder.find("span:nth-child(5)").text(dateAdded);

		list.push(holder);
	}

	$(".table").append(list);
}

function getDateWithComma(str) {
	let d = new Date(str).toDateString();
	let s = d.slice(4, 10);
	if (s.charAt(4) == "0") s = s.slice(0, 4) + s.slice(5);
	return s + ',' + d.slice(10);
}

// Count requests made and wait if necessary
let requestCounter = 0;
async function incremenetRequestCounter() {
	requestCounter++;
	if (requestCounter % 20)
		await new Promise((resolve, reject) => setTimeout(() => resolve(), 5000)); 
}

function createPlaylistMaybe(arr) {
	if (tracks == null || tracks.length == 0)
		return;

	// playlist name
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	var today = new Date();
	var mm = months[today.getMonth()];
	var yy = today.getFullYear().toString().slice(-2);
	
	let name = `Liked Songs - ${mm} '${yy}`;
	let description = "";

	let trackURIs = [];
	for (i in arr) {
		if (i == arr.length) break;
		trackURIs.push("spotify:track:" + arr[i].id);
	}

	apiCreatePlaylist(name, description)
		.then((data) => {			
			new Promise((resolve, reject) => 
				createPlaylistWrapper(resolve, reject, data.id, tracks, trackURIs)
			);
			alert("Playlist created");
		})
		.catch((error) => {
			console.log("err: create playlist");
		});
}

async function createPlaylistWrapper(resolve, reject, playlistID, items, uris) {

	for (let i = 0; i < items.length / 100; i++) {
		let uris_ = uris.slice(i*100, (i*100)+100);
		await apiAddTracksToPlaylist(playlistID, uris_)
					.then((data) => {})
					.catch((error) => console.log("err: add to playlist"));
	}

	resolve();
}

function changePage(n) {
	if (isLoading)
		return;

	$(".table .row:not(.header):not(.is-gone)").remove();
	tracksOffset += n;
	if (tracksOffset < 0)
		tracksOffset = 0;

	printTableTracks_(tracks, 20, tracksOffset);
	$(".page-count").text(`${tracksOffset + 1} - ${tracksOffset + 20} of ${tracksTotal}`);
}