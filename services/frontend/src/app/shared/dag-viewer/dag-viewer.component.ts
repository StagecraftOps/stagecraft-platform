import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ElementRef, ViewChild, effect, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { LucideAngularModule, Maximize2, Minimize2 } from 'lucide-angular'
import type { GraphNodeData, GraphEdgeData } from '../../core/types'
import { NODE_WIDTH, NODE_HEIGHT, NODE_COLORS, TYPE_LABELS, NODE_DESCRIPTIONS, DisplayNode, DisplayEdge, PositionedNode } from './dag-viewer.types'
import { layoutWithDagre, layoutCircular } from './layout'

interface CollapsedEdge {
  id: string
  source_node_id: string
  target_node_id: string
  kind: 'workflow_run_trigger' | 'calls_reusable'
  count: number
}
interface StubNode {
  id: string
  label: string
  resolvedWorkflowId: string | null
}
interface StubEdge {
  id: string
  source: string
  target: string
  edge_type: string
}

@Component({
  selector: 'app-dag-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './dag-viewer.component.html',
})
export class DagViewerComponent implements OnChanges, AfterViewInit {
  @Input() nodes: GraphNodeData[] = []
  @Input() edges: GraphEdgeData[] = []
  @Input() mode: 'dependency' | 'knowledge' = 'dependency'
  @ViewChild('viewport') viewportRef?: ElementRef<HTMLElement>

  icons = { Maximize2, Minimize2 }
  NODE_WIDTH = NODE_WIDTH
  NODE_HEIGHT = NODE_HEIGHT
  NODE_COLORS = NODE_COLORS
  TYPE_LABELS = TYPE_LABELS
  NODE_DESCRIPTIONS = NODE_DESCRIPTIONS

  nodeTooltip(n: PositionedNode): string {
    if (n.nodeType === null) return n.label
    const description = NODE_DESCRIPTIONS[n.nodeType] || ''
    return description ? `${n.label}\n\n${description}` : n.label
  }

  hidden = signal<Set<string>>(new Set())
  query = signal('')
  focusId = signal<string | null>(null)
  expanded = signal(false)
  drilledWorkflowId = signal<string | null>(null)

  pan = signal({ x: 0, y: 0 })
  zoom = signal(1)
  private dragging = false
  private dragStart = { x: 0, y: 0 }
  private panStart = { x: 0, y: 0 }

  private nodesSig = signal<GraphNodeData[]>([])
  private edgesSig = signal<GraphEdgeData[]>([])

  private viewInitialized = false

  constructor(private router: Router) {
    effect(() => {
      this.visibleData()
      if (this.viewInitialized) queueMicrotask(() => this.fitToView())
    })
  }

  ngAfterViewInit() {
    this.viewInitialized = true
    queueMicrotask(() => this.fitToView())
  }

