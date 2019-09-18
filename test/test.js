let HOST = '128.138.221.192'
HOST = '192.168.1.68'
HOST = '192.168.1.68'

/*
wall_1: 158
wall_2: 149
table:  147
chair_1:225
chair_2: 68
*/



const PORT = 8883

console.log('start')
const sendCommand = function(json) {
  const dgram = require('dgram')
  const client = dgram.createSocket('udp4')
  let str = JSON.stringify(json)
  let message = Buffer.from(str)
  client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
    if (err) throw err
    client.close()
  })
}

const keypress = require('keypress')

keypress(process.stdin)

process.stdin.on('keypress', function (ch, key) {
  console.log(key.name)

  switch (key.name) {
    case 'up':
      let forward = { left: 250, right: 250 }
      sendCommand(forward)
      break
    case 'down':
      let stop = { left: 0, right: 0 }
      sendCommand(stop)
      break
    case 'left':
      let left = { left: -250, right: 250 }
      sendCommand(left)
      break
    case 'right':
      let right = { left: 1250, right: -1250 }
      sendCommand(right)
      break
    case 'd':
      let backward = { left: -1250, right: -1250 }
      sendCommand(backward)
      break
    case 'a':
      let extend = { a1: 1, a2: 0 }
      sendCommand(extend)
      break
    case 's':
      let collapse = { a1: 0, a2: 1 }
      sendCommand(collapse)
      break
    case 'r':
      let reset = { reset: 1 }
      sendCommand(reset)
      break
    case 'x':
      let sleep = { sleep: 1 }
      sendCommand(sleep)
      break
    case 'l':
      let dock = { dock: 1 }
      sendCommand(dock)
      break
    default:
      console.log('press arrow key')
  }
  if (key && key.ctrl && key.name == 'c') {
    process.stdin.pause();
  }
})

process.stdin.setRawMode(true)
process.stdin.resume()
