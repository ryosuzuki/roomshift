const colors = require('colors')
const QTMrt = require('qualisys-rt');
const qtmReader = new QTMrt.Api();
const dgram = require('dgram')

function init(io) {
  io.on('connection', (socket) => {
    console.log(socket);
  });


  let x = 0

  qtmReader.on('frame', function(data) {
    // console.log('Received frame:'.green);
    // console.log(data.components);

    let objects = data.components['6dEuler'].rigidBodies.map(
      body => {
        return {
          x: body.x,
          y: body.y,
          z: body.z,
        }
      })

    io.sockets.emit('frame', objects)

    const client = dgram.createSocket('udp4')

    let object = objects[0]
    if (object) {
      let message = JSON.stringify({ x: object.x, y: object.y, z: object.z })
      let port = 8883
      let ip = '192.168.1.111'
      client.send(message, 0, message.length, port, ip, (err, bytes) => {
        if (err) throw err
        client.close()
      })  
    }
    

  });
  
  qtmReader.on('end', function(data) {
    console.log('No more data!'.red);
  });
  
  qtmReader.on('event', function(event) {
    console.log(event.name.yellow);
  });
  
  qtmReader.on('disconnect', function(event) {
    process.exit();
  });


  qtmReader.connect()
    .then(function() { return qtmReader.qtmVersion(); })
    .then(function(version) { return qtmReader.byteOrder(); })
    .then(function(byteOrder) { return qtmReader.getState(); })
    .then(function() { return qtmReader.streamFrames({ frequency: 60, components: ['6DEuler'] }); })
}

module.exports = init;
