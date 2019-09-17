import React, { Component } from 'react'

class Point extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    this.x = this.props.x
    this.y = this.props.y
    this.angle = this.props.angle
    return(
      <g id={this.props.id}>
        <g className="block"
           transform={ `translate(${-this.x}, ${-this.y})` }
        >
          <circle
            cx={0}
            cy={0}
            r="10"
            fill="red"
          />
          <rect
            transform={ `rotate(${this.angle}) translate(-5, -15)`}
            width="10"
            height="10"
            fill="red"
          />
          <text x={5} y={-10} className="label">
            x: { this.props.x }, y: { this.props.y }, id: { this.props.id }
          </text>
        </g>
      </g>
    )
  }
}

export default Point
