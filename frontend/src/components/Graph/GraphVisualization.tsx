import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { select, drag, zoom, zoomIdentity } from "d3-selection"
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force"
import type { GraphEdge, GraphNode } from "./types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, Focus } from "@/lib/icons"

interface GraphVisualizationProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (nodeId: string) => void
  rootContactId?: string | null
}

// Color map for relationship types
const typeColors: Record<string, string> = {
  spouse: "#ec4899",
  parent: "#8b5cf6",
  child: "#a78bfa",
  sibling: "#6366f1",
  friend: "#10b981",
  colleague: "#3b82f6",
  manager: "#f59e0b",
  reports_to: "#f97316",
  partner: "#ef4444",
  neighbor: "#14b8a6",
}

function getEdgeColor(type: string): string {
  return typeColors[type] || "#94a3b8"
}

export function GraphVisualization({ nodes, edges, onNodeClick, rootContactId }: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<any>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Get unique relationship types for legend
  const relationshipTypes = useMemo(() => {
    const types = new Set(edges.map((e) => e.label))
    return Array.from(types)
  }, [edges])

  // Initialize simulation when nodes/edges change
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = select(svgRef.current)
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = 600

    // Clear previous
    svg.selectAll("*").remove()

    // Create the container group for zoom/pan
    const g = svg.append("g").attr("class", "graph-container")

    // Setup zoom
    const zoomBehavior = zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    svg.call(zoomBehavior)

    // Prepare nodes with initial positions
    const simNodes: any[] = nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
      radius: n.is_favorite ? 25 : 20,
    }))

    const simEdges = edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
    }))

    // Create simulation
    const simulation = forceSimulation(simNodes)
      .force(
        "link",
        forceLink(simEdges)
          .id((d: any) => d.id)
          .distance(100)
          .strength(0.5)
      )
      .force("charge", forceManyBody().strength(-300).distanceMax(500))
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "collide",
        forceCollide().radius((d: any) => d.radius + 5)
      )
      .alphaDecay(0.02)
      .on("tick", ticked)

    simulationRef.current = simulation

    // Draw edges
    const edgeGroup = g.append("g").attr("class", "edges")
    const edgeSelection = edgeGroup
      .selectAll("line")
      .data(simEdges)
      .enter()
      .append("line")
      .attr("stroke", (d) => getEdgeColor(d.label))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)

    // Draw edge labels
    const edgeLabelGroup = g.append("g").attr("class", "edge-labels")
    const edgeLabelSelection = edgeLabelGroup
      .selectAll("text")
      .data(simEdges)
      .enter()
      .append("text")
      .attr("font-size", "10px")
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .text((d) => d.label)

    // Draw nodes
    const nodeGroup = g.append("g").attr("class", "nodes")
    const nodeSelection = nodeGroup
      .selectAll("g")
      .data(simNodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (event, d) => {
        event.stopPropagation()
        setSelectedNode(d.id)
        if (onNodeClick) onNodeClick(d.id)
      })

    // Node circles
    nodeSelection
      .append("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => (d.is_favorite ? "#f59e0b" : "#3b82f6"))
      .attr("stroke", (d: any) =>
        d.id === selectedNode || d.id === rootContactId ? "#ef4444" : "#1e293b"
      )
      .attr("stroke-width", (d: any) =>
        d.id === selectedNode || d.id === rootContactId ? 3 : 2
      )

    // Node labels
    nodeSelection
      .append("text")
      .text((d: any) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.radius + 15)
      .attr("font-size", "12px")
      .attr("fill", "#1e293b")

    // Tick function
    function ticked() {
      edgeSelection
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      edgeLabelSelection
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 5)

      nodeSelection.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    }

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    // Zoom to root contact if specified
    if (rootContactId && simNodes.length > 0) {
      const rootNode = simNodes.find((n) => n.id === rootContactId)
      if (rootNode) {
        const scale = 1.5
        const x = width / 2 - rootNode.x * scale
        const y = height / 2 - rootNode.y * scale
        svg.transition().duration(750).call(
          zoomBehavior.transform,
          zoomIdentity.translate(x, y).scale(scale)
        )
      }
    }

    return () => {
      simulation.stop()
    }
  }, [nodes, edges, selectedNode, rootContactId, onNodeClick])

  const handleZoomIn = () => {
    if (!svgRef.current) return
    select(svgRef.current).transition().call(
      zoom().scaleBy,
      1.3
    )
  }

  const handleZoomOut = () => {
    if (!svgRef.current) return
    select(svgRef.current).transition().call(
      zoom().scaleBy,
      0.7
    )
  }

  const handleReset = () => {
    if (!svgRef.current) return
    select(svgRef.current).transition().call(
      zoom().transform,
      zoomIdentity
    )
  }

  const handleFocusNode = (nodeId: string) => {
    if (!svgRef.current || !simulationRef.current) return
    const node = simulationRef.current.nodes().find((n: any) => n.id === nodeId)
    if (!node) return
    const svg = select(svgRef.current)
    const container = containerRef.current
    if (!container) return
    const width = container.clientWidth
    const height = 600
    const scale = 1.5
    const x = width / 2 - node.x * scale
    const y = height / 2 - node.y * scale
    svg.transition().duration(750).call(
      zoom().transform,
      zoomIdentity.translate(x, y).scale(scale)
    )
    setSelectedNode(nodeId)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleReset} title="Reset View">
          <RotateCcw className="size-4" />
        </Button>
        {selectedNode && (
          <Button variant="outline" size="sm" onClick={() => handleFocusNode(selectedNode)}>
            <Focus className="size-4 mr-2" />
            Focus: {nodes.find((n) => n.id === selectedNode)?.label}
          </Button>
        )}
      </div>

      {/* Graph Visualization */}
      <div ref={containerRef} className="w-full h-[600px] relative border rounded-lg overflow-hidden bg-slate-50">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No data to display</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ cursor: "grab" }}
          />
        )}
      </div>

      {/* Legend */}
      {relationshipTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relationship Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {relationshipTypes.map((type) => (
                <Badge
                  key={type}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: getEdgeColor(type) }}
                  />
                  <span className="capitalize">{type.replace(/_/g, " ")}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
