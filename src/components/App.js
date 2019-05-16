import React, { Component } from 'react'
import munkres from 'munkres-js'
import _ from 'lodash'

// const socket = new WebSocket('ws://localhost:8080/ws')
const socket = io.connect('http://localhost:8080/')

import Robot from './Robot'
import Point from './Point'

class App extends Component {
  constructor(props) {
    super(props)
    window.app = this
    window.App = this
    this.socket = socket
    this.state = {
      robots: [],
      data: null,
      ids: [],
      corners: [],
      points: []
    }
    // this.socket.onmessage = this.onMessage.bind(this)
    // this.socket.onmessage = Camera.onMessage.bind(Camera)
    this.socket.on('frame', this.updateRobots.bind(this))
    this.ips = {
      0: '192.168.1.140',
      1: '192.168.1.119'
    }
    this.port = 8883
    this.width = 1000
    this.height = 700

    this.log()
    this.forceStop = false
  }

  componentDidMount() {
  }

  updateRobots(data) {
    // console.log(data)
    let objects = data.components['6dEuler'].rigidBodies
    let robots = []
    let id = 0
    for (let object of objects) {
      if (!object.x || !object.y || !object.z) continue
      let robot = {
        id: id,
        pos: { x: object.x / 7, y: - object.y / 7, z: object.z / 7 },
        angle: (-object.euler3 + 180 + 180) % 360
      }
      id++
      robots.push(robot)
    }
    this.setState({ data: data, robots: robots })
  }

  onClick(event) {
    if (!this.count) this.count = 0
    let x = event.clientX - this.width/2
    let y = event.clientY - this.height/2

    console.log(x, y)
    let max = this.state.robots.length
    let i = this.count % max
    let point = { x: x, y: y }
    let points = this.state.points
    points[i] = point
    this.setState({ points: points })
    this.count++
  }

  start() {
    let res = this.assign()
    let distMatrix = res.distMatrix
    let rids = res.rids
    let ids = munkres(distMatrix)
    for (let id of ids) {
      let pid = id[0]
      let rid = rids[id[1]]
      let point = this.state.points[pid]
      console.log('rid: ' + rid, 'pid: ' + pid)
      this.move(rid, point)
    }
  }

  assign() {
    let distMatrix = []
    let rids = []
    for (let point of this.state.points) {
      let distArray = []
      for (let robot of this.state.robots) {
        let dist = Math.sqrt((point.x - robot.pos.x)**2 + (point.y - robot.pos.y)**2)
        distArray.push(dist)
        rids.push(robot.id)
      }
      distMatrix.push(distArray)
    }
    if (!distMatrix.length) return
    return { distMatrix: distMatrix, rids: rids }
  }

  log() {
    console.log('v3')
  }

  async move(id, point) {
    let error = 0
    let prev
    let Ib = 100
    let Ip = 100
    while (true) {
      try {
        let res = this.calculate(id, point)
        console.log(res.dist)
        if (res.dist < 10) break
        if (this.forceStop) break

        let base = Math.min(Ib, res.dist+100)
        let left = base
        let right = base
        let param = 5

        let unit = (90 - Math.abs(res.diff)) / 90
        let Kd = 3
        let D = !prev ? 0 : unit - prev
        prev = unit
        Ib += 20
        Ip += 10
        let Kp = Math.min(Ip, base)
        // console.log(Kp)
        /*
        Ryo's note: If Kp is too high, it will be overshooting. Thus, start from a small value at the beginning to avoid overshooting, while gradually increasing the value once it starts adjusting the path and angle.
        */
        if (res.diff < 0) { // left
          right = Math.max(unit - Kd*D, 0) * Kp
        } else { // right
          left = Math.max(unit - Kd*D, 0) * Kp
        }

        left = parseInt(left)
        right = parseInt(right)
        left = Math.min(left, 255)
        right = Math.min(right, 255)
        let command = { left: left, right: right }
        let message = { command: command, ip: this.ips[id], port: this.port }
        this.socket.emit('move', JSON.stringify(message))
        await this.sleep(100)
      } catch (err) {
        console.log('lost AR marker')
        error++
        await this.sleep(100)
        if (error > 10) break
      }
    }
    console.log('finish')
    this.stop(id)
    this.forceStop = false
  }

  stop(id) {
    this.forceStop = true
    let command = { left: 0, right: 0 }
    let message = { command: command, ip: this.ips[id], port: this.port }
    this.socket.emit('move', JSON.stringify(message))
  }

  stopAll() {
    for (let robot of this.state.robots) {
      this.stop(robot.id)
    }
  }

  async sleep(time) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, time)
    })
  }

  calculate(id, point) {
    let robot = this.getRobot(id)
    let dir = Math.atan2(point.x - robot.pos.x, point.y - robot.pos.y) * 180 / Math.PI
    dir = (-dir + 180) % 360
    let diff = Math.min((360) - Math.abs(robot.angle - dir), Math.abs(robot.angle - dir))
    // 1 - 359 = -358 < 0 && 358 > 180 -> -2
    // 1 - 180 = -179 < 0 && 179 < 180 -> +179
    // 15 - 1  =  14  > 0 && 14  < 180 -> -14
    // 1 - 200 = -199 < 0 && 199 > 180 -> -161
    // 359 - 1 =  358 > 0 && 358 > 180 -> +2
    if (robot.angle - dir < 0 && Math.abs(robot.angle - dir) > 180) {
      diff = -diff
    }
    if (robot.angle - dir > 0 && Math.abs(robot.angle - dir) < 180) {
      diff = -diff
    }
    let dist = Math.sqrt((point.x - robot.pos.x)**2 + (point.y - robot.pos.y)**2)
    return { diff: diff, dist: dist }
  }

  getRobot(id) {
    for (let robot of this.state.robots) {
      if (robot.id === id) return robot
    }
    return null
  }

  render() {
    return (
      <div>        
        <div className="ui grid">
          <div className="twelve wide column">
            <svg id="svg" width={ this.width } height={ this.height } viewBox={`-${this.width/2} -${this.height/2} ${this.width} ${this.height}`} onClick={ this.onClick.bind(this) }>
              { this.state.robots.map((robot, i) => {
                return (
                  <Robot
                    id={robot.id}
                    key={robot.id}
                    x={robot.pos.x}
                    y={robot.pos.y}
                    angle={robot.angle}
                  />
                )
              })}

              { this.state.points.map((point, i) => {
                return (
                  <Point
                    id={i}
                    key={i}
                    x={point.x}
                    y={point.y}
                  />
                )
              })}
            </svg>
          </div>
          <div className="four wide column">
            <div className="ui teal button" onClick={ this.start.bind(this) }>
              Move
            </div>
            <br/>
            <div className="ui orange button" onClick={ this.stopAll.bind(this) }>
              Stop
            </div>
            <br/>
            <div>
              Robots
              <pre id="robots">{ JSON.stringify(this.state.robots, null, 2) }</pre>
              Data
              <pre id="data">{ JSON.stringify(this.state.data, null, 2) }</pre>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default App

