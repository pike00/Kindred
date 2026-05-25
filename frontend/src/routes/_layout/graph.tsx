import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { GraphService } from "@/client"
import { GraphVisualization } from "@/components/Graph/GraphVisualization"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users } from "@/lib/icons"

export const Route = createFileRoute("/_layout/graph")({
  component: RelationshipGraphPage,
})

function RelationshipGraphPage() {
  const [depth, setDepth] = useState(2)
  const [rootContactId, setRootContactId] = useState<string>("")

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["graph", "contacts", depth, rootContactId],
    queryFn: () =>
      GraphService.getGraphContacts({
        depth,
        rootContactId: rootContactId || undefined,
      }),
  })

  const graphData = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Relationship Graph
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Interactive force-directed graph of your contacts and their
            relationships
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Users className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Graph Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="depth">Depth:</Label>
              <select
                id="depth"
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value={1}>1-hop (direct)</option>
                <option value={2}>2-hop (default)</option>
                <option value={3}>3-hop (full)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="root">Root Contact ID (optional):</Label>
              <Input
                id="root"
                placeholder="Leave empty for full graph"
                value={rootContactId}
                onChange={(e) => setRootContactId(e.target.value)}
                className="w-64"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRootContactId("")
                refetch()
              }}
            >
              <Users className="size-4 mr-2" />
              Show All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Graph Visualization */}
      <Card className="min-h-[600px]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <p className="text-muted-foreground">Loading graph...</p>
            </div>
          ) : graphData?.nodes?.length ? (
            <GraphVisualization
              nodes={graphData.nodes}
              edges={graphData.edges}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <Users className="size-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No relationships found. Add some relationships to see the
                  graph.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-blue-500" />
              <span>Contact</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-amber-500" />
              <span>Favorite</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="24" height="12">
                <line
                  x1="0"
                  y1="6"
                  x2="24"
                  y2="6"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span>Relationship</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
