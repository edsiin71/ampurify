'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var Gpio = require("onoff").Gpio;

module.exports = ampurify;
function ampurify(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}



ampurify.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

	self.amptype = self.config.get('amptype');

	self.commandRouter.logger.info("[ampurify] amptype is "+self.amptype);

    return libQ.resolve();
}

ampurify.prototype.onStart = function() {
    var self = this;
	var defer=libQ.defer();

	self.loadAmpurifyResource();
	self.addToBrowseSources();

	self.createGPIO();

	self.serviceName = "ampurify";

	// Once the Plugin has successfull started resolve the promise
	defer.resolve();

    return defer.promise;
};

ampurify.prototype.onStop = function() {
    var self = this;
    var defer=libQ.defer();

	self.freeGPIO();

    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();

    return libQ.resolve();
};

ampurify.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
};


// Configuration Methods -----------------------------------------------------------------------------

ampurify.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;

    var lang_code = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
        __dirname+'/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {
			if(self.config.get('amptype') == 3) { 
				uiconf.sections[0].content[0].value.label = "AP3";
				uiconf.sections[0].content[0].value.value = 3;
			}
			else if(self.config.get('amptype') == 2) {
				uiconf.sections[0].content[0].value.label = "AP2";
				uiconf.sections[0].content[0].value.value = 2;
			}
		
            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};

ampurify.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}

ampurify.prototype.setUIConfig = function(data) {
	var self = this;
	//Perform your installation tasks here
};

ampurify.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};

ampurify.prototype.setConf = function(varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};



// Playback Controls ---------------------------------------------------------------------------------------
// If your plugin is not a music_sevice don't use this part and delete it


ampurify.prototype.addToBrowseSources = function () {

	// Use this function to add your music service plugin to music sources
    //var data = {name: 'Spotify', uri: 'spotify',plugin_type:'music_service',plugin_name:'spop'};

	var data = {
		name: 'Ampurify', 
		uri: 'ampurify', 
		plugin_type:'music_service', 
		plugin_name:'ampurify',
		albumart: '/albumart?sourceicon=music_service/ampurify/ampurify.svg'
	};

	this.commandRouter.volumioAddToBrowseSources(data);
};

ampurify.prototype.handleBrowseUri = function (curUri) {
    var self = this;

    //self.commandRouter.logger.info(curUri);
    var response;

    if (curUri.startsWith('ampurify')) {
        if (curUri == 'ampurify') {
			response = self.getRootContent();
		}
		else if (curUri === 'ampurify/sel') {
			self.toggleGPIO('sel');
			response = self.getRootContent();
		}
		else if (curUri === 'ampurify/stb') {
			self.toggleGPIO('stb');
			response = self.getRootContent();
		}
		else if (curUri === 'ampurify/up') {
			self.toggleGPIO('up');
			response = self.getRootContent();
		}
		else if (curUri === 'ampurify/down') {
			self.toggleGPIO('down');
			response = self.getRootContent();
		}
		else {
			response = libQ.reject();
		}
    }

    return response;
};



// Define a method to clear, add, and play an array of tracks
ampurify.prototype.clearAddPlayTrack = function(track) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ampurify::clearAddPlayTrack');

	self.commandRouter.logger.info(JSON.stringify(track));

	return self.sendSpopCommand('uplay', [track.uri]);
};

ampurify.prototype.seek = function (timepos) {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ampurify::seek to ' + timepos);

    return this.sendSpopCommand('seek '+timepos, []);
};

// Stop
ampurify.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ampurify::stop');


};

// Spop pause
ampurify.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ampurify::pause');


};

// Get state
ampurify.prototype.getState = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ampurify::getState');


};

//Parse state
ampurify.prototype.parseState = function(sState) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ampurify::parseState');

	//Use this method to parse the state and eventually send it with the following function
};

// Announce updated State
ampurify.prototype.pushState = function(state) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ampurify::pushState');

	return self.commandRouter.servicePushState(state, self.servicename);
};


ampurify.prototype.explodeUri = function(uri) {
	var self = this;
	var defer=libQ.defer();

	// Mandatory: retrieve all info for a given URI

	return defer.promise;
};

