let tracksOffset = 0;
let tracksTotal = 0;
let tracks = [];
let isLoading = true;

$(function() {
	if (!isLoggedIn()) return;

	loadTracks();
	
	$(".btn-export").click(() => { if (!isLoading) createPlaylist(tracks);	});
	$(".icon-prev").click(() => { if (!isLoading) changePage(-20); });
	$(".icon-next").click(() => { if (!isLoading) changePage(20); });
});

function loadTracks() {
	apiGetMySavedTracks()
		.then((data) => {

			tracksTotal = data.total;
			$(".page-count").text(`${tracksOffset + 1} - 20 of ${data.total}`);
			declutterLibraryTracks(data.items, tracks);
			printTableTracks_(tracks, 20, 0);
			updateProgressBar(50, tracksTotal);

			new Promise((resolve, reject) => loadAllTracksWrapper(resolve, data.total, data.next))
				.then((success) => {
					
					setTimeout(() => {
						// wait 1 second, so elements don't become enabled while the progress bar finishes it's animation
						isLoading = false;
						$(".pagination").removeClass("disabled");
						$(".btn-export").removeClass("disabled");
					}, 1000);
				})
				.catch((error) => {
					console.log("err: load saved");
				});
		})
		.catch((error) => console.log("err: load saved 2"));
}

async function loadAllTracksWrapper(resolve, total, nextUrl) {
	for (let i = 1; i < total / 50; i++) {
		countRequestsAndWait();
		if (nextUrl != null || nextUrl != "") {
			let data = await apiGetMySavedTracks(nextUrl);
			nextUrl = data.next;
			declutterLibraryTracks(data.items, tracks);
			updateProgressBar(50 * (i + 1), tracksTotal);
		}
	}

	resolve();
}

function createPlaylist(arr) {
	if (tracks == null || tracks.length == 0)
		return;

	// playlist name
	let name = `Liked Songs - ${new Date().toDateString().slice(4)}`;
	let description = "";

	let trackURIs = [];
	for (i in arr) {
		if (i == arr.length) break;
		trackURIs.push("spotify:track:" + arr[i].id);
	}

	updateProgressBar(10, tracks.length);
	apiCreatePlaylist(name, description)
		.then((data) => {			
			new Promise((resolve, reject) => 
				addAllTracksWrapper(resolve, reject, data.id, tracks, trackURIs)
			);
		})
		.catch((error) => {
			console.log("err: create playlist");
		});
}

async function addAllTracksWrapper(resolve, reject, playlistID, items, uris) {

	for (let i = 0; i < items.length / 100; i++) {
		let uris_ = uris.slice(i*100, (i*100)+100);
		await apiAddTracksToPlaylist(playlistID, uris_)
					.then((data) => {updateProgressBar((i+1)*100, items.length);})
					.catch((error) => console.log("err: add to playlist"));
	}

	resolve();
}

function changePage(n) {
	// remove existing rows
	$(".table .row:not(.header):not(.is-gone)").remove();

	tracksOffset += n;
	if (tracksOffset < 0)
		tracksOffset = 0;

	printTableTracks_(tracks, 20, tracksOffset);
	$(".page-count").text(`${tracksOffset + 1} - ${tracksOffset + 20 > tracksTotal ? tracksTotal : tracksOffset + 20} of ${tracksTotal}`);
}