let type = "tracks";
let timeRange = "short_term";
let data;
let isLoading = false;
let playlist
let modal = new Modal();

$(function() {

	requestData();
	initListeners();
});

function requestData() {
	isLoading = true;
	updateProgressBar(4, 4);
	apiGetMyTop(type, timeRange)
		.then((result) => {
			data = JSON.parse(result["content"]);
			data.items = data.items.splice(0, 20);
			attemptToPrint();
			isLoading = false;
		})
		.catch((error) => console.log(error));
		// .catch((error) => showWarning("An error occured. Please try again.", true));
}

function initListeners() {
	// timeRange
	$(".tab__item").click(function() {
		if (isLoading) return;

		$(".tab__item").removeClass("is-active");
		$(this).addClass("is-active");

		const tab1 = $(".tab__item:nth-child(1)");
		const tab2 = $(".tab__item:nth-child(2)");
		const tab3 = $(".tab__item:nth-child(3)");

		if (tab1.hasClass("is-active")) timeRange = "short_term";
		else if (tab2.hasClass("is-active")) timeRange = "medium_term";
		else if (tab3.hasClass("is-active")) timeRange = "long_term";

		requestData();
	});

	// type
	let boo = true;
	$(".swap-text").click(function() {
		if (isLoading) return;

		if (boo) {
			$(".swap-text").addClass("up");
			$(".swap-text").removeClass("down");
			type = "artists";			
		} else {
			$(".swap-text").removeClass("up");
			$(".swap-text").addClass("down");
			type = "tracks";
		}
		
		boo = !boo;
		requestData();
	});

	// create playlist
	$(".btn-export").click(function() {
		if (isLoading) return;

		if (type == "tracks") createPlaylist(data.items);
	});
}

function attemptToPrint() {
	$(".table .row:not(.header):not(.is-gone)").remove(); // remove existing content

	if (type == "tracks")
		$(".btn-export").removeClass("disabled");
	else $(".btn-export").addClass("disabled");

	if (type == "tracks")
		printTableTracks_(data.items, 20);
	else printTableArtists_(data.items, 20);

	if (type == "tracks") {
		$(".table .header span:nth-child(2)").text("Track");
		$(".table .header span:nth-child(3)").text("Artist");
		$(".table .header span:nth-child(4)").text("Album");
	} else {
		$(".table .header span:nth-child(2)").text("Artist");
		$(".table .header span:nth-child(3)").text("");
		$(".table .header span:nth-child(4)").text("");
	}
}

// PLAYLIST CREATION

function createPlaylist(arr) {
	if (data.items == null || data.items.length == 0)
		return;

	isLoading = true;

	// playlist name
	const months = ["January", "February", "March", "April", "May", "June", "July", "August", "Septempber", "October", "November", "December"];
	let name = `Top Tracks`;
	let description = `Created on ${months[new Date().getMonth()]} ${new Date().getFullYear()}`;

	let trackURIs = [];
	for (i in arr) {
		if (i == arr.length) break;
		trackURIs.push("spotify:track:" + arr[i].id);
	}

	playlist = {id: "", name: "", description: "", image: "", isPublic: true};
	playlist.name = name;
	playlist.description = description;

	updateProgressBar(10, data.items.length);

	// create playlist
	apiCreatePlaylist(name, description)
		.then((result) => {

			playlist.id = result.id;

			// add tracks
			new Promise((resolve, reject) => 
				addAllTracksWrapper(resolve, reject, playlist.id, data.items, trackURIs))
				.then(() => {

					// get info
					apiGetPlaylistInfo(playlist.id, 1)
						.then((result) => {

							setTimeout(() => {

								isLoading = false;
	
								// show dialog
								$(".modal__playlist-header img").attr("src", getAnImageFromArray(result.images, 1));
								$(".modal__playlist-header p.primary").text(playlist.name);
								$(".modal__playlist-header p.secondary").text(playlist.description);
								$(".modal__message").text(`${data.items.length} songs were added to your newly created playlist.`);

								modal.show();
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