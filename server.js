const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const dgram = require('dgram')
const bodyParser = require('body-parser')
const qtmParser = require('./src/qualisys.js')

const app = express()
const server = http.Server(app)
const io = socketio(server)

// qtmParser(io)

app.use(bodyParser.json())
app.use('/', express.static(__dirname))
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'))
})

server.listen(8080, () => {
  console.log('listening on 8080')
})

io.on('connection', (socket) => {
  console.log('socket connected')

  socket.on('move', (data) => {
    console.log(data)
    const client = dgram.createSocket('udp4')
    // json = { ip: ip, left: 100, right: 100 }
    let json = JSON.parse(data)
    let ip = json.ip
    let str = JSON.stringify(json)
    let message = Buffer.from(str)
    let port = 8883
    client.send(message, 0, message.length, port, ip, function(err, bytes) {
      if (err) throw err
      client.close()
    })
  })
})