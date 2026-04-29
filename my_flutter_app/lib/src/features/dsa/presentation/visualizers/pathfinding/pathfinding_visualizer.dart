import 'dart:async';
import 'dart:collection';
import 'dart:math';
import 'package:flutter/material.dart';

/// Cell states for the grid
enum CellState {
  empty,
  wall,
  start,
  end,
  visited,
  path,
}

/// A single cell in the grid
class Cell {
  Cell({
    required this.row,
    required this.col,
    this.state = CellState.empty,
    this.distance = 999999,
    this.parent,
  });
  int row;
  int col;
  CellState state;
  int distance;
  Cell? parent;
}

/// Pathfinding Visualizer Widget
class PathfindingVisualizer extends StatefulWidget {
  const PathfindingVisualizer({super.key});

  @override
  State<PathfindingVisualizer> createState() => _PathfindingVisualizerState();
}

class _PathfindingVisualizerState extends State<PathfindingVisualizer> {
  static const int rows = 20;
  static const int cols = 30;

  late List<List<Cell>> grid;
  Cell? startCell;
  Cell? endCell;
  bool isRunning = false;
  String currentAlgorithm = 'None';
  String mode = 'wall'; // 'wall', 'start', 'end'

  @override
  void initState() {
    super.initState();
    _initializeGrid();
  }

  void _initializeGrid() {
    grid = List.generate(
      rows,
      (r) => List.generate(cols, (c) => Cell(row: r, col: c)),
    );
    startCell = null;
    endCell = null;
    currentAlgorithm = 'None';
  }

  void _resetGrid() {
    if (isRunning) {
      return;
    }
    setState(_initializeGrid);
  }

  void _clearPath() {
    if (isRunning) {
      return;
    }
    setState(() {
      for (final row in grid) {
        for (final cell in row) {
          if (cell.state == CellState.visited || cell.state == CellState.path) {
            cell.state = CellState.empty;
          }
          cell
            ..distance = 999999
            ..parent = null;
        }
      }
      currentAlgorithm = 'None';
    });
  }

  void _generateMaze() {
    if (isRunning) {
      return;
    }
    setState(() {
      _initializeGrid();
      final random = Random();
      for (final row in grid) {
        for (final cell in row) {
          if (random.nextDouble() < 0.3) {
            cell.state = CellState.wall;
          }
        }
      }
      // Set start and end
      startCell = grid[1][1]..state = CellState.start;
      endCell = grid[rows - 2][cols - 2]..state = CellState.end;
    });
  }

  void _handleCellTap(Cell cell) {
    if (isRunning) {
      return;
    }
    setState(() {
      if (mode == 'start') {
        if (startCell != null) {
          startCell!.state = CellState.empty;
        }
        cell.state = CellState.start;
        startCell = cell;
      } else if (mode == 'end') {
        if (endCell != null) {
          endCell!.state = CellState.empty;
        }
        cell.state = CellState.end;
        endCell = cell;
      } else {
        if (cell.state == CellState.empty) {
          cell.state = CellState.wall;
        } else if (cell.state == CellState.wall) {
          cell.state = CellState.empty;
        }
      }
    });
  }

