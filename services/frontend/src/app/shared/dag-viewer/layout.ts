import * as dagre from 'dagre'
import { NODE_WIDTH, NODE_HEIGHT, PositionedNode, DisplayNode, DisplayEdge } from './dag-viewer.types'

export function layoutWithDagre(nodes: DisplayNode[], edges: DisplayEdge[]): PositionedNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 120 })

  nodes.forEach((node) => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach((edge) => {
    if (nodes.some((n) => n.id === edge.source_node_id) && nodes.some((n) => n.id === edge.target_node_id)) {
      g.setEdge(edge.source_node_id, edge.target_node_id)
    }
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    return { ...node, x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 }
  })
}

export function layoutCircular(nodes: DisplayNode[]): PositionedNode[] {
  const count = nodes.length
  if (count === 0) return []
  if (count === 1) return [{ ...nodes[0], x: 0, y: 0 }]

  const circumference = count * (NODE_WIDTH + 40)
  const radius = Math.max(300, circumference / (2 * Math.PI))

  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / count
    return {
      ...node,
      x: radius * Math.cos(angle) - NODE_WIDTH / 2,
      y: radius * Math.sin(angle) - NODE_HEIGHT / 2,
    }
  })
}
