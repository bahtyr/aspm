let userStats = {liked: 0, public_p: 0, private_p: 0}
let currentTrack = {name: "", artists: "", image: ""};

$(function() {
	document.getElementsByTagName("body")[0].classList.add("animate");
	if (isLoggedIn()) myTasks();
	else loginCallback = myTasks;
});

// 1. print user info / which doesn't need additional data
// 2. get user's saved track count
// 3. get user's playlists
// 3a. count public / private playlists owned by user
// 4. printer user stats
// 5. get current playing
function myTasks() {
	printUser();
	getSaved();
	initButtons();
}

function getSaved() {
	apiGetMySavedTracks("", "1")
		.then((data) => {
			userStats.liked = data.total;
			getPlaylists();
		})
		.catch((error) => console.log(error));
}

function getPlaylists() {
	apiGetMyPlaylists()
		.then((data) => {

			for (i in data) {
				if (data[i].owner.id == user.id) {
					if (data[i].public)
						userStats.public_p++;
					else userStats.private_p++;
				}
			}

			printUserStats();
			getPlaying();
		})
		.catch((error) => {});
}

function getPlaying() {
	apiGetCurrentlyPlayingTrack()
		.then((data) => {
			if (data == null || data.item == null) {
				return;
			}

			currentTrack.name = data.item.name;
			currentTrack.artists = "";
			for (i in data.item.artists) {
				if (currentTrack.artists.length > 0)
					currentTrack.artists += ", ";
				currentTrack.artists += data.item.artists[i].name;
			}

			currentTrack.image = data.item.album.images[data.item.album.images.length - 2].url;

			$(".index-player p").html(`${currentTrack.name}<span> &bull; ${currentTrack.artists}`);
			$(".index-player img").attr("src", currentTrack.image);

			let a = $(".index-player .text-wrapper");
			let b = $(".index-player .text-wrapper p");

			if (b.width() > a.width())
				b.addClass("animate");
			else if (b.width() < a.width() && b.hasClass("animate"))
				b.removeClass("animate");
		})
		.catch((error) => {
			console.log(error);
		});
}

// 

function initButtons() {
	$(".index-user svg").click(() => logout_());
	$(".index-player svg:nth-child(3)").click(() => getPlaying());
	$(".index-player svg:nth-child(4)").click(() => searchLyrics());
}

//

function printUser() {
	$(".index-user img").attr("src", user.image);
	$(".index-user .left p").text(user.name);
}

function printUserStats() {
	$(".index-user .bottom-wrapper div:nth-child(1) p:nth-child(1)").text(userStats.liked);
	$(".index-user .bottom-wrapper div:nth-child(2) p:nth-child(1)").text(userStats.public_p);
	$(".index-user .bottom-wrapper div:nth-child(3) p:nth-child(1)").text(userStats.private_p);
}

function searchLyrics() {
	Object.assign(document.createElement('a'), {
		target: '_blank',
		href: `https://www.google.com/search?q=${encodeURIComponent(`${currentTrack.name} ${currentTrack.artists} lyrics`)}`,
	}).click();
}

function logout_() {
	spotify.code = "";
	spotify.accessToken = "";
	spotify.refreshToken = "";
	spotify.dateInMs = 0;
	localStorage.removeItem("spotify");

	user.name = "";
	user.image = "";
	user.id = "";
	localStorage.removeItem("user");

	$(".index-user img").attr("src", "placeholder.jpg");
	$(".index-user .left p").text("Please sign in.");
	$(".index-user .bottom-wrapper div:nth-child(1) p:nth-child(1)").text("0");
	$(".index-user .bottom-wrapper div:nth-child(2) p:nth-child(1)").text("0");
	$(".index-user .bottom-wrapper div:nth-child(3) p:nth-child(1)").text("0");
	$(".index-player p").html(`Nothing is playing.`);
	$(".index-player img").attr("src", "placeholder.jpg");
}