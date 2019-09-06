import React, { Component } from 'react'

class Point extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    let x = -this.props.x
    let y = -this.props.y
    return(
      <g className="point" id={this.props.id}>
        <circle
          cx={x}
          cy={y}
          r="10"
          fill="red"
        />
        <text x={x + 5} y={y - 10} className="label">
          x: { this.props.x }, y: { this.props.y }, id: { this.props.id }
        </text>
      </g>
    )
  }
}

export default Point
