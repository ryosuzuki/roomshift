import React, { Component } from 'react'

class VirtualObject extends Component {
  constructor(props) {
    super(props)

    this.size = 30
    this.color = '#00ff00'
    this.stroke = '#eee'

    this.count = 0
  }

  onMouseDown() {
    console.log('mouse down')
    let point = {
      x: this.props.x,
      y: this.props.y,
      angle: this.props.angle
    }
    console.log(point)
    let max = 2 // this.state.robots.length
    let points = App.state.points
    let i = this.count % max
    points[i] = point
    App.setState({ points: points })
    this.count++
  }

  render() {
    this.x = this.props.x
    this.y = this.props.y
    this.angle = this.props.angle

    return(
      <g id={`chair-${this.props.id}`}>
        <g
          className="block"
          onMouseDown={this.onMouseDown.bind(this)}
          transform={ `translate(${-this.x}, ${-this.y})` }
        >
          <circle
            cx={ 0 }
            cy={ 0 }
            r={ this.size }
            fill={ this.color }
            stroke={ this.props.id == this.props.highlightId ? 'blue' : this.stroke }
            strokeWidth="6"
          />
          <rect
            transform={ `rotate(${this.angle}) translate(-5, -35)`}
            width="10"
            height="10"
            fill="#f00"
          />
          <text x={5} y={-10} className="label">
            id: {`chair-${this.props.id}`}
          </text>
          <text x={5} y={10} className="label">
            x: {parseInt(this.props.x)}, y: {parseInt(this.props.y)}
          </text>
          <text x={5} y={30} className="label">
            angle: {parseInt(this.props.angle)}
          </text>
        </g>
      </g>
    )
  }
}

export default VirtualObject
