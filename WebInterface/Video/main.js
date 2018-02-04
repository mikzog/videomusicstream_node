let video, int, videoSettingsElem;

function load() {
	video = document.querySelector('video');
	const videosElem = document.getElementById('videos');
	const seekBarElem = document.getElementById('seekBar');
	const timeEndElem = document.getElementById('time-end');
	const timeStartElem = document.getElementById('time-start');
	const overflowMenuElem = document.getElementById('overflow-menu');
	const videoTimeJumpElem = document.getElementById('video-time-jump');

	videoSettingsElem = document.getElementById('video-settings');
	fetch('/data/', {credentials: 'same-origin'}).then(response => {
		response.json().then(json => {
			if (!json.error) {
				const keys = Object.keys(json.video.videos);
				const addVideosToDiv = (arr, div) => {
					arr.forEach((object, key) => {
						div.innerHTML += `<button onclick="vidClick(event, '${object}')" draggable="true" ondragstart="drag(event)" class="video ${key}" id="${key}">${object}</button><hr>`;
					});
				}

				// document.body.querySelector('button[func=toggleCollapseAll]').style.display = 'hidden'; If more do this!
				if (Object.keys(json.video.videos).length < 2)
					document.getElementById('overflow-btn').style.display = 'none';

				if (json.video.subtitles) {
					if (json.video.subtitles.length > 0) {
						const selectElem = document.createElement('select');

						selectElem.addEventListener('change', evt => {
							const title = evt.currentTarget.value;

							if (title.length != 0 && title.length != '')
								setSubtitleTrack('/subtitle/' + title);
							else
								removeTracks(document.getElementsByTagName('video')[0]);

							toggleVideoSettingsWindow();
						});

						json.video.subtitles.unshift('');
						json.video.subtitles.forEach((object, key) => {
							const optionElem = document.createElement('option');

							optionElem.value = object;
							optionElem.innerText = object;

							selectElem.appendChild(optionElem);
						});

						document.getElementById('captions').parentElement.appendChild(selectElem);
					}
				}

				videosElem.innerHTML = '';
				if (keys.length > 1) {
					keys.forEach((object, key) => {
						const containerDiv = document.createElement('div');
						const titleButton = document.createElement('button');
						const videoDiv = document.createElement('div');

						titleButton.innerHTML = `<span>${object}</span><img src="/Assets/ic_keyboard_arrow_up_white.svg">`;
						titleButton.onclick = evt => {
							if (containerDiv.className.indexOf('closed') > -1)
								containerDiv.className = containerDiv.className.replace('closed', '');
							else
								containerDiv.className += 'closed';
						}

						addVideosToDiv(json.video.videos[object], videoDiv);
						containerDiv.appendChild(titleButton);
						containerDiv.appendChild(videoDiv);
						videosElem.appendChild(containerDiv);
					});
				} else {
					const vids = json.video.videos[keys[0]];

					if (vids.length > 0)
						addVideosToDiv(vids, videosElem);
					else
						videosElem.innerHTML = '<b style="display: block; margin-top: 10%">No video files found...<b>';
				}
			} else videosElem.innerHTML = '<b style="display: block; margin-top: 10%">No video files found...<b>';
		});
	}).catch(err => {
		videosElem.innerHTML = `<div style="text-align: center; margin-top:10%;"><h3>Oh no</h3><br><br><p>There was an error: <b>${err}</b></p></div>`;
		console.error('An error occurred', err);
	});

	video.onended = videoEnd;
	video.onplay = updateInterface;
	video.onpause = updateInterface;
	video.onclick = togglePlayState;
	video.ondblclick = toggleFullScreen;

	video.addEventListener("playing", evt => {
		document.getElementById('loader').style.opacity = '1';

		if (video.readyState == 4)
			document.getElementById('loader').style.opacity = '0';
	});

	video.addEventListener('timeupdate', evt => {
		seekBarElem.value = (video.currentTime / video.duration) * 100;

		if (video.duration) {
			timeStartElem.innerText = convertToReadableTime(Math.floor(video.currentTime));
			timeEndElem.innerText = `${convertToReadableTime(Math.floor(video.duration - video.currentTime))} - ${convertToReadableTime(Math.floor(video.duration))}`;
		} else {
			timeEndElem.innerText = '0s';
			timeStartElem.innerText = convertToReadableTime(Math.floor(video.currentTime));
		}
	});

	seekBarElem.addEventListener('input', evt => {
		if (video.src != '' && video.src != undefined)
			video.currentTime = video.duration / (evt.target.max / evt.target.value)
	});

	videoSettingsElem.getElementsByTagName('button')[0].addEventListener('click', evt => {
		evt.currentTarget.parentElement.style.display = 'none';
	});

	Array.from(overflowMenuElem.getElementsByTagName('button')).forEach((object, key) => {
		object.addEventListener('click', evt => {
			if (evt.currentTarget.hasAttribute('func'))
				eval(evt.currentTarget.getAttribute('func') + '()');

			overflowMenuElem.style.display = 'none';
		});
	});

	document.getElementById('overflow-btn').addEventListener('click', evt => {
		if (overflowMenuElem.style.display == 'block')
			overflowMenuElem.style.display = 'none';
		else
			overflowMenuElem.style.display = 'block';
	});

	document.getElementById('vidSpeed').addEventListener('change', evt => {
		video.playbackRate = evt.currentTarget.value;
		toggleVideoSettingsWindow();
	});

	document.getElementById('captions').addEventListener('change', evt => {
		setSubtitleTrack(evt.target.files[0]);
		toggleVideoSettingsWindow();
	});

	document.getElementById('back').addEventListener('click', evt => {
		const currentUrl = window.location.href;

		window.history.back();
		setTimeout(() => {
			if (currentUrl === window.location.href)
				window.location.href = '/';
		}, 100);
	});

	document.getElementById('playPause').addEventListener('click', togglePlayState);
	document.getElementById('fullScreen').addEventListener('click', toggleFullScreen);

	document.addEventListener('fullscreenchange', checkFullScreen, false);
	document.addEventListener('msfullscreenchange', checkFullScreen, false);
	document.addEventListener('mozfullscreenchange', checkFullScreen, false);
	document.addEventListener('webkitfullscreenchange', checkFullScreen, false);

	document.getElementById('settings-toggle').addEventListener('click', toggleVideoSettingsWindow);

	document.addEventListener('keyup', evt => {
		const skipAmount = Number(settings.skipAmount.val) || 5;

		if (evt.key == 'ArrowRight')
			jumpVideoTime(skipAmount, videoTimeJumpElem);
		else if (evt.key == 'ArrowLeft')
			jumpVideoTime(-skipAmount, videoTimeJumpElem);
		else if (evt.key == 'Space')
			togglePlayState();
	});

	// For plugins
	try {
		loaded();
	} catch (err) {}
}

