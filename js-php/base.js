/**
 * TODO
 * 
 * a function to get atrists' name as string. (loop artists[i].name & use trim if long)
 */
$(function() {
	document.getElementsByTagName("body")[0].classList.add("animate");
	
	initHeaderButtons();

	readSpotifyCookies();
	printUserMaybe();
	authorizeMaybe();
});

// ---------------------------------------------------------------------------------------- API FUNCTIONS

let spotify = { code: "", accessToken: "", refreshToken: "", dateInMs: 0};
let user = { name: "", image: "", id: ""};
let loginCallback;

function readSpotifyCookies() {
	if (localStorage.spotify != null) {

		let spotify_ = JSON.parse(localStorage.spotify);
		if (spotify_.refreshToken != "") { // if refreshToken is not empty, other vals are also not empty, we can use it
			spotify = spotify_;

			// check if our tokens expired
			const timeDiff = Math.floor((Date.now() - spotify.dateInMs) / 1000);
			if (timeDiff >= 3600)
				apiGetTokensHandler(1);
			else setTimeout(() => apiGetTokensHandler(1), (3600 - timeDiff) * 1000); // start expiration timer
		}
	}
}

function printUserMaybe() {
	if (isLoggedIn()) {
		if (localStorage.user != null) {
			user = JSON.parse(localStorage.user);
			printUser();
		}
	}
}

function authorizeMaybe() {
	if (!isLoggedIn()) {
		const urlParams = new URLSearchParams(window.location.search);

		if(urlParams.has("code")) {
			spotify.code = urlParams.get("code");
			apiGetTokensHandler(0);
		}
	}
}

/**
 * 1 - Request tokens & save. 
 * 2 - If first time request user data.
 * 3 - Run loginCallback()
 *
 * A apiGetTokens() wrapper, the function was being called multiple times.
 */
function apiGetTokensHandler(request) {
	apiGetTokens(request)
		.then((data) => {
			const content = JSON.parse(data["content"]);

			const isFirstTime = content["refresh_token"] != null;

			if (isFirstTime)
				saveSpotifyAuthData(spotify.code, content["access_token"], content["refresh_token"]);
			else saveSpotifyAuthData(spotify.code, content["access_token"], spotify.refreshToken);

			if (isFirstTime) {
				apiGetMe()
					.then((data) => {
						saveUser(data);
						printUser();
						if (loginCallback instanceof Function)
							loginCallback();
					})
					.catch((error) => console.log(error));
			} else {
				if (loginCallback instanceof Function)
					loginCallback();
			}
		})
		.catch((error) => {
			console.log(error);
		});
}

function saveSpotifyAuthData(code, accessToken, refreshToken) {
	spotify.code = code;
	spotify.accessToken = accessToken;
	spotify.refreshToken = refreshToken;
	spotify.dateInMs = Date.now();
	localStorage.setItem("spotify", JSON.stringify(spotify));
	if (spotify.refreshToken != "")
		setTimeout(() => apiGetTokens(1), 3600 * 1000);
}

function saveUser(data) {
	user.name = data["display_name"];
	user.image = getAnImageFromArray(data["images"]);
	user.id = data["id"];

	localStorage.setItem("user", JSON.stringify(user));
}

function logout() {
	spotify.code = "";
	spotify.accessToken = "";
	spotify.refreshToken = "";
	spotify.dateInMs = 0;
	localStorage.removeItem("spotify");

	user.name = "";
	user.image = "";
	user.id = "";
	localStorage.removeItem("user");

	$(".login").removeClass("is-gone");
	$(".user-name").addClass("is-gone");
}

function isLoggedIn() {
	return spotify.code != "" && spotify.accessToken != "" && spotify.refreshToken != "";
	//
}

// ---------------------------------------------------------------------------------------- PRINTERS

function showWarning(text, autoHide) {
	const sticky = $(".sticky-top");
	const stickyText = $(".sticky-top p");
	stickyText.text(text);
	sticky.removeClass("is-hidden");
	if (autoHide)
		setTimeout(() =>  sticky.addClass("is-hidden"), 2000);
}

