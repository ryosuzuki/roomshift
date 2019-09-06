'use strict';

var dgram       = require('dgram')
  , Q           = require('q')
  , _           = require('underscore')
  , util        = require('util')
  , events      = require('events')
  , qtmrt       = require('./qtmrt')
  , writeUInt32 = require('./helpers').writeUInt32
  , mixin       = require('./helpers').mixin
  , Mangler     = require('./mangler')
  , Packet      = require('./packet')
  , Command     = require('./command')
  , Logger      = require('./logger')
;

_.str = require('underscore.string');

var Api = function(options) {
	this.net               = require('net');
	this.client            = null;
	this.response          = null;
	this.deferredResponse  = null;
	this.promiseQueue      = [];
	this.issuedCommands    = [];
	this.logger            = new Logger();
	this.mangler           = new Mangler();
	this.isStreaming       = false;
	this.currentPacketSize = false;

	events.EventEmitter.call(this);
	
	if (1 > arguments.length)
		options = {};

	this.options = _.defaults(options, {
		debug: false,
		frequency: 100,
		discoverPort: 22226,
		discoverTimeout: 2000,
	});

	this.frequency(this.options.frequency);
};

Api.prototype = (function()
{
	var bootstrap = function()
	{
		// Disable Nagle's algorithm.
		this.client.setNoDelay(true);

		this.client.on('data', function(chunk) {
			this.mangler.read(chunk, { fun: receivePacket, thisArg: this });
		}.bind(this));

		this.client.on('end', function() {
			this.logger.log('Disconnected', 'white', 'bold');
			this.emit('disconnect');
		}.bind(this));
	},

	setupUdp = function(port)
	{
		var s = dgram.createSocket('udp4');

		s.on('message', function(chunk) {
			this.mangler.read(chunk, { fun: receivePacket, thisArg: this });
		}.bind(this));

		s.bind(port, this.host, function() { });
	},

	log = function(msg, color, style)
	{
		this.logger.logPacket(msg, color, style);
	},
	
	receivePacket = function(data)
	{
		var packet  = Packet.create(data)
		  , command = this.issuedCommands.pop()
		;

		if (qtmrt.COMMAND === packet.type)
			packet.type = qtmrt.COMMAND_RESPONSE;

		if (this.options.debug)
			this.logger.logPacket(packet);

		if (qtmrt.EVENT === packet.type)
		{
			if ('GetState' === command.data)
				this.promiseQueue.pop().resolve({ id: packet.eventId, name: packet.eventName });

			this.emit('event', packet.toJson());
		}
		else if (qtmrt.XML === packet.type)
		{
			this.promiseQueue.pop().resolve(packet.toJson());
		}
		else if (qtmrt.C3D_FILE === packet.type)
		{
		}
		else if (qtmrt.COMMAND_RESPONSE === packet.type)
		{
			if (_.str.startsWith(command.data, 'ByteOrder'))
				this.promiseQueue.pop().resolve(/little endian/.test(packet.data) ? 'little endian' : 'big endian');

			else if (_.str.startsWith(command.data, 'QTMVersion'))
			{
				var human   = 'QTM ' + packet.data.replace('QTM Version is ', '').slice(0, -1)
				  , version = human.match(/QTM (\d+)\.(\d+)(?: (?:Beta)|(?:Alpha))? \(build (\d+)\)/)
				;
				this.promiseQueue.pop().resolve({ major: version[1], minor: version[2], build: version[3], human: human });
			}

			else
				this.promiseQueue.pop().resolve(packet);
		}
		else if (command && _.str.startsWith(command.data, 'GetCurrentFrame'))
		{
			this.promiseQueue.pop().resolve(packet.toJson());
		}
		else if (qtmrt.DATA !== packet.type)
		{
			if (qtmrt.NO_MORE_DATA === packet.type)
			{
				this.emit('end');
			}
			else
				this.promiseQueue.pop().resolve(packet);
		}
		else if (qtmrt.DATA === packet.type)
		{
			this.emit('frame', packet.toJson());
		}
		
	},

	isConnected = function()
	{
		if (_.isNull(this.client))
			return Q.reject(new Error('Not connected to QTM. Connect and try again.'));
	},

	connect = function(port, host, major, minor)
	{
		if (!_.isNull(this.client))
			return Q.reject();

		if (1 > arguments.length)
			port = 22223;

		if (2 > arguments.length)
			host = 'localhost';

		if (3 > arguments.length)
		{
			major = 1;
			minor = 13;
		}
		else
		{
			if (!_.isNumber(major))
				throw new TypeError('Major version must be a number');

			if (!_.isNumber(major))
				throw new TypeError('Minor version must be a number');
		}
		
		this.host = host;
		this.port = port;

		var self = this
		  , deferredCommand  = Q.defer()
		;

		var responsePromise = promiseResponse.call(this);

		if (this.options.debug)
			this.logger.log('Connecting to ' + host + ':' + port, 'white', 'bold');

		this.client = this.net.connect(port, host, function() { });
		this.issuedCommands.unshift('Connect');
		bootstrap.call(this);

		responsePromise
			.then(function(packet) {
				if ('QTM RT Interface connected\0' === packet.data.toString())
				{
					send.call(self, Command.version(major, minor))
						.then(function(data) {
							deferredCommand.resolve();
						})
						.catch(function(err) {
							deferredCommand.reject(new Error(err));
						});
				}
				else
				{
					deferredCommand.reject(new Error(packet.data.toString()));
				}
			})
			.catch(function(err) {
				console.log(err);
			});

		return deferredCommand.promise;
	},

	qtmVersion      = function() { return send.call(this, Command.qtmVersion()); },
	byteOrder       = function() { return send.call(this, Command.byteOrder()); },
	getState        = function() { return send.call(this, Command.getState()); },
	getParameters   = function() { return send.call(this, Command.getParameters.apply(Command, arguments)); },
	setParameters   = function() { return send.call(this, Command.setParameters.apply(Command, arguments)); },
	getCurrentFrame = function() { return send.call(this, Command.getCurrentFrame.apply(Command, arguments)); },
	releaseControl  = function() { return send.call(this, Command.releaseControl()); },
	newMeasurement  = function() { return send.call(this, Command.newMeasurement()); },
	close           = function() { return send.call(this, Command.close()); },
	start           = function() { return send.call(this, Command.start()); },
	stop            = function() { return send.call(this, Command.stop()); },
	trig            = function() { return send.call(this, Command.trig()); },

	// XXX: Not tested with C3D file reply.
	getCaptureC3D = function() { return send.call(this, Command.getCaptureC3D()); },
	// XXX: Not tested with QTM file reply.
	getCaptureQtm = function() { return send.call(this, Command.getCaptureQtm()); },

	streamFrames = function(options)
	{
		if (this.isStreaming)
			return Q.reject('Could not start streaming, already streaming');

		this.isStreaming = true;

		if (_.isUndefined(options.frequency))
			options.frequency = this.options.frequency;

		if (!_.isUndefined(options.udpPort) && (_.isUndefined(options.udpAddress) || 'localhost' === options.updAddress || '127.0.0.1' === options.udpAddress))
			setupUdp.call(this, options.udpPort);

		return send.call(this, Command.streamFrames.apply(Command, [options]));
	},

	stopStreaming = function()
	{
		if (!this.isStreaming)
		{
			this.logger.log('Cannot stop streaming, not currently streaming', 'red');
			return;
		}

		this.isStreaming = false;
		this.emit('end');
		return send.call(this, Command.stopStreaming());
	},

	takeControl = function(pass)
	{
		if (!_.isUndefined(pass) && !_.isString(pass))
			throw new TypeError('Password must be a string');

		return send.call(this, Command.takeControl(pass));
	},

	load = function(filename)
	{
		if (1 > arguments.length)
			throw new TypeError('No filename specified');

		if (!_.isString(filename))
			throw new TypeError('Filename must be a string');

		return send.call(this, Command.load(filename));
	},

	save = function(filename, overwrite)
	{
		if (1 > arguments.length)
			throw new TypeError('No filename specified');

		if (!_.isString(filename))
			throw new TypeError('Filename must be a string');

		if (1 < arguments.length)
			overwrite = 'overwrite';

		return send.call(this, Command.save(filename, overwrite));
	},

	loadProject = function(projectPath)
	{
		if (1 > arguments.length)
			throw new TypeError('No project path specified');

		if (!_.isString(projectPath))
			throw new TypeError('Project path must be a string');

		return send.call(this, Command.loadProject(projectPath));
	},

	setQtmEvent = function(label)
	{
		if (1 > arguments.length)
			throw new TypeError('No label specified');

		if (!_.isString(label))
			throw new TypeError('Label must be a string');

		return send.call(this, Command.setQtmEvent(label));
	},

	send = function(command)
	{
		isConnected.call(this);
		var promise = Q.resolve();

		// Don't expect a reply on the StreamFrames command. 
		if (!_.str.startsWith(command.data, 'StreamFrames'))
			promise = promiseResponse.call(this);

		this.issuedCommands.unshift(command);

		command.isResponse = false;

		this.client.write(command.buffer, 'utf8', function(data) {
			if (this.options.debug)
				this.logger.logPacket(command);
		}.bind(this));

		return promise;
	},

	promiseResponse = function()
	{
		var deferredResponse = Q.defer();
		this.promiseQueue.unshift(deferredResponse);
		return deferredResponse.promise;
	},

	disconnect = function()
	{
		isConnected.call(this);
		this.client.end();
	},

	discover = function(port)
	{
		if (_.isUndefined(port))
			port = this.options.discoverPort;
		

		var server = dgram.createSocket('udp4')
		  , receivePort = port + 1
		  , discoveredServers = []
		  , self = this
		  , deferred = Q.defer()
		;

		server.on('error', function (err) {
			console.log('Server error:\n' + err.stack);
			server.close();
		});

		server.on('message', function (msg, rinfo) {
			// Set type to discover type.
			writeUInt32(msg, 7, 4);

			var discoverPacket = Packet.create(msg, rinfo.address, rinfo.port)
			if (self.options.debug)
				self.logger.logPacket(discoverPacket);

			discoveredServers.push({
				serverInfo: discoverPacket.serverInfo,
				serverBasePort: discoverPacket.serverBasePort,
				srcAddress: discoverPacket.srcAddress,
				srcPort: discoverPacket.srcPort,
			});
		});

		server.on('listening', function () {
			var address = server.address();
		});

		server.bind(receivePort);

		// Create discover packet.
		var buf = new Buffer(10);
		buf.writeUInt32LE(10, 0);
		buf.writeUInt32LE(7, 4);
		buf.writeUInt16BE(receivePort, 8);

		var client = dgram.createSocket('udp4')
		  //, address = 'ff02::1' 
		  , address = '255.255.255.255'
		;

		client.bind();
		client.on('listening', function () {
			client.setBroadcast(true);
			client.send(buf, 0, buf.length, port, address, function(err, bytes) {
				client.close();
			});

			if (self.options.debug)
				self.logger.logPacket(Packet.create(buf));

			setTimeout(function() {
				server.close();
				server.unref();
				deferred.resolve(discoveredServers);
			}, this.options.discoverTimeout);

		}.bind(this));

		return deferred.promise;
	},

	frequency = function(freq)
	{
		if (isNaN(freq) && freq !== 'AllFrames')
			throw new TypeError('Frequency must be a number or \'AllFrames\'');

		this.options.frequency = freq;
	},

	debug = function(val)
	{
		this.options.debug = val ? true: false;
	};

	return {
		'log':              log,
		'connect':          connect,
		'qtmVersion':       qtmVersion,
		'byteOrder':        byteOrder,
		'getState':         getState,
		'getParameters':    getParameters,
		'setParameters':    setParameters,
		'getCurrentFrame':  getCurrentFrame,
		'stopStreaming':    stopStreaming,
		'streamFrames':     streamFrames,
		'takeControl':      takeControl,
		'releaseControl':   releaseControl,
		'newMeasurement':   newMeasurement,
		'close':            close,
		'start':            start,
		'stop':             stop,
		'load':             load,
		'save':             save,
		'loadProject':      loadProject,
		'getCaptureC3D':    getCaptureC3D,
		'getCaptureQtm':    getCaptureQtm,
		'trig':             trig,
		'setQtmEvent':      setQtmEvent,
		'disconnect':       disconnect,
		'discover':         discover,
		'frequency':        frequency,
		'debug':            debug,
	};
})();

mixin(Api.prototype, events.EventEmitter.prototype);

module.exports = Api;