function vidClick(evt, title) {
	if (evt.ctrlKey)
		enqueue(title);
	else
		playVid(title);
}

function checkFullScreen(evt) {
	if (isFullScreen())
		document.getElementById('fullScreen').querySelector('img').src = 'Assets/ic_fullscreen_exit_white.svg';
	else
		document.getElementById('fullScreen').querySelector('img').src = 'Assets/ic_fullscreen_white.svg';
}

function toggleFullScreen() {
	const elem = document.getElementById('player');
	const typePrefix = getFullScreenType(elem);

	if (isFullScreen()) {
		if (typePrefix.length < 1) document['exitFullscreen']();
		else document[typePrefix + 'ExitFullscreen']();
	} else {
		if (typePrefix.length < 1) elem['requestFullscreen']();
		else elem[typePrefix + 'RequestFullscreen']();
	}

	function getFullScreenType(elem) {
		if ('requestFullscreen' in elem) return '';
		if ('msRequestFullscreen' in elem) return 'ms';
		if ('mozRequestFullscreen' in elem) return 'moz';
		if ('webkitRequestFullscreen' in elem) return 'webkit';
	}
}

function isFullScreen() {
	return !((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
		(document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
		(document.mozFullScreen !== undefined && !document.mozFullScreen) ||
		(document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
}

function togglePlayState() {
	if (video.src != '') {
		const stateBtn = document.getElementById('playPause');

		if (video.paused == true) {
			video.play();
			stateBtn.childNodes[0].src = 'Assets/ic_pause_white.svg';
		} else if (video.paused == false) {
			video.pause();
			stateBtn.childNodes[0].src = 'Assets/ic_play_arrow_white.svg';
		} else console.error('WUT?');
	}
}

function playVid(title, notQueueTop) {
	video.src = '/video/' + title;
	video.play();

	console.log(title);

	if (!notQueueTop)
		queueTop(title);

	document.title = 'Video Stream - ' + title.replace('-', '');

	clearInterval(int);
	document.getElementById('songName').innerText = title;
	document.getElementById('autoplay').style.display = 'none';
	document.getElementById('playPause').childNodes[0].src = 'Assets/ic_pause_white.svg'
}

function videoEnd(evt) {
	if (getQueue().length > queueIndex) {
		let i = 1;
		const time = Number(settings.autoplayTime) || 10;
		const timeElem = document.getElementById('autoplay-time');
		const textElem = document.getElementById('autoplay').querySelector('span');

		document.getElementById('autoplay').style.display = 'flex';

		int = setInterval(() => {
			if (i <= time) {
				textElem.innerText = `Autoplay in: ${time - i}s`;
				timeElem.style.transform = `scaleX(${1 - (i / time)})`;
			} else {
				nextQueueItem();
				clearInterval(int);
				document.getElementById('autoplay').style.display = 'none';
				timeElem.style.transform = '';
			}

			i++;
		}, 1000);
	}
}

function updateInterface() {
	if (video.paused == true)
		document.getElementById('playPause').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	else if (video.paused == false)
		document.getElementById('playPause').querySelector('img').src = 'Assets/ic_pause_white.svg';
	else
		console.error('WUT?');
}

function convertToReadableTime(int) {
	let outp = '';
	let hours   = Math.floor(int / 3600);
	let minutes = Math.floor((int - (hours * 3600)) / 60);
	let seconds = int - (hours * 3600) - (minutes * 60);

	if (hours < 10) hours = "0"+hours;
	if (minutes < 10) minutes = "0"+minutes;
	if (seconds < 10) seconds = "0"+seconds;
	if (hours > 0) outp += hours + ':';

	outp += minutes + ':';
	outp += seconds;

	return outp;
}

function setSubtitleTrack(val) {
	const videoElem = document.getElementsByTagName('video')[0];
	let url = '';

	if (val instanceof File)
		url = window.URL.createObjectURL(file);
	else
		url = val;

	removeTracks(videoElem);
	addSubtitleTrack(url, videoElem);
}

function removeTracks(videoElem) {
	Array.from(videoElem.getElementsByTagName('track')).forEach((object, key) => {
		object.remove();
	});
}

function addSubtitleTrack(url, videoElem) {
	const trackElem = document.createElement('track');

	trackElem.src = url;
	trackElem.srclang = 'en';
	trackElem.kind = 'captions';
	trackElem.setAttribute('default', '');

	videoElem.appendChild(trackElem);
}

function toggleCollapseAll() {
	Array.from(document.querySelectorAll('#videos > div')).forEach((object, key) => {
		object.classList.toggle('closed');
	});
}

function toggleVideoSettingsWindow() {
	if (videoSettingsElem) {
		if (videoSettingsElem.style.display == 'block')
			videoSettingsElem.style.display = 'none';
		else
			videoSettingsElem.style.display = 'block';
	}
}

function jumpVideoTime(amount, parentElement) {
	amount = amount || 5;
	parentElement = parentElement || document.getElementById('videoTimeJumpElem');

	if (amount <= video.duration) {
		const elem = (amount > 0) ? parentElement.children[0] : parentElement.children[1];

		elem.animate([
			{opacity: 0},
			{opacity: 0},
			{opacity: 0.8},
			{opacity: 0}
			], {
				duration: 700,
				easing: 'ease-out'
			})

		return video.currentTime = video.currentTime + amount;
	}
}

document.addEventListener('DOMContentLoaded', load);