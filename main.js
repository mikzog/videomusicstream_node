const fs = require('fs');
const os = require('os');
const https = require('https');
const id3 = require('node-id3');
const URLModule = require('url');
const ytdl = require('ytdl-core');
const server = require('./server.js');
const querystring = require('querystring');
const fileHandler = require('./fileHandler.js');

const settings = require('./settings.js');
const {version} = require('./package.json');

const pluginDomJs = [];
const pluginServer = [];
const mainPageMenu = [];
const hijackRequestPlugins = [];

const loadPlugins = () => {
	return new Promise((resolve, reject) => {
		function getPlugins() {
			return new Promise((resolve, reject) => {
				const plugins = [];
				const path = __dirname + '/Plugins/';

				function getPlugin(path, folderName) {
					const indexPath = path + '/index.js';

					return new Promise((resolve, reject) => {
						fs.exists(indexPath, exists => {
							if (exists) {
								console.log(`Loading '${folderName}' plugin`);
								resolve({
									folder: folderName,
									module: require(indexPath)
								});
							} else {
								resolve({
									notfound: true
								});

								console.err('No index.js file found in ' + path);
							}
							// } else reject('No index.js file found in ' + path);
						});
					});
				}

				fs.exists(path, exists => {
					if (exists) {
						fs.readdir(path, (err, data) => {
							if (err) reject(err);
							else {
								data.forEach((object, key) => {
									plugins.push(getPlugin(path + object, object));
								});

								Promise.all(plugins).then(plugins => {
									resolve(plugins);
								}).catch(err => {
									reject(err);
								});
							}
						});
					} else resolve();
				});
			});
		}

		utils.colorLog('Loading plugins...', 'bgGreen');
		getPlugins().then(plugins => {
			if (plugins) {
				plugins.forEach((object, key) => {
					if (!object.notfound) {
						if (object.module.clientJS) {
							const handle = (obj) => {
								obj.pluginFolder = object.folder;
								pluginDomJs.push(obj);
							}

							if (Array.isArray(object.module.clientJS)) {
								object.module.clientJS.forEach((object, key) => {
									handle(object);
								});
							} else handle(object.module.clientJS);
						}

						if (object.module.server) {
							pluginServer.push({
								folder: object.folder,
								func: object.module.server
							});

							if (object.module.menu) {
								object.module.menu.name = object.module.menu.name || object.folder;

								if (object.module.menu.url)
									object.module.menu.url = object.folder + object.module.menu.url;
								else
									object.module.menu.url = object.folder;

								mainPageMenu.push(object.module.menu);
							}
						}

						if (object.module.hijackRequests) {
							object.module.hijackRequests.pluginFolder = object.folder;
							hijackRequestPlugins.push(object.module.hijackRequests);
						}
					}
				});

				resolve();
			} else resolve();
		}).catch(err => {
			reject(err);
		});
	});
}

const startServer = () => {
	loadPlugins().then(() => {
		const startServerModule = () => server.start(__dirname + '/WebInterface/', fileHandler, fs, os, settings, utils, querystring, id3, ytdl, version, https, URLModule, pluginServer, hijackRequestPlugins);

		if (settings.updateJsonOnStart.val == true) {
			fileHandler.searchSystem(fs, os, utils, settings).then(startServerModule).catch(err => {
				console.err('Couln\'t update the JSON file.', err);
				startServerModule();
			});
		} else startServerModule();
	}).catch(err => {
		console.err('Error loading plugins:', err);
	});
}