  List<Cell> _getNeighbors(Cell cell) {
    final neighbors = <Cell>[];
    final directions = [
      [-1, 0], // Up
      [1, 0], // Down
      [0, -1], // Left
      [0, 1], // Right
    ];

    for (final dir in directions) {
      final newRow = cell.row + dir[0];
      final newCol = cell.col + dir[1];
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
        final neighbor = grid[newRow][newCol];
        if (neighbor.state != CellState.wall) {
          neighbors.add(neighbor);
        }
      }
    }
    return neighbors;
  }

  Future<void> _visualizePath() async {
    if (endCell == null) {
      return;
    }

    var current = endCell;
    while (current != null && current.parent != null) {
      if (current != endCell && current != startCell) {
        setState(() {
          current!.state = CellState.path;
        });
        await Future<void>.delayed(const Duration(milliseconds: 30));
      }
      current = current.parent;
    }
  }

  /// BFS Algorithm - Guarantees shortest path on unweighted graphs
  Future<void> _bfs() async {
    if (startCell == null || endCell == null) {
      _showMessage('Please set start and end points');
      return;
    }

    setState(() {
      isRunning = true;
      currentAlgorithm = 'BFS';
    });
    _clearPathOnly();

    final queue = Queue<Cell>();
    final visited = <Cell>{};

    startCell!.distance = 0;
    queue.add(startCell!);
    visited.add(startCell!);

    while (queue.isNotEmpty && isRunning) {
      final current = queue.removeFirst();

      if (current == endCell) {
        await _visualizePath();
        setState(() => isRunning = false);
        return;
      }

      for (final neighbor in _getNeighbors(current)) {
        if (!visited.contains(neighbor)) {
          visited.add(neighbor);
          neighbor
            ..parent = current
            ..distance = current.distance + 1;
          queue.add(neighbor);

          if (neighbor != endCell) {
            setState(() {
              neighbor.state = CellState.visited;
            });
            await Future<void>.delayed(const Duration(milliseconds: 20));
          }
        }
      }
    }

    setState(() => isRunning = false);
  }

  /// DFS Algorithm - Explores as far as possible before backtracking
  Future<void> _dfs() async {
    if (startCell == null || endCell == null) {
      _showMessage('Please set start and end points');
      return;
    }

    setState(() {
      isRunning = true;
      currentAlgorithm = 'DFS';
    });
    _clearPathOnly();

    final found = await _dfsRecursive(startCell!, <Cell>{});

    if (found) {
      await _visualizePath();
    }

    setState(() => isRunning = false);
  }

  Future<bool> _dfsRecursive(Cell current, Set<Cell> visited) async {
    if (!isRunning) {
      return false;
    }
    if (current == endCell) {
      return true;
    }

    visited.add(current);

    if (current != startCell) {
      setState(() {
        current.state = CellState.visited;
      });
      await Future<void>.delayed(const Duration(milliseconds: 20));
    }

    for (final neighbor in _getNeighbors(current)) {
      if (!visited.contains(neighbor)) {
        neighbor.parent = current;
        if (await _dfsRecursive(neighbor, visited)) {
          return true;
        }
      }
    }

    return false;
  }

  /// Dijkstra's Algorithm - Shortest path on weighted graphs
  Future<void> _dijkstra() async {
    if (startCell == null || endCell == null) {
      _showMessage('Please set start and end points');
      return;
    }

    setState(() {
      isRunning = true;
      currentAlgorithm = "Dijkstra's";
    });
    _clearPathOnly();

    // Priority queue (distance, cell)
    final pq = <Cell>[];
    final visited = <Cell>{};

    startCell!.distance = 0;
    pq.add(startCell!);

    while (pq.isNotEmpty && isRunning) {
      // Sort by distance (simple priority queue simulation)
      pq.sort((a, b) => a.distance.compareTo(b.distance));
      final current = pq.removeAt(0);

      if (visited.contains(current)) {
        continue;
      }
      visited.add(current);

      if (current == endCell) {
        await _visualizePath();
        setState(() => isRunning = false);
        return;
      }

      if (current != startCell) {
        setState(() {
          current.state = CellState.visited;
        });
        await Future<void>.delayed(const Duration(milliseconds: 20));
      }

      for (final neighbor in _getNeighbors(current)) {
        if (!visited.contains(neighbor)) {
          final newDist = current.distance + 1;
          neighbor
            ..distance = newDist
            ..parent = current;
        }
      }
    }

    setState(() => isRunning = false);
  }

  void _clearPathOnly() {
    for (final row in grid) {
      for (final cell in row) {
        if (cell.state == CellState.visited || cell.state == CellState.path) {
          cell.state = CellState.empty;
        }
        cell
          ..distance = 999999
          ..parent = null;
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Color _getCellColor(CellState state) {
    switch (state) {
      case CellState.empty:
        return Colors.grey.shade200;
      case CellState.wall:
        return Colors.grey.shade800;
      case CellState.start:
        return Colors.green;
      case CellState.end:
        return Colors.red;
      case CellState.visited:
        return Colors.blue.shade200;
      case CellState.path:
        return Colors.yellow;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Controls
        Padding(
          padding: const EdgeInsets.all(8),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              Text('Algorithm: $currentAlgorithm',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(width: 16),
              // Mode selector
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'wall', label: Text('Wall')),
                  ButtonSegment(value: 'start', label: Text('Start')),
                  ButtonSegment(value: 'end', label: Text('End')),
                ],
                selected: {mode},
                onSelectionChanged: (value) =>
                    setState(() => mode = value.first),
              ),
            ],
          ),
        ),
        // Action buttons
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              ElevatedButton.icon(
                onPressed: isRunning ? null : _bfs,
                icon: const Icon(Icons.grid_4x4),
                label: const Text('BFS'),
              ),
              ElevatedButton.icon(
                onPressed: isRunning ? null : _dfs,
                icon: const Icon(Icons.explore),
                label: const Text('DFS'),
              ),
              ElevatedButton.icon(
                onPressed: isRunning ? null : _dijkstra,
                icon: const Icon(Icons.route),
                label: const Text('Dijkstra'),
              ),
              IconButton(
                onPressed: isRunning ? null : _generateMaze,
                icon: const Icon(Icons.shuffle),
                tooltip: 'Generate Maze',
              ),
              IconButton(
                onPressed: isRunning ? null : _clearPath,
                icon: const Icon(Icons.cleaning_services),
                tooltip: 'Clear Path',
              ),
              IconButton(
                onPressed: isRunning ? null : _resetGrid,
                icon: const Icon(Icons.refresh),
                tooltip: 'Reset Grid',
              ),
              if (isRunning)
                IconButton(
                  onPressed: () => setState(() => isRunning = false),
                  icon: const Icon(Icons.stop, color: Colors.red),
                  tooltip: 'Stop',
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        // Grid
        Expanded(
          child: InteractiveViewer(
            boundaryMargin: const EdgeInsets.all(20),
            minScale: 0.5,
            maxScale: 2,
            child: Center(
              child: GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: cols,
                ),
                itemCount: rows * cols,
                itemBuilder: (context, index) {
                  final row = index ~/ cols;
                  final col = index % cols;
                  final cell = grid[row][col];
                  return GestureDetector(
                    onTap: () => _handleCellTap(cell),
                    child: Container(
                      margin: const EdgeInsets.all(0.5),
                      decoration: BoxDecoration(
                        color: _getCellColor(cell.state),
                        borderRadius: BorderRadius.circular(2),
                      ),
                      child: cell.state == CellState.start
                          ? const Icon(Icons.play_arrow,
                              size: 10, color: Colors.white)
                          : cell.state == CellState.end
                              ? const Icon(Icons.flag,
                                  size: 10, color: Colors.white)
                              : null,
                    ),
                  );
                },
              ),
            ),
          ),
        ),
        // Legend
        Padding(
          padding: const EdgeInsets.all(8),
          child: Wrap(
            spacing: 16,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              _legendItem(Colors.green, 'Start'),
              _legendItem(Colors.red, 'End'),
              _legendItem(Colors.grey.shade800, 'Wall'),
              _legendItem(Colors.blue.shade200, 'Visited'),
              _legendItem(Colors.yellow, 'Path'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
              color: color, borderRadius: BorderRadius.circular(4)),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}