function printUser() {
	$(".login").addClass("is-gone");
	$(".user-name").removeClass("is-gone").text(user.name);
}

function printTableTracks(items, limit) {
	let limit_ = limit != 0 ? limit : items.length
	let list = [];
	const template = $("table tr")[1].outerHTML;

	for (let i = 0; i < limit_; i++) {
		if (i == items.length) break;

		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		holder.find("td:nth-child(2)").text(i + 1);
		holder.find("td:nth-child(3) img").attr("src", getAnImageFromArray(items[i]["album"]["images"]));
		holder.find("td:nth-child(3) span").text(trimmedText(items[i]["name"], 25));

		// ARTISTS
		holder.find("td:nth-child(4)").text(trimmedText(items[i]["artists"][0]["name"], 25));

		// ALBUM
		holder.find("td:nth-child(5)").text(trimmedText(items[i]["album"]["name"], 25));

		list.push(holder);
	}

	$("table").append(list);
}

function printTableArtists(items) {
	let list = [];
	const template = $("table tr")[1].outerHTML;

	for (let i = 0; i < 20; i++) {
		if (i == items.length) break;
		
		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		// NO
		holder.find("td:nth-child(2)").text(i + 1);

		// IMAGE
		holder.find("td:nth-child(3) img").attr("src", getAnImageFromArray(items[i]["images"]));
		
		// TITLE
		holder.find("td:nth-child(3) span").text(trimmedText(items[i]["name"], 25));

		// POPULARITY
		holder.find("td:nth-child(4)").text(items[i]["popularity"]);

		// GENRES
		if (items[i]["genres"].length > 0)
			holder.find("td:nth-child(5)").text(items[i]["genres"].join("\r\n"));
		else holder.find("td:nth-child(5)").text("");

		list.push(holder);
	}

	$("table").append(list);
}

// ---------------------------------------------------------------------------------------- SITE HEADER & DARK MODE

