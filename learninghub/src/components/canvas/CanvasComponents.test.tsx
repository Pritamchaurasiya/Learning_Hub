import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CanvasToolbar } from './CanvasToolbar'
import { GraphInspectorPanel } from './GraphInspectorPanel'
import { EquationRecognizerDrawer } from './EquationRecognizerDrawer'
import { GraphNode, GraphEdge, LatexRecognitionResult } from '../../types/canvasStudio'

describe('Canvas Components (Milestone 14)', () => {
  it('renders CanvasToolbar and triggers tool & color changes', () => {
    const onSelectTool = vi.fn()
    const onChangeColor = vi.fn()
    const onClear = vi.fn()
    const onExportSvg = vi.fn()

    render(
      <CanvasToolbar
        activeTool="PEN"
        onSelectTool={onSelectTool}
        activeColor="#38bdf8"
        onChangeColor={onChangeColor}
        strokeWidth={4}
        onChangeStrokeWidth={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onClear={onClear}
        onExportSvg={onExportSvg}
        canUndo={true}
        canRedo={false}
      />
    )

    expect(screen.getByText('Pen')).toBeInTheDocument()
    expect(screen.getByText('Highlighter')).toBeInTheDocument()

    // Trigger tool click
    fireEvent.click(screen.getByText('Highlighter'))
    expect(onSelectTool).toHaveBeenCalledWith('HIGHLIGHTER')

    // Trigger clear
    fireEvent.click(screen.getByTitle('Clear Canvas'))
    expect(onClear).toHaveBeenCalled()

    // Trigger Export SVG
    fireEvent.click(screen.getByTitle('Export Vector SVG'))
    expect(onExportSvg).toHaveBeenCalled()
  })

  it('renders GraphInspectorPanel with vertices and computes shortest path', () => {
    const nodes: GraphNode[] = [
      { id: 'node-1', label: 'A', x: 100, y: 100, radius: 24 },
      { id: 'node-2', label: 'B', x: 200, y: 100, radius: 24 },
    ]
    const edges: GraphEdge[] = [
      { id: 'edge-1', fromNodeId: 'node-1', toNodeId: 'node-2', directed: true },
    ]

    const onAddNode = vi.fn()
    const onAddEdge = vi.fn()

    render(
      <GraphInspectorPanel
        nodes={nodes}
        edges={edges}
        onAddNode={onAddNode}
        onAddEdge={onAddEdge}
      />
    )

    expect(screen.getByText('DSA Graph Inspector')).toBeInTheDocument()
    expect(screen.getByText('|V| = 2')).toBeInTheDocument()
    expect(screen.getByText('|E| = 1')).toBeInTheDocument()

    // Add node
    const input = screen.getByPlaceholderText(/New Vertex Label/i)
    fireEvent.change(input, { target: { value: 'Z' } })
    fireEvent.click(screen.getByRole('button', { name: /Add Vertex/i }))
    expect(onAddNode).toHaveBeenCalledWith('Z')
  })

  it('renders EquationRecognizerDrawer with OCR result and LaTeX copying', () => {
    const mockResult: LatexRecognitionResult = {
      rawStrokeCount: 12,
      latexString: 'E = mc^2',
      confidence: 0.99,
      formulaName: 'Mass-Energy Equivalence',
      suggestedSteps: ['Multiply mass by speed of light squared'],
    }

    const onInsert = vi.fn()
    render(
      <EquationRecognizerDrawer
        result={mockResult}
        onInsertLatex={onInsert}
      />
    )

    expect(screen.getByText('LaTeX Formula Recognizer')).toBeInTheDocument()
    expect(screen.getByText('Mass-Energy Equivalence')).toBeInTheDocument()
    expect(screen.getByText('E = mc^2')).toBeInTheDocument()
    expect(screen.getByText('99% OCR Confidence')).toBeInTheDocument()

    // Insert onto canvas
    fireEvent.click(screen.getByRole('button', { name: /Insert onto Canvas/i }))
    expect(onInsert).toHaveBeenCalledWith('E = mc^2')
  })
})
