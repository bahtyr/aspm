let type;
let timeRange;

$(function() {
	readParams();
	prepareUI();
	initButtons();

	if (isLoggedIn()) myTasks();
	else loginCallback = myTasks;
});

function readParams() {
	const urlParams = new URLSearchParams(window.location.search);
	type = urlParams.has("type") ? urlParams.get("type") : "tracks";
	timeRange = urlParams.has("time_range") ? urlParams.get("time_range") : "short_term";
}

function prepareUI() {
	if (type == "tracks") {
		$(".radio-wrapper:nth-child(1) p:nth-child(2)").addClass("is-active");
		$(".radio-wrapper:nth-child(1) p:nth-child(3)").removeClass("is-active");
	} else if (type == "artists") {
		$(".radio-wrapper:nth-child(1) p:nth-child(2)").removeClass("is-active");
		$(".radio-wrapper:nth-child(1) p:nth-child(3)").addClass("is-active");
		prepareArtistsTable();
	}
}

function initButtons() {
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

function myRequest(type, time) {
	requestTopTracksArtists(type, time)
		.then((data) => {
			const content = JSON.parse(data["content"]);

			if (type == "tracks")
				printTableTracks(content["items"]);
			else if (type == "artists") {
				printTableArtists(content["items"]);
			}
		})
		.catch((error) => console.log(error));
}

function myTasks() {
	if (type == "tracks")
		myRequest("tracks", "short_term");
	else if (type == "artists") myRequest("artists", "short_term");
}