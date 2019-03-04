import React, { Component } from 'react'

class Point extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return(
      <g className="point" id={this.props.id}>
        <circle
          cx={this.props.x}
          cy={this.props.y}
          r="10"
          fill="red"
        />
        <text x={this.props.x + 5} y={this.props.y - 10} className="label">
          x: { this.props.x }, y: { this.props.y }, id: { this.props.id }
        </text>
      </g>
    )
  }
}

export default Point
