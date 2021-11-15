let userStats = {liked: 0, public_p: 0, private_p: 0}
let currentTrack = {name: "", artists: "", image: ""};

$(function() {
	if (isLoggedIn()) myTasks();
	else {
		initLoginBtn();
		loginCallback = myTasks;
	}
});

// 1. print user info / which doesn't need additional data
// 2. get user's saved track count
// 3. get user's playlists
// 3a. count public / private playlists owned by user
// 4. printer user stats
// 5. get current playing
function myTasks() {
	apiGetMe().then((data) => {
			saveUser(data);
			printUser_();
		});
	printUser_();
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

			$(".player-text").html(`${currentTrack.name}<span> &bull; ${currentTrack.artists}`);
			$(".player-image").attr("src", currentTrack.image);
			$(".player-image-placeholder").removeClass("show");

			let a = $(".player-text-wrapper");
			let b = $(".player-text");

			if (b.width() > a.width())
				b.addClass("animate");
			else if (b.width() < a.width() && b.hasClass("animate"))
				b.removeClass("animate");

			setTimeout(() => getPlaying(), 15000);
		})
		.catch((error) => {
			console.log(error);
		});
}

// 

function initButtons() {
	$(".icon-logout").click(() => logout_());
	$(".icon-player-refresh").click(() => getPlaying());
	$(".icon-player-lyrics").click(() => searchLyrics());
}

function initLoginBtn() {
	$(".primary-box.show-login").click(function() {
		if (!isLoggedIn())
			apiAuthRedirect();
	});
}

//

function printUser_() {
	$(".primary-box").removeClass("show-login");
	$(".user-image").attr("src", user.image == null ? "placeholder.png" : user.image);
	$(".user-name").text(user.name);
}

function printUserStats() {
	$(".user-stats-1").text(userStats.liked);
	$(".user-stats-2").text(userStats.public_p);
	$(".user-stats-3").text(userStats.private_p);
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

	$(".primary-box").addClass("show-login");

	$(".user-image").attr("src", "placeholder.png");
	$(".user-name").text("Please sign in.");
	$(".user-stats-1").text("0");
	$(".user-stats-2").text("0");
	$(".user-stats-3").text("0");
	$(".player-image").attr("src", "placeholder.png");
	$(".player-image-placeholder").addClass("show");
	$(".player-text").html(`Nothing is playing`);
	$(".player-text").removeClass("animate");

	$(".primary-box").off("click"); // clear login btn listener, if not, since they are within the save div, clicking on logout also triggers login listener
	setTimeout(() => {  initLoginBtn(); }, 500); // delay is due to above comment. if we instantly re-init a listener, it'll be triggered.
}