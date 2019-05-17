import React, { Component } from 'react'
import munkres from 'munkres-js'
import _ from 'lodash'

// const socket = new WebSocket('ws://localhost:8080/ws')
const socket = io.connect('http://localhost:8080/')

import Robot from './Robot'
import Point from './Point'
import { cpus } from 'os';

import Calculate from './Calculate'

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
      0: '192.168.1.147',
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
        angle: (-object.euler3 + 360 + 270) % 360,
        velocity: { x: 0, y: 0 },
        prefSpeed: 0.5,
        size: 1,
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
    let point = { x: -x, y: -y }
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
    let target = point
    target.angle = 0

    let error = 0
    while (true) {
      try {
        if (this.forceStop) break
        let res = Calculate.calculate(id, target)
        let distThreshold = 60
        let dirThreshold = 50
        let angleThreshold = 5
        let sleepTime = 30    
        if (res.dist > distThreshold) {
          const dt = 1
          let rvo = Calculate.getRvoVelocity(id, target, dt)
          console.log(rvo)
          let angleDiff = (360 + res.angleDiff) % 360
          let calc = this.getDirection(rvo.diff, dirThreshold)
          let dir = calc.dir
          let diff = calc.diff
          console.log(calc)
          // if (dir === 'forward' || dir === 'backward') dir = 'stop'

          let base = Math.min(60, res.dist+50)
          let Kd = Math.min(8, (res.dist + 200) / 100)
          let param = 100
          let command
          let val = 100
          switch (dir) {
            case 'forward':
              command = { left: val, right: val }
              break
            case 'backward':
              command = { left: -val, right: -val }
              break
            case 'left':
              command = { left: -val, right: val }
              break
            case 'right':
              command = { left: val, right: -val }
              break
          }
          let message = { command: command, ip: this.ips[id], port: this.port }
          console.log(message)
          this.socket.emit('move', JSON.stringify(message))
          await this.sleep(sleepTime) // 100      
        } else {
          console.log('reached to the position')
          break
        } 
      } catch (err) {
        console.log(err)
        console.log('lost AR marker')
        error++
        await this.sleep(100)
        if (error > 30) break
      }
    }
    let command = { left: 0, right: 0 }
    let message = { command: command, ip: this.ips[id], port: this.port }
    this.socket.emit('move', JSON.stringify(message))


    // let error = 0
    // let prev
    // let Ib = 100
    // let Ip = 100
    // while (true) {
    //   try {
    //     let res = this.calculate(id, point)
    //     console.log(res.dist)
    //     if (res.dist < 10) break
    //     if (this.forceStop) break

    //     let base = Math.min(Ib, res.dist+100)
    //     let left = base
    //     let right = base
    //     let param = 5

    //     let unit = (90 - Math.abs(res.diff)) / 90
    //     let Kd = 3
    //     let D = !prev ? 0 : unit - prev
    //     prev = unit
    //     Ib += 20
    //     Ip += 10
    //     let Kp = Math.min(Ip, base)
    //     // console.log(Kp)
    //     /*
    //     Ryo's note: If Kp is too high, it will be overshooting. Thus, start from a small value at the beginning to avoid overshooting, while gradually increasing the value once it starts adjusting the path and angle.
    //     */
    //     if (res.diff < 0) { // left
    //       right = Math.max(unit - Kd*D, 0) * Kp
    //     } else { // right
    //       left = Math.max(unit - Kd*D, 0) * Kp
    //     }

    //     left = parseInt(left)
    //     right = parseInt(right)
    //     left = Math.min(left, 255)
    //     right = Math.min(right, 255)
    //     let command = { left: left, right: right }
    //     let message = { command: command, ip: this.ips[id], port: this.port }
    //     this.socket.emit('move', JSON.stringify(message))
    //     await this.sleep(100)
    //   } catch (err) {
    //     console.log('lost AR marker')
    //     error++
    //     await this.sleep(100)
    //     if (error > 10) break
    //   }
    // }
    // console.log('finish')
    // this.stop(id)
    // this.forceStop = false


  }

  getDirection(diff, threshold) {
    if (0 <= diff && diff < threshold) {
      return { dir: 'backward', diff: diff }
    }
    if (threshold <= diff && diff < 90) {
      return { dir: 'right', diff: diff }
    }
    if (90 <= diff && diff < 180 - threshold) {
      return { dir: 'left', diff: 180 - diff }
    }
    if (180 - threshold <= diff && diff < 180 + threshold) {
      return { dir: 'forward', diff: 180 - diff }
    }
    if (180 + threshold <= diff && diff < 270) {
      return { dir: 'right', diff: diff - 180 }
    }
    if (270 <= diff && diff < 360 - threshold) {
      return { dir: 'left', diff: 360 - diff }
    }
    if (360 - threshold <= diff && diff <= 360) {
      return { dir: 'backward', diff: diff - 360 }
    }
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

  clickButton(dir) {
    let command = { left: 0, right: 0 }
    let val = 100
    switch (dir) {
      case 'up':
        command.left = val
        command.right = val
        break
      case 'down':
        command.left = -val
        command.right = -val
        break
      case 'left':
        command.left = -val
        command.right = val
        break    
      case 'right':
        command.left = val
        command.right = -val
        break
    }
    let id = 0
    let message = { command: command, ip: this.ips[id], port: this.port }
    this.socket.emit('move', JSON.stringify(message))
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
            <br />
            <div className="ui buttons">
              <button className="ui button" onClick={ this.clickButton.bind(this, 'left') }><i className="arrow left icon"></i></button>
              <button className="ui button" onClick={ this.clickButton.bind(this, 'up') }><i className="arrow up icon"></i></button>
              <button className="ui button" onClick={ this.clickButton.bind(this, 'down') }><i className="arrow down icon"></i></button>
              <button className="ui button" onClick={ this.clickButton.bind(this, 'right') }><i className="arrow right icon"></i></button>
            </div>
            <br />
            <div className="ui button" onClick={ this.clickButton.bind(this) }>
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