ampurify.prototype.getAlbumArt = function (data, path) {

	var artist, album;

	if (data != undefined && data.path != undefined) {
		path = data.path;
	}

	var web;

	if (data != undefined && data.artist != undefined) {
		artist = data.artist;
		if (data.album != undefined)
			album = data.album;
		else album = data.artist;

		web = '?web=' + nodetools.urlEncode(artist) + '/' + nodetools.urlEncode(album) + '/large'
	}

	var url = '/albumart';

	if (web != undefined)
		url = url + web;

	if (web != undefined && path != undefined)
		url = url + '&';
	else if (path != undefined)
		url = url + '?';

	if (path != undefined)
		url = url + 'path=' + nodetools.urlEncode(path);

	return url;
};





ampurify.prototype.search = function (query) {
	var self=this;
	var defer=libQ.defer();

	// Mandatory, search. You can divide the search in sections using following functions

	return defer.promise;
};

ampurify.prototype._searchArtists = function (results) {

};

ampurify.prototype._searchAlbums = function (results) {

};

ampurify.prototype._searchPlaylists = function (results) {


};

ampurify.prototype._searchTracks = function (results) {

};

ampurify.prototype.goto=function(data){
    var self=this
    var defer=libQ.defer()

// Handle go to artist and go to album function

     return defer.promise;
};








ampurify.prototype.updateConfig = function (data) {
	var self = this;
	var defer = libQ.defer();
	var configUpdated = false;

	if (self.config.get('amptype') != data['amptype']['value']) {
		self.config.set('amptype', data['amptype']['value']);
		self.amptype = data['amptype']['value'];
		configUpdated = true;
	}
	
	if(configUpdated) {
		self.freeGPIO();
		self.createGPIO();
	}
	
	return defer.promise;
};

ampurify.prototype.loadAmpurifyResource = function() {
	var self=this;
  
	var ampurifyResource = fs.readJsonSync(__dirname+'/ampurify.json');

	var baseNavigation = ampurifyResource.baseNavigation;
	self.rootNavigation = JSON.parse(JSON.stringify(baseNavigation));
};

ampurify.prototype.getRootContent = function() {
	var self=this;
	var response;
	var defer = libQ.defer();
  
	response = self.rootNavigation;

	defer.resolve(response);

	return defer.promise;
};

ampurify.prototype.createGPIO = function() 
{
    var self = this;

	self.apSel = new Gpio(23,'out');
	self.apUp = new Gpio(24,'out');
	if(self.amptype == 2) self.apDown = new Gpio(17,'out');
	else                  self.apDown = new Gpio(15,'out');

	self.apSel.writeSync(0);
	self.apUp.writeSync(0);
	self.apDown.writeSync(0);

	self.commandRouter.logger.info("[ampurify] createGPIO as "+self.amptype);
};

ampurify.prototype.freeGPIO = function() 
{
    var self = this;

    self.apSel.unexport();
    self.apUp.unexport();
    self.apDown.unexport();

	self.commandRouter.logger.info("[ampurify] freeGPIO");
};

ampurify.prototype.toggleGPIO = function(action)
{
	var self = this;
	var defer = libQ.defer();
	
	self.logger.info("[ampurify] "+action);

	switch(action) {
		case 'stb': {
			self.apUp.writeSync(1);
			self.apDown.writeSync(1);
			setTimeout(function() {
				self.apUp.writeSync(0);
				self.apDown.writeSync(0);
				defer.resolve();
			}, 1);
			break;
		}
		case 'sel': {
			self.apSel.writeSync(1);
			setTimeout(function() {
				self.apSel.writeSync(0);
				defer.resolve();
			}, 1);
			break;
		}
		case 'up': {
			self.apUp.writeSync(1);
			setTimeout(function() {
				self.apUp.writeSync(0);
				setTimeout(function() {
					self.apUp.writeSync(1);
					setTimeout(function() {
						self.apUp.writeSync(0);
						defer.resolve();
					}, 1);
				}, 1);
			}, 1);
			break;
		}
		case 'down': {
			self.apDown.writeSync(1);
			setTimeout(function() {
				self.apDown.writeSync(0);
				setTimeout(function() {
					self.apDown.writeSync(1);
					setTimeout(function() {
						self.apDown.writeSync(0);
						defer.resolve();
					}, 1);
				}, 1);
			}, 1);
			break;
		}
	}

	return defer;
};

