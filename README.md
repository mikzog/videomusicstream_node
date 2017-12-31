# MusicStream
A NodeJS server and web client for streaming music (and videos) to your network

## Installation
### Installer

You can [try the new (buggy) GUI installer](https://github.com/jantje19/MusicStream-Installer/) written in Electron.

### Windows install video

[![Install video](http://img.youtube.com/vi/UOG_lOcmQlo/0.jpg)](http://www.youtube.com/watch?v=UOG_lOcmQlo)

### Steps
1. Install [Node.js](https://nodejs.org/en/download/package-manager/)
2. [Download](https://github.com/jantje19/MusicStream/releases/latest/) the latest release from GitHub
3. Extract the files into a folder and rename it to *MusicStream*
4. Within the *MusicStream* directory run: `npm install && npm start` in a CLI (On windows type `cmd` in the location bar to open a CLI in that folder)
5. In your browser go to: http://localhost:8000

### Running
Try the *universal_python_executer.py* if you have python installed.
Otherwise move into the folder of your platform and execute one of the files within that folder.
If both of these methods fail, run `npm start` in a CLI

## Notes
**[Plugins](https://github.com/Jantje19/MusicStream-Plugins) are in beta!**

The web-interface only works with browsers that have ES6 support.

This program needs Node-ID3 version 0.0.10 or higher to work with images properly.

Manipulating files (adding/removing tags) requires the side installation of [FFMPEG](https://www.ffmpeg.org/download.html). This is however not required when you don't want to do any of these things.

Supported browsers with build numbers:
- Edge: 14
- Chrome: 49
- Firefox: 52
- Safari: 10
- Opera: 44
- IOS (Safari): 9.3
- Android (Chrome): 57
- Android browser (WebView): 56

Internet Explorer won't work. (*but why would you use it anyway.*)

**You can still use it on old browsers. On the front page it will ask you to move to the old browsers page. The features are very limited tho.**

**Only tested (and used) on Chrome Canary 60 and Android Chrome 58**
