export interface GraphNode {
  id: string
  label: string
  avatar_url?: string | null
  company?: string | null
  is_favorite: boolean
}

export interface GraphEdge {
  source: string
  target: string
  label: string
}