  fitToView() {
    const el = this.viewportRef?.nativeElement
    const nodes = this.visibleData().positioned
    if (!el || nodes.length === 0) return

    const minX = Math.min(...nodes.map((n) => n.x))
    const minY = Math.min(...nodes.map((n) => n.y))
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_WIDTH))
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_HEIGHT))
    const boxWidth = Math.max(maxX - minX, 1)
    const boxHeight = Math.max(maxY - minY, 1)

    const cw = el.clientWidth
    const ch = el.clientHeight
    if (cw === 0 || ch === 0) return

    const newZoom = Math.min(2, Math.max(0.05, Math.min(cw / boxWidth, ch / boxHeight) * 0.9))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    this.zoom.set(newZoom)
    this.pan.set({ x: cw / 2 - centerX * newZoom, y: ch / 2 - centerY * newZoom })
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['nodes']) this.nodesSig.set(this.nodes)
    if (changes['edges']) this.edgesSig.set(this.edges)
  }

  nodeById = computed(() => new Map(this.nodesSig().map((n) => [n.id, n])))
  workflowNodes = computed(() => this.nodesSig().filter((n) => n.node_type === 'workflow'))
  workflowNodeByFile = computed(() => {
    const m = new Map<string, GraphNodeData>()
    for (const n of this.workflowNodes()) if (n.workflow_file) m.set(n.workflow_file, n)
    return m
  })
  jobsByWorkflowFile = computed(() => {
    const m = new Map<string, GraphNodeData[]>()
    for (const n of this.nodesSig()) {
      if (n.node_type !== 'job' || !n.workflow_file) continue
      if (!m.has(n.workflow_file)) m.set(n.workflow_file, [])
      m.get(n.workflow_file)!.push(n)
    }
    return m
  })

  collapsed = computed(() => {
    const collapsedNodes = this.workflowNodes().map((n) => ({ ...n }))
    const agg = new Map<string, { source: string; target: string; kind: 'workflow_run_trigger' | 'calls_reusable'; count: number }>()

    for (const e of this.edgesSig()) {
      if (e.edge_type === 'workflow_run_trigger') {
        const key = `${e.source_node_id}->${e.target_node_id}`
        const existing = agg.get(key)
        if (existing) existing.count += 1
        else agg.set(key, { source: e.source_node_id, target: e.target_node_id, kind: 'workflow_run_trigger', count: 1 })
        continue
      }
      if (e.edge_type === 'uses_reusable' || e.edge_type === 'matrix_fanout') {
        const sourceJob = this.nodeById().get(e.source_node_id)
        const targetNode = this.nodeById().get(e.target_node_id)
        if (!sourceJob?.workflow_file || !targetNode) continue
        if (targetNode.node_type !== 'workflow') continue
        const sourceWorkflow = this.workflowNodeByFile().get(sourceJob.workflow_file)
        if (!sourceWorkflow || sourceWorkflow.id === targetNode.id) continue
        const key = `${sourceWorkflow.id}->${targetNode.id}`
        const existing = agg.get(key)
        if (existing) existing.count += 1
        else agg.set(key, { source: sourceWorkflow.id, target: targetNode.id, kind: 'calls_reusable', count: 1 })
      }
    }

    const collapsedEdges: CollapsedEdge[] = Array.from(agg.values()).map((a) => ({
      id: `collapsed::${a.source}->${a.target}`,
      source_node_id: a.source,
      target_node_id: a.target,
      kind: a.kind,
      count: a.count,
    }))

    return { collapsedNodes, collapsedEdges }
  })

  drilled = computed(() => {
    const drilledId = this.drilledWorkflowId()
    if (!drilledId) return null
    const workflow = this.nodeById().get(drilledId)
    if (!workflow?.workflow_file) return null
    const wf = workflow.workflow_file

    const ownJobs = this.jobsByWorkflowFile().get(wf) ?? []
    const ownIds = new Set(ownJobs.map((n) => n.id))

    const compositeIds = new Set<string>()
    for (const e of this.edgesSig()) {
      if (e.edge_type === 'uses_composite' && ownIds.has(e.source_node_id)) compositeIds.add(e.target_node_id)
    }
    const compositeNodes = Array.from(compositeIds)
      .map((id) => this.nodeById().get(id))
      .filter((n): n is GraphNodeData => Boolean(n))

    const internalIds = new Set(ownIds)
    compositeIds.forEach((id) => internalIds.add(id))
    const internalEdges = this.edgesSig().filter(
      (e) => internalIds.has(e.source_node_id) && internalIds.has(e.target_node_id) &&
        (e.edge_type === 'needs' || e.edge_type === 'needs_output' || e.edge_type === 'uses_composite'),
    )

    const stubNodes = new Map<string, StubNode>()
    const stubEdges: StubEdge[] = []

    const addStub = (target: GraphNodeData, edgeId: string, source: string, dest: string, edgeType: string) => {
      const stubId = `stub::${target.external_key}`
      if (!stubNodes.has(stubId)) {
        stubNodes.set(stubId, { id: stubId, label: target.display_name, resolvedWorkflowId: target.node_type === 'workflow' ? target.id : null })
      }
      stubEdges.push({ id: edgeId, source, target: stubId, edge_type: edgeType })
    }

    for (const e of this.edgesSig()) {
      if (ownIds.has(e.source_node_id) && !internalIds.has(e.target_node_id)) {
        if (e.edge_type === 'uses_reusable' || e.edge_type === 'matrix_fanout' || e.edge_type === 'repository_dispatch') {
          const target = this.nodeById().get(e.target_node_id)
          if (target) addStub(target, e.id, e.source_node_id, e.target_node_id, e.edge_type)
        }
      }
      if (e.edge_type === 'workflow_run_trigger' && (e.source_node_id === drilledId || e.target_node_id === drilledId)) {
        const otherId = e.source_node_id === drilledId ? e.target_node_id : e.source_node_id
        const other = this.nodeById().get(otherId)
        if (other) {
          const src = e.source_node_id === drilledId ? drilledId : otherId
          const dst = e.source_node_id === drilledId ? otherId : drilledId
          addStub(other, e.id, src, dst, 'workflow_run_trigger')
        }
      }
      if ((e.edge_type === 'uses_reusable' || e.edge_type === 'matrix_fanout') && e.target_node_id === drilledId) {
        const source = this.nodeById().get(e.source_node_id)
        if (source) addStub(source, e.id, e.source_node_id, drilledId, e.edge_type)
      }
    }

    return {
      workflow,
      internalNodes: [...ownJobs, ...compositeNodes],
      internalEdges,
      stubNodes: Array.from(stubNodes.values()),
      stubEdges,
    }
  })

  knowledgeCounts = computed(() => {
    if (this.mode !== 'knowledge') return null
    const counts = new Map<string, { rules: number; failures: number; metrics: number }>()
    for (const e of this.edgesSig()) {
      const target = this.nodeById().get(e.target_node_id)
      if (target?.node_type !== 'workflow') continue
      const c = counts.get(target.id) ?? { rules: 0, failures: 0, metrics: 0 }
      if (e.edge_type === 'governs') c.rules += 1
      else if (e.edge_type === 'caused_by') c.failures += 1
      else if (e.edge_type === 'measured_by') c.metrics += 1
      counts.set(target.id, c)
    }
    return counts
  })

  knowledgeDrilled = computed(() => {
    const drilledId = this.drilledWorkflowId()
    if (this.mode !== 'knowledge' || !drilledId) return null
    const workflow = this.nodeById().get(drilledId)
    if (!workflow) return null
    const relevantEdges = this.edgesSig().filter((e) => e.target_node_id === drilledId)
    const sourceIds = new Set(relevantEdges.map((e) => e.source_node_id))
    const sourceNodes = Array.from(sourceIds)
      .map((id) => this.nodeById().get(id))
      .filter((n): n is GraphNodeData => Boolean(n))
    return { workflow, sourceNodes, edges: relevantEdges }
  })

  displayData = computed<{ displayNodes: DisplayNode[]; displayEdges: DisplayEdge[] }>(() => {
    if (this.mode === 'knowledge') {
      const drilledId = this.drilledWorkflowId()
      const kd = this.knowledgeDrilled()
      if (drilledId && kd) {
        const dNodes: DisplayNode[] = [
          { id: kd.workflow.id, label: kd.workflow.display_name, nodeType: 'workflow' },
          ...kd.sourceNodes.map((n) => ({ id: n.id, label: n.display_name, nodeType: n.node_type })),
        ]
        const dEdges: DisplayEdge[] = kd.edges.map((e) => ({
          id: e.id, source_node_id: e.source_node_id, target_node_id: e.target_node_id, edge_type: e.edge_type, confidence: e.confidence,
        }))
        return { displayNodes: dNodes, displayEdges: dEdges }
      }
      const counts = this.knowledgeCounts()
      const kNodes: DisplayNode[] = this.workflowNodes().map((n) => {
        const c = counts?.get(n.id)
        const parts: string[] = []
        if (c?.rules) parts.push(`${c.rules} rule${c.rules === 1 ? '' : 's'}`)
        if (c?.failures) parts.push(`${c.failures} failure${c.failures === 1 ? '' : 's'}`)
        if (c?.metrics) parts.push(`${c.metrics} metric${c.metrics === 1 ? '' : 's'}`)
        return {
          id: n.id,
          label: parts.length ? `${n.display_name} — ${parts.join(', ')}` : `${n.display_name} — no data yet`,
          nodeType: 'workflow',
          emphasize: Boolean(c?.failures),
        }
      })
      return { displayNodes: kNodes, displayEdges: [] }
    }

    const drilledId = this.drilledWorkflowId()
    const d = this.drilled()
    if (drilledId && d) {
      const dNodes: DisplayNode[] = [
        ...d.internalNodes.map((n) => ({ id: n.id, label: n.display_name, nodeType: n.node_type })),
        ...d.stubNodes.map((s) => ({ id: s.id, label: s.label, nodeType: null })),
      ]
      const dEdges: DisplayEdge[] = [
        ...d.internalEdges.map((e) => ({ id: e.id, source_node_id: e.source_node_id, target_node_id: e.target_node_id, edge_type: e.edge_type, confidence: e.confidence })),
        ...d.stubEdges.map((e) => ({ id: e.id, source_node_id: e.source, target_node_id: e.target, edge_type: e.edge_type, confidence: 'certain' as const })),
      ]
      return { displayNodes: dNodes, displayEdges: dEdges }
    }

    const c = this.collapsed()
    const cNodes: DisplayNode[] = c.collapsedNodes.map((n) => {
      const jobCount = n.workflow_file ? this.jobsByWorkflowFile().get(n.workflow_file)?.length ?? 0 : 0
      return { id: n.id, label: `${n.display_name} - ${jobCount} job${jobCount === 1 ? '' : 's'}`, nodeType: 'workflow' }
    })
    const cEdges: DisplayEdge[] = c.collapsedEdges.map((e) => ({
      id: e.id, source_node_id: e.source_node_id, target_node_id: e.target_node_id, edge_type: e.kind, confidence: 'certain', count: e.count,
    }))
    return { displayNodes: cNodes, displayEdges: cEdges }
  })

  typeCounts = computed(() => {
    const m: Record<string, number> = {}
    for (const n of this.displayData().displayNodes) {
      if (n.nodeType === null) continue
      m[n.nodeType] = (m[n.nodeType] ?? 0) + 1
    }
    return m
  })

  presentTypes = computed(() => Object.keys(this.typeCounts()).sort())

  neighborsOf = computed(() => {
    const adj = new Map<string, Set<string>>()
    for (const e of this.displayData().displayEdges) {
      if (!adj.has(e.source_node_id)) adj.set(e.source_node_id, new Set())
      if (!adj.has(e.target_node_id)) adj.set(e.target_node_id, new Set())
      adj.get(e.source_node_id)!.add(e.target_node_id)
      adj.get(e.target_node_id)!.add(e.source_node_id)
    }
    return adj
  })

  focusName = computed(() => {
    const id = this.focusId()
    return id ? this.displayData().displayNodes.find((n) => n.id === id)?.label : null
  })

  visibleData = computed(() => {
    const { displayNodes, displayEdges } = this.displayData()
    let visible: Set<string>
    const focus = this.focusId()
    if (focus) {
      visible = new Set([focus])
      this.neighborsOf().get(focus)?.forEach((id) => visible.add(id))
    } else {
      visible = new Set(displayNodes.filter((n) => n.nodeType === null || !this.hidden().has(n.nodeType)).map((n) => n.id))
    }

    const q = this.query().trim().toLowerCase()
    const visibleNodes = displayNodes.filter((n) => visible.has(n.id))
    const visibleEdges = displayEdges.filter((e) => visible.has(e.source_node_id) && visible.has(e.target_node_id))

    const useCircular = !this.drilledWorkflowId()
    const positioned = useCircular ? layoutCircular(visibleNodes) : layoutWithDagre(visibleNodes, visibleEdges)

    return { positioned, edges: visibleEdges, query: q }
  })

  edgeLabel(e: DisplayEdge): string {
    if (e.edge_type === 'calls_reusable') return ''
    if (e.count && e.count > 1) return `${e.edge_type.replace(/_/g, ' ')} x${e.count}`
    return e.edge_type.replace(/_/g, ' ')
  }

  edgePath(e: DisplayEdge): string {
    const nodes = this.visibleData().positioned
    const s = nodes.find((n) => n.id === e.source_node_id)
    const t = nodes.find((n) => n.id === e.target_node_id)
    if (!s || !t) return ''
    const sx = s.x + NODE_WIDTH / 2
    const sy = s.y + NODE_HEIGHT / 2
    const tx = t.x + NODE_WIDTH / 2
    const ty = t.y + NODE_HEIGHT / 2
    const mx = (sx + tx) / 2
    const my = (sy + ty) / 2
    return `M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`
  }

  edgeMidpoint(e: DisplayEdge): { x: number; y: number } {
    const nodes = this.visibleData().positioned
    const s = nodes.find((n) => n.id === e.source_node_id)
    const t = nodes.find((n) => n.id === e.target_node_id)
    if (!s || !t) return { x: 0, y: 0 }
    return { x: (s.x + t.x) / 2 + NODE_WIDTH / 2, y: (s.y + t.y) / 2 + NODE_HEIGHT / 2 }
  }

  edgeStroke(e: DisplayEdge): string {
    if (e.confidence === 'heuristic') return '#f59e0b'
    if (e.confidence === 'ambiguous') return '#ef4444'
    return '#94a3b8'
  }

  edgeDash(e: DisplayEdge): string {
    if (e.confidence === 'heuristic') return '6 3'
    if (e.confidence === 'ambiguous') return '2 4'
    return ''
  }

  matchesQuery(n: PositionedNode): boolean {
    const q = this.visibleData().query
    return q ? n.label.toLowerCase().includes(q) : true
  }

  toggleType(t: string) {
    const next = new Set(this.hidden())
    if (next.has(t)) next.delete(t)
    else next.add(t)
    this.hidden.set(next)
  }

  onNodeClick(node: PositionedNode) {
    if (this.mode === 'knowledge') {
      const clicked = this.nodeById().get(node.id)
      if (!this.drilledWorkflowId()) {
        if (clicked?.node_type === 'workflow') {
          this.drilledWorkflowId.set(node.id)
          this.focusId.set(null)
          this.query.set('')
        }
        return
      }
      if (clicked?.node_type === 'failure') {
        const remediationId = clicked.external_key.replace(/^failure::/, '')
        this.router.navigate(['/remediation', remediationId])
        return
      }
      this.focusId.set(node.id)
      return
    }

    if (!this.drilledWorkflowId()) {
      const clicked = this.nodeById().get(node.id)
      if (clicked?.node_type === 'workflow') {
        this.drilledWorkflowId.set(node.id)
        this.focusId.set(null)
        this.query.set('')
        return
      }
    } else {
      const stub = this.drilled()?.stubNodes.find((s) => s.id === node.id)
      if (stub?.resolvedWorkflowId) {
        this.drilledWorkflowId.set(stub.resolvedWorkflowId)
        this.focusId.set(null)
        this.query.set('')
        return
      }
      if (stub) return
    }
    this.focusId.set(node.id)
  }

  goBackToAll() {
    this.drilledWorkflowId.set(null)
    this.focusId.set(null)
    this.query.set('')
  }

  clearFocus() {
    this.focusId.set(null)
  }

  breadcrumbLabel(): string {
    if (this.mode === 'knowledge') return this.knowledgeDrilled()?.workflow.display_name ?? ''
    return this.drilled()?.workflow.display_name ?? ''
  }

  toggleExpanded() {
    this.expanded.set(!this.expanded())
    queueMicrotask(() => this.fitToView())
  }

  onWheel(event: WheelEvent) {
    event.preventDefault()
    const el = event.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const cursorX = event.clientX - rect.left
    const cursorY = event.clientY - rect.top

    const oldZoom = this.zoom()
    const factor = Math.exp(-event.deltaY * 0.001)
    const newZoom = Math.min(2, Math.max(0.05, oldZoom * factor))

    const pan = this.pan()
    const worldX = (cursorX - pan.x) / oldZoom
    const worldY = (cursorY - pan.y) / oldZoom

    this.pan.set({ x: cursorX - worldX * newZoom, y: cursorY - worldY * newZoom })
    this.zoom.set(newZoom)
  }

  onMouseDown(event: MouseEvent) {
    this.dragging = true
    this.dragStart = { x: event.clientX, y: event.clientY }
    this.panStart = { ...this.pan() }
  }

  onMouseMove(event: MouseEvent) {
    if (!this.dragging) return
    const dx = event.clientX - this.dragStart.x
    const dy = event.clientY - this.dragStart.y
    this.pan.set({ x: this.panStart.x + dx, y: this.panStart.y + dy })
  }

  onMouseUp() {
    this.dragging = false
  }

  resetView() {
    this.fitToView()
  }

  footerText(): string {
    if (this.mode === 'knowledge') {
      return this.drilledWorkflowId()
        ? 'Showing this workflow\'s own governance rules, failures, and metrics. Click a red Failure node to open its full remediation analysis. Click "All workflows" to go back.'
        : 'Click a workflow to see its governance rules, failures, and metrics. Workflows outlined in red have at least one failure.'
    }
    return this.drilledWorkflowId()
      ? 'Showing this workflow\'s jobs and dependencies. Dashed nodes are external references — click a resolvable one to jump straight there. Click "All workflows" to go back.'
      : 'Click a workflow to see its internal jobs and dependencies. Use the type chips to hide categories, or search to highlight.'
  }
}
