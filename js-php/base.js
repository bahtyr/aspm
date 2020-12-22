$(function() {
	initHeaderButtons();
	spotifyFlow();
});

function initHeaderButtons() {
	$(".darkmode-toggle").click(function() {
		$(".darkmode-toggle .icon-wrapper").toggleClass('active');
		$('body, .bar').toggleClass('dark');
	});
	$(".menu").click(function() {
		$(".site-header").toggleClass('is-expanded');
	});
	$(".login").click(() => requestAuthorization());
	$(".user-name").dblclick(() => logout());
}