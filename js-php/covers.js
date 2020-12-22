let playlists;
let selectedPlaylistID;

$(function() {
	if (isLoggedIn) {
		requestCurrentUserPlaylists()
			.then((result) => {
				playlists = result;
				listenPlaylistClick();
				listenImagePicker();
			})
			.catch((error) => {});

		// if (isLoaded) {
			// console.log("helo");
		// } else console.log('asdf');
	}
});

//Add listener to playlist items to trigger image picker on click.
function listenPlaylistClick() {
	$(".image-item").click(function() {
		let i = $(this).index() - 1; //substract hidden element
		selectedPlaylistID = playlists[i]["id"];
		$("#input-image-picker").click();
	});
}

//Add listener to image-picker to load the image, validate and update playlist cover.
function listenImagePicker() {
	$("#input-image-picker").change(function() {
		let f = $(this)[0].files[0];
		$(this).val(null); //reset file picker
		
		// TODO show loading
		promieFileBase64(f) //read image (to base64)
			.then(result => {
				let img = new Image();
				img.src = result;
				img.onload = () => { //load image to validate
					if (validateNewPlaylistImage(f["type"], f["size"], img.width, img.height)) //finally put
						putPlaylistCover(selectedPlaylistID, result.substr(23));
					// {}
				}
			})
			.catch(error => {
				window.alert("Failed to upload selected image.");
				console.log("Promise failed to read file.");
				console.log(error);
			});
	});
}

function validateNewPlaylistImage(fileType, fileSize, imgWidth, imgHeight) {
	let isOK = true;
	let msg = "Error";
	const err = {
		fileType: "Image must be in JPEG format, it is ",
		fileSize: "File size must be less then 250KB, it is ",
		imgSize: "Image is too small, it must be at least 300x300, it is "
	};

	if (fileType.substr(6) != "jpeg") {
		msg += "\r\n" + err.fileType + fileType.substr(6) + ".";
		isOK = false; 
	}

	if (fileSize > 256000) {
		msg += "\r\n" + err.fileSize + Math.floor(fileSize / 1000) + "KB.";
		isOK = false;
	}

	if (imgWidth < 300 && imgHeight < 300) {
		msg += "\r\n" + err.imgSize + imgWidth + "x" + imgHeight + ".";
		isOK = false;
	}

	if (!isOK) 
		window.alert(msg);
	return isOK;
}


function promieFileBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload =  () => resolve(reader.result);
		reader.onerror = error => reject(error);
	});
}