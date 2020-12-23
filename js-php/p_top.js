let type;
let timeRange;
let trending;

$(function() {
	readParams();
	prepareUI();
	initButtons();

	if (isLoggedIn()) requestWrapper();
	else loginCallback = requestWrapper;
});

// basics

function readParams() {
	const urlParams = new URLSearchParams(window.location.search);
	type = urlParams.has("type") ? urlParams.get("type") : "tracks";
	timeRange = urlParams.has("time_range") ? urlParams.get("time_range") : "short_term";
	trending = urlParams.has("trending") ? urlParams.get("trending") : 1;
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

	if (trending == 1) {
		$(".radio-wrapper:nth-child(2) p:nth-child(2)").addClass("is-active");
	} else if (timeRange == "short_term") {
		$(".radio-wrapper:nth-child(2) p:nth-child(2)").removeClass("is-active");
		$(".radio-wrapper:nth-child(2) p:nth-child(3)").addClass("is-active");
	} else if (timeRange == "medium_term") {
		$(".radio-wrapper:nth-child(2) p:nth-child(2)").removeClass("is-active");
		$(".radio-wrapper:nth-child(2) p:nth-child(4)").addClass("is-active");
	} else if (timeRange == "long_term") {
		$(".radio-wrapper:nth-child(2) p:nth-child(2)").removeClass("is-active");
		$(".radio-wrapper:nth-child(2) p:nth-child(5)").addClass("is-active");
	}
}

function prepareArtistsTable() {
	$("table th:nth-child(3)").text("Artist");
	$("table th:nth-child(4)").text("Popularity");
	$("table th:nth-child(5)").text("Genres");
	$("table th:nth-child(5)").text("Genres");
	$("table td:nth-child(5)").addClass("artist");
	$("table .image-wrapper").addClass("artist");
}

function initButtons() {
	$(".radio-wrapper:nth-child(1) p").click(function() {
		if ($(this).index() > 0) {
			if ($(this).index() == 1)
				type = "tracks";
			else if ($(this).index() == 2)
				type = "artists";
			window.location.href = window.location.href.match(/^[^\#\?]+/)[0] + "?type=" + type + "&time_range=" + timeRange + "&trending=" + trending;
		}
	});

	$(".radio-wrapper:nth-child(2) p").click(function() {
		if ($(this).index() > 0) {
			
			if ($(this).index() == 1)
				trending = 1;
			else trending = 0;

			if ($(this).index() <= 2)
				timeRange = "short_term";
			else if ($(this).index() == 3)
				timeRange = "medium_term";
			else if ($(this).index() == 4)
				timeRange = "long_term";

			window.location.href = window.location.href.match(/^[^\#\?]+/)[0] + "?type=" + type + "&time_range=" + timeRange + "&trending=" + trending;
		}
	});
}

// complex

function requestWrapper() {
	requestTopTracksArtists(type, timeRange)
		.then((data) => {
			const content = JSON.parse(data["content"]);
			handleData(content);
		})
		.catch((error) => console.log(error));
}

function handleData(data) {

	// trending data needs proccesing, print these first

	if (trending == 0) {
		if (type == "tracks") printTableTracks(data["items"]);
		else if (type == "artists") printTableArtists(data["items"]);
	}

	// cookie check for trends

	let cookie = parseCookie(timeRange);
	let trendCookie;

	if ((cookie == null || dateDiffInDays(cookie["date"]) < 6) && trending == 1){
		cookieOther = parseCookie("medium_term");
		if (cookieOther == null)
			cookieOther = parseCookie("long_term");
		if (cookieOther != null)
			trendCookie = cookieOther;
	} else if (cookie != null) {
		if (dateDiffInDays(cookie["date"]) > 6)
			trendCookie = cookie;
	}

	// trends print time

	if (trendCookie != null) {
		if (trending == 0) {
			printTrends(getTrends(trendCookie["items"], data["items"], false));
		} else {
			let arr = getTrends(trendCookie["items"], data["items"], true);
			let arrItems = [];
			let arrTrends = [];

			for (i in arr) {
				arrTrends.push(arr[i][0]);
				arrItems.push(arr[i][1]);
			}

			if (type == "tracks") printTableTracks(arrItems);
			else if (type == "artists") printTableArtists(arrTrends);

			printTrends(arrTrends);
		}
	} else {
		if (trending == 1) {
			if (type == "tracks") printTableTracks(data["items"]);
			else if (type == "artists") printTableArtists(data["items"]);
		}
	}

	// cookie save time
	if (cookie != null) {
		let dateDiff = dateDiffInDays(cookie["date"]);
		if (dateDiff > 6 && dateDiff < 14) {
			saveCookie(`${type}_${timeRange}_temp`, data["items"], Date.now());
		} else if (dateDiff > 13) {
			let cookieTemp = parseCookie(`${timeRange}_temp`);
			if (cookieTemp != null) {
				saveCookie(`${type}_${timeRange}`, cookie["items"], cookie["date"]);
				localStorage.removeItem(`${type}_${timeRange}_temp`);
			} else {
				saveCookie(`${type}_${timeRange}`, cookie["items"],
					new Date().setDate(new Date().getDate() - 7));
			}
		}
	} else {
		saveCookie(`${type}_${timeRange}`, data["items"], Date.now());
	}
}

// trend calculation & print

/**
 * return		a: [+2, -1, +4]
 *				b: [[+2, item], [-1, item], [+4, item]]
 */
function getTrends(old, new_, includeItems) {
	let trend = [];

	for (x in new_) {
		// same
		if (parseInt(x) < old.length && 
			new_[x]["id"] == old[x]["id"])
			if (includeItems) {}
			else trend.push(0);
		else {
			// up / down
			for (y in old) {
				if (new_[x]["id"] == old[y]["id"]) {
					if (includeItems) trend.push([y - x, new_[x]]);
					else trend.push(y - x);
					break;
				}
			}

			// new
			if (x == trend.length) {
				if (includeItems) trend.push([100, new_[x]]);
				else trend.push(100);
			}
		}
	}

	return trend;
}

function printTrends(arr) {
	for (let i = 0; i < 20; i++) {
		let tooltip;

		if (arr[i] == 100) {
			tooltip = "New";
			$(`tr:nth-child(${parseInt(i) + 3}) td:nth-child(1) svg:nth-child(3)`).removeClass("is-gone");
		} else if (arr[i] > 0){
			tooltip = "+" + arr[i];
			$(`tr:nth-child(${parseInt(i) + 3}) td:nth-child(1) svg:nth-child(1)`).removeClass("is-gone");
		} else if (arr[i] < 0) {
			tooltip = arr[i];
			$(`tr:nth-child(${parseInt(i) + 3}) td:nth-child(1) svg:nth-child(2)`).removeClass("is-gone");
		} else if (arr[i] = 0) {
			// this did not change
		}

		$(`tr:nth-child(${parseInt(i) + 3}) td:nth-child(1)`).attr("title", tooltip);
		$(`tr:nth-child(${parseInt(i) + 3}) td:nth-child(2)`).attr("title", tooltip);
	}
}

// simple functions

function dateDiffInDays(date) {
	return Math.floor((Date.now() - date) / 8.64e+7);
	//
}

function parseCookie(timeRange_) {
	let cookie = localStorage.getItem(`${type}_${timeRange_}`);
	return cookie == null ? null : JSON.parse(cookie);
}

function saveCookie(name, data, date) {
	localStorage.setItem(name,
		JSON.stringify({"items": data, "date": date}));
}