let currentTrack = {};
let isFirst = true;


$(function() {
	$(".popup-page").removeClass("is-gone");
	// popup element has is-gone attribute to hide its animation when the page is first loaded,
	// it has done it's purpose it can now be removed

	getCurrentlyPlaying();
	// -> searchLyrics();

	initButtons();

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

// Currently Playing

function getCurrentlyPlaying() {
	apiGetCurrentlyPlayingTrack()
		.then((data) => {
			if (data == null || data["item"] == null) {
				showWarning("Error: Nothing is playing currently, make sure private session is disabled.", true);
				return;
			}

			currentTrack.name = data["item"]["name"];
			currentTrack.uri = data["item"]["uri"];
			currentTrack.image = getAnImageFromArray(data["item"]["album"]["images"]);
			currentTrack.artists = "";
			for (i in data["item"]["artists"]) {
				if (currentTrack.artists.length > 0)
					currentTrack.artists += ", ";
				currentTrack.artists += data["item"]["artists"][i]["name"];
			}


			$(".currently-playing p:nth-child(1)").text(`${currentTrack.name}`);
			$(".currently-playing p:nth-child(2)").text(`${currentTrack.artists.toString()}`);
			if (currentTrack.image != null)
				$(".currently-playing img").attr('src', currentTrack.image);

			if(!isFirst)
				searchLyrics();
			isFirst = false;
		})
		.catch((error) => {
			console.log(error);
			showWarning("An error occured, please try again.", true);
		});
}

function searchLyrics() {
	Object.assign(document.createElement('a'), {
		target: '_blank',
		href: `https://www.google.com/search?q=${encodeURIComponent(`${currentTrack.name} lyrics`)}`,
	}).click();
}
