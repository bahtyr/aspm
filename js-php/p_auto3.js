let player = new Player();

$(window).on("resize", () => correctPlayerPosition());

$(function() {
	correctPlayerPosition();	
	player.initAnimator();
	player.requestTrack();

	$("#player__refresh").on("click", () => player.requestTrack());
	$("#player__lyrics").on("click", () => {
		Object.assign(document.createElement('a'), {
			target: '_blank',
			href: `https://www.google.com/search?q=${encodeURIComponent(`${player.track.name} ${getArtistsAsString(player.track.artists)} lyrics`)}`,
		}).click();
	});
});

function correctPlayerPosition() {
	const siteHeader = $(".site-header-wrapper");
	player.obj.this.css("right", siteHeader.css("margin-right"));
}