function initHeaderButtons() {
	$(".darkmode-toggle").click(() => enableDarkMode(localStorage.darkMode == 0 ? 1 : 0));
	$(".menu").click(() => $(".site-header").toggleClass('is-expanded'));
	// $(".login").click(() => apiAuthRedirect());
	// $(".user-name").dblclick(() => logout());
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

// ---------------------------------------------------------------------------------------- ETC

/**
 * Validates image array, sends null if empty.
 * 
 * @params {array}	arr 			Spotify image array.
 * @params {int}	priority 		Optional. 0: Highest resolution, 2: Lowest resolution.
 * @result {string}					Returns an image url. Attempts to return priority resolution, if not returns highest resolution.
 */
function getAnImageFromArray(arr, priority) {
	if (arr == null || !Array.isArray(arr) || arr.length == 0)
		return "placeholder.jpg";

	if (priority == null)
		priority = 0;

	while (priority >= arr.length) {
		priority--;
	}

	return arr[priority]["url"];
}

/**
 * Returns the string with ellipsis at end if its longer than desired.
 * 
 * @params {string}	str 			String
 * @params {int}	length 			Max length
 * @result {string}					String...
 */
function trimmedText(str, length) {
	if (str.length > (length == null ? 25 : length))
		return str.substr(0, (length == null ? 25 : length)) + "...";
	return str;
}

// ---------------------------------------------------------------------------------------- NEW

// Count requests made and wait if necessary
let requestCounter = 0;
async function countRequestsAndWait() {
	requestCounter++;
	if (requestCounter % 20)
		await new Promise((resolve, reject) => setTimeout(() => resolve(), 5000)); 
}

function updateProgressBar(x, y) {
	const p = $(".top-progress-bar");

	p.css("width", `${x*100/y}%`);

	if (x >= y) {
		setTimeout(() => {
			p.css("transition", "none");
			p.css("width", "0");
			setTimeout(() => p.css("transition", ""), 200);
		}, 1000);
	}
}

// A function to only keep essential data from a track items array
function declutterLibraryTracks(arr, newArr) {
	for(i in arr) {
		let temp = {};
		temp.id = arr[i].track.id;
		temp.name = arr[i].track.name;
		temp.artists = [];

		for (y in arr[i].track.artists) {
			let tempY = {};
			tempY.id = arr[i].track.artists[y].id;
			tempY.name = arr[i].track.artists[y].name;
			temp.artists.push(tempY);
		}

		temp.album = {images: [{}]};
		temp.album.id = arr[i].track.album.id;
		temp.album.name = arr[i].track.album.name;

		let imgArrLength = arr[i].track.album.images.length;
		if (imgArrLength > 0)
			temp.album.images[0].url = arr[i].track.album.images[imgArrLength > 2 ? 1 : 0].url;
		else temp.album.images[0].url = "";

		temp.dateAdded = arr[i].added_at;

		newArr.push(temp);
	}
}

// Returns a date in "Jan 21, 2021" format
function getDateWithComma(str) {
	let d = new Date(str).toDateString();
	let s = d.slice(4, 10);
	if (s.charAt(4) == "0") s = s.slice(0, 4) + s.slice(5);
	return s + ',' + d.slice(10);
}

// !important: uses a decluttered tracks items list
function printTableTracks_(items, limit, offset) {
	limit = limit != null && limit != 0 ? limit : items.length;
	offset = offset != null && offset != 0 ? offset : 0;
	let list = [];
	const template = $(".table .row")[1].outerHTML;

	for (let i = offset; i < offset + limit; i++) {
		if (i == offset + limit) break;

		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		//

		let name = items[i].name;
		let artists = "";
		let album = items[i].album.name;
		let dateAdded = getDateWithComma(items[i].dateAdded);

		for (y in items[i].artists) {
			if (y > 0) artists += ", ";
			artists += items[i].artists[y].name;
		}

		holder.find("span:nth-child(2)").attr("title", name);
		holder.find("span:nth-child(3)").attr("title", artists);
		holder.find("span:nth-child(4)").attr("title", album);

		holder.find("span:nth-child(1)").text(i + 1);
		holder.find("span:nth-child(2)").text(trimmedText(name, 50));
		holder.find("span:nth-child(3)").text(trimmedText(artists, 25));
		holder.find("span:nth-child(4)").text(trimmedText(album, 25));
		holder.find("span:nth-child(5)").text(dateAdded);

		list.push(holder);
	}

	$(".table").append(list);
}

function printTableArtists_(items, limit, offset) {
	limit = limit != null && limit != 0 ? limit : items.length;
	offset = offset != null && offset != 0 ? offset : 0;
	let list = [];
	const template = $(".table .row")[1].outerHTML;

	for (let i = offset; i < offset + limit; i++) {
		if (i == offset + limit) break;

		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		let name = items[i].name;

		holder.find("span:nth-child(1)").text(i + 1);
		holder.find("span:nth-child(2)").text(trimmedText(name, 50));
		holder.find("span:nth-child(3)").text("");
		holder.find("span:nth-child(4)").text("");

		list.push(holder);
	}

	$(".table").append(list);
}

function printPlaylists(items, limit, offset, elementID) {
	limit = limit != null && limit != 0 ? limit : items.length;
	offset = offset != null && offset != 0 ? offset : 0;
	let list = [];
	const template = $(".item")[0].outerHTML;

	for (let i = offset; i < offset + limit; i++) {
		if (i == offset + limit) break;

		let holder = $($.parseHTML(template));
		holder.removeClass("is-gone");

		holder.find(".image").attr("src", getAnImageFromArray(items[i].images));
		holder.find(".text").text(trimmedText(items[i]["name"], 30));

		if (items[i].public)
			holder.addClass("is-public");
		else holder.removeClass("is-public");

		list.push(holder);
	}

	// add empty elements at the of the grid to properly align the last row of tiles
	for (let i = 0; i < 6; i++) {
		let holder = $($.parseHTML(template));
		holder.addClass("is-filler");
		holder.removeClass("is-gone");
		list.push(holder);
	}

	$(elementID != null ? elementID : ".item-list").append(list);
}

// ---------------------------------------------------------------------------------------- MODAL

class Modal {
	modal;
	modalBox;
	stacks = {};
	activeStack;
	dismissListener;
	dismissAction = this.hide;

	/**
	 * Use default modal selctor if a certain selector is not given.
	 */
	constructor(selector) {
	    this.modal = $(selector == null ? ".modal" : selector);
	    this.initDismiss();
	}

	show() {
		this.modal.addClass("show");
		this.modal.removeClass("hide");
	}

	hide() {
		this.modal.addClass("hide");
		this.modal.removeClass("show");
		this.callAndClearOnDimissListener();
	}

	/**
	 * Tapping on an empty area triggers @dismissAction. Hides the modal by default.
	 */
	initDismiss() {
		this.modal.find(".modal__dismiss-area").click((e) => {
			// check if the clicked target is actually the dismiss area and not part of the modal
			if ($(e.target).attr("class") != null &&  
				$(e.target).attr("class").includes("modal__dismiss-area")) {
				if (this.dismissAction != null && this.dismissAction instanceof Function) {
					this.dismissAction(); // hide modal or do the changed dismisse action
					this.callAndClearOnDimissListener();
				}
			}
		});	
	}

	/**
	 * Hides or shows the "Dismiss" text at bottom of the modal. Commonly used with stacked modals.
	 */
	hideDismissMesage(boo) {
		const dismissText = this.modal.find(".modal__dismiss-area__text");

		if (boo) dismissText.css("visibility", "hidden");
		else dismissText.css("visibility", "visible");
	}


	/**
	 * A callback funtion initializer. Called when the modal is dismissed.
	 */
	onDismiss(fn) {
		//
		this.dismissListener = fn;
	}


	/**
	 * Run dismissListener function if valid, then clear it. Only one use of dismissListener is allowed for now.
	 */
	callAndClearOnDimissListener() {
		if (this.dismissListener != null && this.dismissListener instanceof Function) {
			this.dismissListener();
			this.dismissListener = null;
		}
	}

	/**
	 * 
	 */
	clearOnDismiss() {
		//
		this.dismissListener = null;
	}

	/**
	 * Changes the @dismissAction. Commonly used with stacked modals, to switch back to previous stack upon clicking on an empty area.
	 */
	changeDismissAction(fn) {
		//
		this.dismissAction = fn;
	}

	/**
	 * Resets the @dismissAction back to hide the modal. Commonly used with stacked modals, after the action is altered.
	 */
	resetDismissAction() {
		//
		this.dismissAction = this.hide;
	}

	/**
	 * Creates and finds stack elements. 
	 * A stack must be active, and there can only be one active stack at a time.
	 * 
	 * @params {string}  selector 			Selector of the stack, preferablly an id.
 	 * @params {boolean} isActive 			Set true, if the stack is initially visible.
	 */
	addStack(selector, isActive) {
		this.stacks[selector] = {obj: $(selector), isActive: isActive};
		this.activeStack = isActive ? selector : this.activeStack;

		if (isActive) {
			this.modalBox = this.modal.find(".modal__box");
			this.modalBox.height(this.stacks[selector].obj.outerHeight());
			this.modalBox.width(this.stacks[selector].obj.outerWidth());
		}
	}

	/**
	 * Hides the active stack and show the given one. Requires stacks to be initialied beforehand with @addStack function.
	 */
	showStack(selector) {
		this.stacks[this.activeStack].obj.addClass('hide');
		this.stacks[this.activeStack].obj.removeClass('show');
		this.stacks[selector].obj.addClass('show');
		this.stacks[selector].obj.removeClass('hide');
		this.activeStack = selector;

		this.modalBox.height(this.stacks[selector].obj.outerHeight());
		this.modalBox.width(this.stacks[selector].obj.outerWidth());

		/** 
		 * Caution, if a stack is suppose to be full-page sized modalBox' width / height needs to be auto
		 * "full-page stack" functionality is omitted intentionally, 
		 * because smooth transition between stacks was not achived and I wanted to be able to use both stacks separately,
		 * but transition animation would play each time modal opens, didn't want to clutter the page with that.
		 */
	}
}