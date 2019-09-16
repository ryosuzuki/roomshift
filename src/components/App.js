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
    this.currentRobotID = 0
    this.state = {
      robots: [],
      data: null,
      ids: [],
      corners: [],
      points: [],
      allRobots: [],
      virtualObject: [],
    }
    // this.socket.onmessage = this.onMessage.bind(this)
    // this.socket.onmessage = Camera.onMessage.bind(Camera)
    this.socket.on('frame', this.updateRobots.bind(this))
    this.networkID = '192.168.1.'
    this.deviceIPs = ['158','68','149','225','147', 'user']
    this.ips = {}
    for (var i = 0; i < this.deviceIPs.length; i++){
      this.ips[i] = this.networkID + this.deviceIPs[i]
    }
    console.log(this.ips)
    // this.ips = {
    //   0: '192.168.1.147',
    //   1: '192.168.1.158',
    //   2: '192.168.1.149'
    // }
    this.port = 8883
    this.width = 1000
    this.height = 700

    this.log()
    this.forceStop = false
  }

  componentDidMount() {
  }

  updateVirtualObjects(data) {
    let origin = data.origin
    let objects = data.chairs
    let virtualObjects = []
    for (let i = 0; i < objects.length; i++) {
      let object = objects[i]
      let virtualObject = {
        id: `virtual-object-${object.id}`,
        pos: {
          x: object.position.x,
          y: object.position.y,
          z: object.position.z
        },
        angle: object.rotation.y
      }
      virtualObjects[i] = virtualObject
    }
    this.setState({ virtualObjects: virtualObjects })
  }

  updateRobots(data) {
    //console.log(data)
    let objects = data.components['6dEuler'].rigidBodies
    let foundRobots = []
    let totalRobots = []
    let user = {}
    for (let i = 0; i < objects.length; i++) {
      let object = objects[i]
      if (this.deviceIPs[i] === 'user') {
        user = {
          id: 'user',
          pos: { x: object.x / 7, y: - object.y / 7, z: object.z / 7 },
          angle: (-object.euler3 + 360 + 270) % 360,
        }
        continue
      }
      let robot = null
      if (!object.x || !object.y || !object.z){
        robot = { id: i }
      }else{
        robot = {
          id: i,
          pos: { x: object.x / 7, y: - object.y / 7, z: object.z / 7 },
          angle: (-object.euler3 + 360 + 270) % 360,
          velocity: { x: 0, y: 0 },
          prefSpeed: 0.5,
          size: 1,
        }
        foundRobots.push(robot)
      }
      totalRobots.push(robot)
    }
    this.setState({ data: data, robots: foundRobots, allRobots: totalRobots, user: user })
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
    console.log('Robot: ' + this.state.robots[0].pos.x + ', ' + this.state.robots[0].pos.y)
    console.log(point.x + ' ' + point.y)

    let error = 0
    while (true) {
      try {
        if (this.forceStop) break
        let res = Calculate.calculate(id, target)
        let distThreshold = 10
        let dirThreshold = 10
        let angleThreshold = 5
        let sleepTime = 30
        //console.log(res.dist)

        const dt = 1
        let rvo = Calculate.getRvoVelocity(id, target, dt)
        //console.log(rvo)
        let angleDiff = (360 + res.angleDiff) % 360
        let calc = this.getDirection(rvo.diff, dirThreshold)
        let dir = calc.dir
        // console.log('1: ' + dir)
        if(res.dist < distThreshold){
          dir = 'stop'
        }
        // console.log('2: ' + dir)

        let diff = calc.diff
        //console.log(calc)
        //if (dir === 'forward' || dir === 'backward') dir = 'stop'

        let base = Math.min(60, res.dist+50)
        let Kd = Math.min(8, (res.dist + 200) / 100)
        let param = 100
        let command
        let val = 150

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
          case 'stop':
            command = { left: 0, right: 0 }
            let message = { command: command, ip: this.ips[id], port: this.port }
            this.socket.emit('move', JSON.stringify(message))
            return
            break
        }
        let message = { command: command, ip: this.ips[id], port: this.port }
        //console.log(message)
        this.socket.emit('move', JSON.stringify(message))
        await this.sleep(sleepTime) // 100
      } catch (err) {
        console.log(err)
        console.log('lost AR marker')
        error++
        await this.sleep(100)
        if (error > 30) break
      }
    }
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

  shutDown(id){
    let command = {sleep: 1}
    let message = { command: command, ip: this.ips[id], port: this.port }
    this.socket.emit('move', JSON.stringify(message))
  }

  shutDownAll() {
    for (let robot of this.state.robots) {
      this.shutDown(robot.id)
    }
  }

  restart(id){
    let command = {reset: 1}
    let message = { command: command, ip: this.ips[id], port: this.port }
    this.socket.emit('move', JSON.stringify(message))
  }

  restartAll(){
    for (let robot of this.state.robots) {
      this.restart(robot.id)
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
    let val = 150
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
      case 'raise':
        command.a1 = 0
        command.a2 = 1
        break
      case 'lower':
        command.a1 = 1
        command.a2 = 0
        break
      case 'stop':
        command.left = 0
        command.right = 0
        break
    }
    let id = this.currentRobotID
    let message = { command: command, ip: this.ips[id], port: this.port }
    this.socket.emit('move', JSON.stringify(message))
  }

  changeRobotID(val){
    this.currentRobotID = val
  }

  render() {

    // let ids = []
    // for(var id = 0; id < this.ips.length; id++){
    //   ids.push(id)
    // }
    // const manualControls = ids.map((id) =>
    //   <button className="ui button" onClick={ this.changeRobotID.bind(this, id) }>RIP {this.deviceIPs[id]}</button>
    // );

    // console.log(manualControls)

    //manualControls = <button className="ui button" onClick={ this.changeRobotID.bind(this, id) }>RIP {this.deviceIPs[id]}</button>;
    // let manualControls;
    // for(var id = 0; id < this.ips.length; id++){
    //   manualControls = <button className="ui button" onClick={ this.changeRobotID.bind(this, id) }>RIP {this.deviceIPs[id]}</button>;
    //   console.log(manualControls);
      //if(id % 3 == 0) manualControls += <br/>;
    // }

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

              { this.state.virtualObjects.map((virtualObject, i) => {
                return (
                  <virtualObject
                    id={virtualObject.id}
                    key={virtualObject.id}
                    x={virtualObject.pos.x}
                    y={virtualObject.pos.y}
                    angle={virtualObject.angle}
                  />
                )
              })}

              <User
                id={this.state.user.id}
                key={this.state.user.id}
                x={this.state.user.pos.x}
                y={this.state.user.pos.y}
                angle={this.state.user.angle}
              />

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
          <div className="two wide column">
            <div className="ui teal button" onClick={ this.start.bind(this) }>
              Move
            </div>
            <br/>
            <div className="ui orange button" onClick={ this.stopAll.bind(this) }>
              Force Stop
            </div>
            <br />
            <div className="three ui buttons">
              <button className="ui button"></button>
              <button className="ui green button" onClick={ this.clickButton.bind(this, 'up') }><i className="arrow up icon"></i></button>
              <button className="ui button"></button>
            </div>
            <br/>
            <div className="three ui buttons">
              <button className="ui green button" onClick={ this.clickButton.bind(this, 'left') }><i className="arrow left icon"></i></button>
              <button className="ui orange button" onClick={ this.clickButton.bind(this, 'stop') }>Stop</button>
              <button className="ui green button" onClick={ this.clickButton.bind(this, 'right') }><i className="arrow right icon"></i></button>
            </div>
            <br/>
            <div className="three ui buttons">
              <button className="ui button"></button>
              <button className="ui green button" onClick={ this.clickButton.bind(this, 'down') }><i className="arrow down icon"></i></button>
              <button className="ui button"></button>
            </div>
            {/* <br />
            <div className="ui button" onClick={ this.clickButton.bind(this) }>
              Stop
            </div> */}
            <br/>
            <button className="ui labeled icon button" onClick={ this.clickButton.bind(this, 'raise')}>
              <i className="caret square up icon"></i>
              Raise
            </button>
            <button className="ui labeled icon button" onClick={ this.clickButton.bind(this, 'lower')}>
              <i className="caret square down icon"></i>
              Lower
            </button>
            <br />
            <div className="ui buttons">
              <button className="ui button" onClick={ this.changeRobotID.bind(this, 0) }>RID 0</button>
              <button className="ui button" onClick={ this.changeRobotID.bind(this, 1) }>RID 1</button>
              <button className="ui button" onClick={ this.changeRobotID.bind(this, 2) }>RID 2</button>
              <button className="ui button" onClick={ this.changeRobotID.bind(this, 3) }>RID 3</button>
              <button className="ui button" onClick={ this.changeRobotID.bind(this, 4) }>RID 4</button>
            </div>
            <br/>
            <div className="ui red button" onClick={ this.shutDownAll.bind(this) }>
              SHUT DOWN
            </div>
            <div className="ui green button" onClick={ this.restartAll.bind(this) }>
              RESTART
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

