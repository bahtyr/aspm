$(function() {
	loadDarkModePref();
	initHeaderButtons();
	spotifyFlow();
});

function initHeaderButtons() {
	$(".darkmode-toggle").click(() => enableDarkMode(localStorage.darkMode == 0 ? 1 : 0));
	$(".menu").click(() => $(".site-header").toggleClass('is-expanded'));
	$(".login").click(() => requestAuthorization());
	$(".user-name").dblclick(() => logout());
}

function loadDarkModePref() {
	if (localStorage.darkMode == null)
		localStorage.darkMode = 0;
	else enableDarkMode(localStorage.darkMode == 0 ? 0 : 1);
}

function enableDarkMode(yes) {
	if (yes) {
		localStorage.darkMode = 1;
		$(".darkmode-toggle .icon-wrapper:nth-child(1)").removeClass('active');
		$(".darkmode-toggle .icon-wrapper:nth-child(2)").addClass('active');
		$('body, .bar').addClass('dark');
	} else {
		localStorage.darkMode = 0;
		$(".darkmode-toggle .icon-wrapper:nth-child(1)").addClass('active');
		$(".darkmode-toggle .icon-wrapper:nth-child(2)").removeClass('active');
		$('body, .bar').removeClass('dark');
	}
}