// Usefull functions
const utils = {
	logDate: function() {
		const date = new Date();

		function convertToDoubleDigit(num) {
			if (num.toString().length < 2) return "0" + num;
			else return num;
		}

		return `${convertToDoubleDigit(date.getHours())}:${convertToDoubleDigit(date.getMinutes())}:${convertToDoubleDigit(date.getSeconds())}`;
	},

	getFileExtention: function(fileName) {
		const match = fileName.match(/.+(\.\w+)$/i);

		if (match) return match[1];
		else return;
	},

	sortJSON: function(json) {
		const newArr = [];

		for (key in json)
			newArr.push([key, json[key]]);

		newArr.sort((a, b) => {return a[1] - b[1]});
		newArr.reverse();
		return newArr;
	},

	sendFile: function(fs, path, response) {
		if (path.endsWith('/')) path = path + 'index.html';

		fs.exists(path, exists => {
			if (exists) {
				if (utils.getFileExtention(path) == '.html') {
					fs.readFile(path, 'utf-8', (err, data) => {
						if (err) response.status(500).send('Error: 500. An error occured: ' + err);
						else {
							for (key in settings) {
								data = data.replace(new RegExp(`\{\{${key}\}\}`, 'g'), settings[key].val);
							}

							// Plugins
							let buttonHTML = '';
							const thisPath = path.replace(__dirname, '').replace('/WebInterface/', '').replace(/\/\//g, '/');
							pluginDomJs.forEach((object, key) => {
								if (thisPath == object.filePath.replace(/^\//, ''))
									data = data.replace('</head>', `<script type="text/javascript" src="/LoadPluginJS/${object.pluginFolder + '/' + object.script}"></script>\n</head>`);
							});

							if (mainPageMenu.length > 0) {
								mainPageMenu.forEach((object, key) => {
									buttonHTML += `<a href="/${object.url}"><button>${object.name}</button></a>`;
								});
							}

							if (buttonHTML.length > 0)
								buttonHTML = '<hr>' + buttonHTML;

							data = data.replace('[[EXTRABUTTONS]]', buttonHTML);
							//

							response.status(200).send(data);
						}
					});
				} else response.status(200).sendFile(path);
			} else response.status(404).sendFile(__dirname + '/WebInterface/404.html');
		});
	},

	fetch: function(url, https, URLModule, headers) {
		return new Promise((resolve, reject) => {
			const options = URLModule.parse(url);

			options.headers = headers;
			https.get(options, res => {
				let rawData = '';

				const {statusCode} = res;
				const contentType = res.headers['content-type'];

				if (statusCode !== 200) {
					reject('Request Failed.\n' + `Status Code: ${statusCode}`);
					res.resume();
					return;
				}

				res.setEncoding('utf8');

				res.on('data', chunk => {rawData += chunk;});
				res.on('end', () => {
					if (/^application\/json/.test(contentType)) {
						try {
							resolve(JSON.parse(rawData));
						} catch(err) {
							reject(err);
						}
					} else resolve(rawData);
				});
			}).on('error', err => reject(err));
		});
	},

	newVersionAvailable: function(version) {
		function compareVersions(version1, version2) {
			version1 = version1.split('.');
			version2 = version2.split('.');

			if (version1.length == version2.length) {
				for (let i = 0; i < version1.length; i++) {
					const num1 = Number(version1[i]);
					const num2 = Number(version2[i]);

					if (num1 && num2) {
						if (num1 < num2)
							return -1;
						else if (num1 > num2)
							return 1;
					} else {
						if (version1[i] != version2[i])
							return 0;
					}
				}

				return 0;
			} else return 0;
		}

		return new Promise((resolve, reject) => {
			// Github needs a header to be sent
			const header = {'User-Agent':'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'};

			console.log(utils.logDate() + ' Checking for updates. Connecting to Github...');
			utils.fetch('https://api.github.com/repos/Jantje19/MusicStream/releases/latest', https, URLModule, header).then(response => {
				// Check if the returned value is JSON
				if (response.constructor == {}.constructor) {
					const versionSame = compareVersions(version, response.tag_name);

					if (versionSame == 0)
						resolve({isAvailable: false, version: version});
					else if (versionSame > 0)
						resolve({isAvailable: false, version: version, greater: true, url: response.html_url});
					else if (versionSame < 0)
						resolve({isAvailable: true, version: response.tag_name, url: response.html_url});
					else
						reject('Version check went wrong.');
				} else reject('The response is not json, so it is useless');
			}).catch(err => reject(err));
		});
	},

	humanFileSize: function(bytes, si) {
		let thresh = si ? 1000 : 1024;

		if(Math.abs(bytes) < thresh)
			return bytes + ' B';

		let u = -1;
		const units = si
		? ['kB','MB','GB','TB','PB','EB','ZB','YB']
		: ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];

		do {
			bytes /= thresh;
			++u;
		} while(Math.abs(bytes) >= thresh && u < units.length - 1);

		return bytes.toFixed(1) + ' '+ units[u];
	},

	// I don't want to import modules I can write myself
	colorLog: function(text, color) {
		const regEx = /\[\[(.+)\,(\s+)?(.+)\]\]/i;
		const colors = {
			reset: "\x1b[0m",
			fgBlack: "\x1b[30m",
			fgRed: "\x1b[31m",
			fgGreen: "\x1b[32m",
			fgOrange: "\x1b[33m",
			fgBlue: "\x1b[34m",
			fgMagenta: "\x1b[35m",
			fgCyan: "\x1b[36m",
			fgYellow: "\x1b[93m",
			fgWhite: "\x1b[37m",
			bgBlack: "\x1b[40m",
			bgRed: "\x1b[41m",
			bgGreen: "\x1b[42m",
			bgOrange: "\x1b[43m",
			bgBlue: "\x1b[44m",
			bgMagenta: "\x1b[45m",
			bgCyan: "\x1b[46m",
			bgWhite: "\x1b[47m",
			bgGray: "\x1b[100m"
		}

		try {
			text.match(new RegExp(regEx, 'gi')).forEach((object, key) => {
				object = object.match(regEx);
				text = text.replace(object[0], colors[object[1]] + object[3] + colors.reset);
			});
		} catch(err) {}

		if (color) {
			if (colors[color])
				console.log(colors[color] + text + colors.reset);
			else
				console.log(text);
		} else console.log(text);
	},

	getLocalIP: function(os) {
		const ips = [];
		const ifaces = os.networkInterfaces();

		Object.keys(ifaces).forEach(ifname => {
			let alias = 0;

			ifaces[ifname].forEach(iface => {
				if ('IPv4' !== iface.family || iface.internal !== false) {
					return;
				}

				if (alias >= 1)
					ips.push(ifname + ':' + alias, iface.address);
				else
					ips.push(iface.address);

				++alias;
			});
		});

		return ips;
	}
}

// Console.err is a console.error log in red:
console.err = (...args) => console.error("\x1b[31m", ...args, "\x1b[0m");
// Console.wrn is a console.warn log in orange:
console.wrn = (...args) => console.warn("\x1b[33m", ...args, "\x1b[0m");

// Check args
if (process.argv.includes('check-updates')) {
	utils.newVersionAvailable(version).then(newVersion => {
		if (newVersion.greater)
			utils.colorLog(`No update available, running version: ${newVersion.version}. But this version if greater than that on GitHub (${newVersion.version}), Maybe you want to get the newest code from GitHub: [[fgMagenta, ${newVersion.url}]]. Don't forget to update the settings file!`, 'fgOrange');
		else if (newVersion.isAvailable == true)
			utils.colorLog(`A new update is available: ${newVersion.version}. You can download it at: [[fgMagenta, ${newVersion.url}]]. Don't forget to update the settings file!`, 'fgGreen');
		else
			utils.colorLog(`No update available, running version: ${newVersion.version}`, 'fgCyan');
	}).catch(err => {
		console.wrn('An error occurred when checking for updates:', err);
		startServer();
	});

	return;
} else if (process.argv.includes('update-json')) {
	fileHandler.searchSystem(fs, os, utils, settings).then(json => {
		console.log('Successfully updated the JSON file.');
	}).catch(err => {
		console.log('There was an error with updating the JSON:', err);
	});

	return;
} else if (process.argv.includes('rename-file')) {
	if (process.argv[3] && process.argv[4]) {
		const fromFileName = process.argv[3].toString().trim();
		const toFileName = process.argv[4].toString().trim();

		if (fromFileName != toFileName) {
			utils.colorLog(`Tying to renaming '${fromFileName}' to '${toFileName}'`, 'fgCyan');

			fileHandler.getJSON(fs, os, utils, settings).then(val => {
				console.log('Got all files. Searching...');

				const songsArr = val.audio.songs.map(val => {return val.fileName});
				const videosArr = val.video.videos.map(val => {return val.fileName});

				if (songsArr.includes(fromFileName))
					handleFound(songsArr, val.audio.playlists, val.audio.songs, fromFileName, toFileName);
				else if (videosArr.includes(fromFileName))
					handleFound(videosArr, null, val.video.videos, fromFileName, toFileName);
				else
					utils.colorLog('File not found in list. Try updating the JSON list by running this file with [[bgGray, update-json]] arg.');
			}).catch(err => {
				utils.colorLog('Error: ' + err, 'fgRed');
			});
		} else utils.colorLog('The filenames are the same', 'fgRed');
	} else if (process.argv[4]) utils.colorLog('No origional name', 'fgRed');
	else if (process.argv[3]) utils.colorLog('No new file name', 'fgRed');
	else utils.colorLog('Bug!!', 'fgRed');

	function handleFound(arr, playlists, valuesArr, fromFileName, toFileName) {
		function renameFile() {
			return new Promise((resolve, reject) => {
				const obj = valuesArr[arr.indexOf(fromFileName)];

				fs.rename(obj.path + obj.fileName, obj.path + toFileName, err => {
					if (err)
						reject(err);
					else {
						utils.colorLog(`Successfuly renamed '${fromFileName}' to '${toFileName}'.`, 'fgCyan');

						fileHandler.searchSystem(fs, os, utils, settings, true).then(data => {
							resolve();
						}).catch(err => {
							reject(err);
						});
					}
				});
			});
		}

		function replaceInM3UFiles() {
			function handleFile(object, key) {
				return new Promise((resolve, reject) => {
					fs.readFile(object.path + object.fileName, 'utf-8', (err, data) => {
						if (err)
							reject(err);
						else {
							if (data.indexOf(fromFileName) > -1) {
								data = data.replace(new RegExp(fromFileName, 'g'), toFileName);

								fs.writeFile(object.path + object.fileName, data, err => {
									if (err)
										reject(err);
									else {
										console.log(`Renamed '${fromFileName}' to '${toFileName}' in '${object.fileName}'`);
										resolve('Yay');
									}
								});
							}
						}
					});
				});
			}

			if (playlists) {
				const promises = [];

				playlists.forEach((object, key) => {
					promises.push(handleFile(object, key));
				});

				return Promise.all(promises);
			} else return Promise.resolve();
		}

		function renameInPlaylistFile() {
			return new Promise((resolve, reject) => {
				fs.readFile('playlists.json', 'utf-8', (err, data) => {
					if (err)
						reject(err);
					else {
						try {
							data = JSON.parse(data);

							for (key in data) {
								if (key == settings.mostListenedPlaylistName.val) {
									for (val in data[key]) {
										if (val == fromFileName) {
											console.log('Found in \'' + key + '\'');

											data[key][toFileName] = data[key][fromFileName];
											delete data[key][fromFileName];
										}
									}
								} else {
									data[key].forEach((object, indx) => {
										if (object == fromFileName) {
											console.log('Found in \'' + key + '\'');
											data[key].splice(indx, 1, toFileName);
										}
									});
								}
							}

							fs.writeFile('playlists.json', JSON.stringify(data), err => {
								if (err)
									reject(err);
								else {
									console.log(`'${fromFileName}' renamed to '${toFileName}' in all playlists (except the .m3u files).`);
									resolve();
								}
							});
						} catch (err) {
							reject(err);
						}
					}
				});
			});
		}

		Promise.all([renameFile(), replaceInM3UFiles(), renameInPlaylistFile()]).then(() => {
			utils.colorLog('Done!', 'fgGreen');
		}).catch(err => {
			utils.colorLog('Error: ' + err, 'fgRed');
		});
	}

	return;
}

utils.colorLog(new Date() + ' [[fgGreen, Starting MusicStream]]');
if (settings.checkForUpdateOnStart.val == true) {
	utils.newVersionAvailable(version).then(newVersion => {
		if (newVersion.greater) {
			utils.colorLog(`No update available, running version: ${newVersion.version}. But this version if greater than that on GitHub (${newVersion.version}), Maybe you want to get the newest code from GitHub: [[fgMagenta, ${newVersion.url}]]. Don't forget to update the settings file!`, 'fgOrange');
		} else if (newVersion.isAvailable == true) {
			utils.colorLog(`A new update is available: ${newVersion.version}. Don't forget to update the settings file!`, 'fgGreen');
		} else {
			utils.colorLog(`No update available, running version: ${newVersion.version}`, 'fgCyan');
			startServer();
		}
	}).catch(err => {
		console.wrn('An error occurred when checking for updates: ' + err + '. Starting server...');
		startServer();
	});
} else startServer();