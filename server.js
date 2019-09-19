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

const mocap = false

if (mocap) {
  qtmParser(io)
}

app.use(bodyParser.json())
app.use('/', express.static(__dirname))
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index-vr.html'))
})
app.get('/control', (req, res) => {
  res.sendFile(path.join(__dirname + '/index-control.html'))
})
app.get('/view', (req, res) => {
  res.sendFile(path.join(__dirname + '/index-view.html'))
})


server.listen(8080, () => {
  console.log('listening on 8080')
})

io.on('connection', (socket) => {
  console.log('socket connected')

  socket.on('click', (data) => {
    console.log(data)
  })

  socket.on('teleport', (data) => {
    console.log(data)
    const target = 'Macintosh' // 'Android'
    if (data.agent.includes(target)) {
      socket.broadcast.emit('teleport', data)
    }
  })

  socket.on('highlightChair', (data) => {
    console.log(data)
    socket.broadcast.emit('highlightChair', data)
  })

  socket.on('move', (data) => {
    console.log(data)
    const client = dgram.createSocket('udp4')
    // json = { command: { left: 100, right: 100 } ip: ip, port: 8883 }
    let json = JSON.parse(data)
    let ip = json.ip
    let port = json.port
    let command = json.command
    let str = JSON.stringify(command)
    let message = Buffer.from(str)
    console.log(str)
    client.send(message, 0, message.length, port, ip, function(err, bytes) {
      if (err) throw err
      client.close()
    })
  })
})