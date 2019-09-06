import React, { Component } from 'react'

class Robot extends Component {
  constructor(props) {
    super(props)

    this.size = 30
    this.color = '#aaa'
    this.stroke = '#222'
  }

  onMouseDown() {
    console.log('mouse down')
  }

  render() {
    this.x = (this.props.x) 
    this.y = (this.props.y) 
    this.angle = this.props.angle
    
    return(
      <g id={this.props.id}>
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
            stroke={ this.stroke }
            strokeWidth="3"
          />
          <rect
            transform={ `rotate(${this.angle}) translate(-5, -35)`}
            width="10"
            height="10"
            fill="#f00"
          />
          <text x={5} y={-10} className="label">
            id: {this.props.id}
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

export default Robot
