$(function() {
	initButtons_();
	
	const urlParams = new URLSearchParams(window.location.search);
	let type = "tracks";
	let timeRange = "short_term";
	
	// read params
	if(urlParams.has("type"))
		type = urlParams.get("type");
	if(urlParams.has("time_range"))
		timeRange = urlParams.get("time_range");
	
	// update radio selection
	if (type == "tracks") {
		$(".radio-wrapper:nth-child(1) p:nth-child(2)").addClass("is-active");
		$(".radio-wrapper:nth-child(1) p:nth-child(3)").removeClass("is-active");
	} else if (type == "artists") {
		$(".radio-wrapper:nth-child(1) p:nth-child(2)").removeClass("is-active");
		$(".radio-wrapper:nth-child(1) p:nth-child(3)").addClass("is-active");

		prepareArtistsTable();
	}

	// make the requests
	if (isLoggedIn) {
		if (type == "tracks")
			requestTopTracksArtists("tracks", "short_term");
		else if (type == "artists") requestTopTracksArtists("artists", "short_term");
	}
});

function initButtons_() {
	$(".radio-wrapper:nth-child(1) p").click(function() {
		if ($(this).index() > 0) {
			let type = "tracks";
			if ($(this).index() == 1)
				type = "tracks";
			else if ($(this).index() == 2)
				type = "artists";
			window.location.href = window.location.href.match(/^[^\#\?]+/)[0] + "?type=" + type;
		}
	})
}

function prepareArtistsTable() {
	$("table th:nth-child(3)").text("Artist");
	$("table th:nth-child(4)").text("Popularity");
	$("table th:nth-child(5)").text("Genres");
	$("table th:nth-child(5)").text("Genres");
	$("table td:nth-child(5)").addClass("artist");
	$("table .image-wrapper").addClass("artist");
}