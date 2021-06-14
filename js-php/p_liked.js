let tracksOffset = 0;
let tracksTotal = 0;
let tracks = [];
let playlist = {id: "", name: "", description: "", image: "", isPublic: true};
let isLoading = true;

$(function() {
	if (!isLoggedIn()) return;

	loadTracks();
	
	$(".btn-export").click(() => { if (!isLoading) createPlaylist(tracks);	});
	$(".icon-prev").click(() => { if (!isLoading) changePage(-20); });
	$(".icon-next").click(() => { if (!isLoading) changePage(20); });

	initShareButtons();
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

	isLoading = true;
	playlist = {id: "", name: "", description: "", image: "", isPublic: true};

	// playlist name
	const months = ["January", "February", "March", "April", "May", "June", "July", "August", "Septempber", "October", "November", "December"];
	let name = `${user.name.split(/[ ,]+/)[0]}'s Collection`;
	let description = `Created on ${months[new Date().getMonth()]} ${new Date().getFullYear()}`;

	let trackURIs = [];
	for (i in arr) {
		if (i == arr.length) break;
		trackURIs.push("spotify:track:" + arr[i].id);
	}

	playlist.name = name;
	playlist.description = description;

	updateProgressBar(10, tracks.length);

	// create playlist
	apiCreatePlaylist(name, description)
		.then((data) => {

			playlist.id = data.id;

			// add tracks
			new Promise((resolve, reject) => 
				addAllTracksWrapper(resolve, reject, playlist.id, tracks, trackURIs))
				.then(() => {

					// get info
					apiGetPlaylistInfo(playlist.id, 1)
						.then((data) => {

							playlist.image = data.images[2].url;

							setTimeout(() => {

								isLoading = false;
	
								// show dialog
								$(".modal-playlist-image").attr("src", playlist.image);
								$(".modal-playlist-name").text(playlist.name);
								$(".modal-playlist-description").text(playlist.description);
								$(".modal .description").text(`${tracks.length} songs were added to your newly created playlist.`);

								showModal(true);
							}, 1000);						

						})
						.catch((error) => console.log("err: get playlist info"));
				});
		})
		.catch((error) => {
			console.log("err: create playlist");
		});
}

async function addAllTracksWrapper(resolve, reject, playlistID, items, uris) {

	for (let i = 0; i < items.length / 100; i++) {
		let uris_ = uris.slice(i*100, (i*100)+100);
		await apiAddTracksToPlaylist(playlistID, uris_)
					.then((data) => updateProgressBar((i+1)*100, items.length))
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

function initShareButtons() {
	$(".btn-private").click(() => {
		if (isLoading || playlist.id == null || playlist.id == '') return;

		isLoading = true;
		updateProgressBar(1, 2);
		apiUpdatePlaylistInfo(playlist.id, playlist.name, playlist.description, !playlist.isPublic)
			.then(() => {
				updateProgressBar(2, 2);
				isLoading = false;
				playlist.isPublic = !playlist.isPublic;
				$(".btn-private").text(playlist.isPublic ? "Make Private" : "Make Public");
			})
			.catch((error) => console.log("err: playlist set public"));
	});

	$(".btn-share").click(function() {
		navigator.share({ title: '', text: '', url: 'https://open.spotify.com/playlist/' + playlist.id});
	});
}