import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

/// Node class for Binary Search Tree
class TreeNode {
  TreeNode(this.value);
  int value;
  TreeNode? left;
  TreeNode? right;

  // Visual properties
  double x = 0;
  double y = 0;
  bool isHighlighted = false;
  bool isVisited = false;
}

class TreeVisualizer extends StatefulWidget {
  const TreeVisualizer({super.key});

  @override
  State<TreeVisualizer> createState() => _TreeVisualizerState();
}

class _TreeVisualizerState extends State<TreeVisualizer> {
  TreeNode? root;
  final TextEditingController _valueController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  bool isRunning = false;
  String currentOperation = 'None';
  String traversalResult = '';

  // Canvas dimensions for positioning
  final double nodeRadius = 20;
  final double levelHeight = 60;

  @override
  void dispose() {
    _valueController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _resetTree() {
    setState(() {
      root = null;
      currentOperation = 'None';
      traversalResult = '';
      _resetNodeStates(root);
    });
  }

  void _generateRandomTree() {
    _resetTree();
    final random = Random();
    // Insert 7-10 random nodes
    final count = random.nextInt(4) + 7;
    for (var i = 0; i < count; i++) {
      _insertValue(random.nextInt(100));
    }
  }

  void _insertValue([int? val]) {
    if (isRunning) {
      return;
    }

    var value = val;
    if (value == null) {
      if (_valueController.text.isEmpty) {
        return;
      }
      value = int.tryParse(_valueController.text);
      if (value == null) {
        return;
      }
      _valueController.clear();
    }

    setState(() {
      _resetNodeStates(root);
      currentOperation = 'Inserting $value';

      if (root == null) {
        root = TreeNode(value!);
      } else {
        _insertNode(root!, value!);
      }
      _updateNodePositions();
    });
  }

  void _insertNode(TreeNode node, int value) {
    if (value < node.value) {
      if (node.left == null) {
        node.left = TreeNode(value);
      } else {
        _insertNode(node.left!, value);
      }
    } else {
      if (node.right == null) {
        node.right = TreeNode(value);
      } else {
        _insertNode(node.right!, value);
      }
    }
  }

  // Calculates x,y coordinates for all nodes strictly for visualization
  void _updateNodePositions() {
    if (root == null) {
      return;
    }
    // Simple improved positioning algorithm based on depth and width
    _calculatePositionsRecursive(
        root!, 0, 0, MediaQuery.of(context).size.width);
  }

  void _calculatePositionsRecursive(
      TreeNode node, int depth, double leftBound, double rightBound) {
    node
      ..y = depth * levelHeight + 50
      ..x = (leftBound + rightBound) / 2;

    if (node.left != null) {
      _calculatePositionsRecursive(node.left!, depth + 1, leftBound, node.x);
    }
    if (node.right != null) {
      _calculatePositionsRecursive(node.right!, depth + 1, node.x, rightBound);
    }
  }

  // --- TRAVERSALS ---

  Future<void> _runTraversal(
      String name, Future<void> Function() traversalFn) async {
    if (isRunning) {
      return;
    }
    setState(() {
      isRunning = true;
      currentOperation = name;
      traversalResult = '';
      _resetNodeStates(root);
    });

    await traversalFn();

    if (mounted) {
      setState(() {
        isRunning = false;
        currentOperation = '$name Completed';
      });
    }
  }

  Future<void> _inOrderTraversal() async {
    await _inOrderRecursive(root);
  }

  Future<void> _inOrderRecursive(TreeNode? node) async {
    if (node == null || !mounted) {
      return;
    }

    await _inOrderRecursive(node.left);

    await _visitNode(node);

    await _inOrderRecursive(node.right);
  }

  Future<void> _preOrderTraversal() async {
    await _preOrderRecursive(root);
  }

  Future<void> _preOrderRecursive(TreeNode? node) async {
    if (node == null || !mounted) {
      return;
    }

    await _visitNode(node);
    await _preOrderRecursive(node.left);
    await _preOrderRecursive(node.right);
  }

  Future<void> _postOrderTraversal() async {
    await _postOrderRecursive(root);
  }

  Future<void> _postOrderRecursive(TreeNode? node) async {
    if (node == null || !mounted) {
      return;
    }

    await _postOrderRecursive(node.left);
    await _postOrderRecursive(node.right);
    await _visitNode(node);
  }

  Future<void> _bfsTraversal() async {
    if (root == null || !mounted) {
      return;
    }

    final queue = <TreeNode>[root!];

    while (queue.isNotEmpty) {
      final node = queue.removeAt(0);
      await _visitNode(node);

      if (node.left != null) {
        queue.add(node.left!);
      }
      if (node.right != null) {
        queue.add(node.right!);
      }
    }
  }

  Future<void> _visitNode(TreeNode node) async {
    setState(() {
      node.isHighlighted = true;
    });
    await Future<void>.delayed(const Duration(milliseconds: 500));
    if (!mounted) {
      return;
    }
    setState(() {
      node
        ..isHighlighted = false
        ..isVisited = true;
      traversalResult += '${node.value} -> ';
    });
    await Future<void>.delayed(const Duration(milliseconds: 300));
  }

  void _resetNodeStates(TreeNode? node) {
    if (node == null) {
      return;
    }
    node
      ..isHighlighted = false
      ..isVisited = false;
    _resetNodeStates(node.left);
    _resetNodeStates(node.right);
  }

  @override
  Widget build(BuildContext context) {
    // Recalculate positions on build to handle resize (simplified)
    if (root != null) {
      _updateNodePositions();
    }

    return Column(
      children: [
        // Controls Area
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).cardColor,
          child: Column(
            children: [
              // Operations Row
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  SizedBox(
                    width: 100,
                    child: TextField(
                      controller: _valueController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Value',
                        isDense: true,
                        border: OutlineInputBorder(),
                      ),
                      onSubmitted: (_) => _insertValue(),
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: isRunning ? null : _insertValue,
                    icon: const Icon(Icons.add),
                    label: const Text('Insert'),
                  ),
                  IconButton(
                    onPressed: isRunning ? null : _generateRandomTree,
                    icon: const Icon(Icons.shuffle),
                    tooltip: 'Random Tree',
                  ),
                  IconButton(
                    onPressed: isRunning ? null : _resetTree,
                    icon: const Icon(Icons.refresh),
                    tooltip: 'Reset',
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Traversals Row
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  OutlinedButton(
                    onPressed: isRunning
                        ? null
                        : () => _runTraversal('InOrder', _inOrderTraversal),
                    child: const Text('InOrder'),
                  ),
                  OutlinedButton(
                    onPressed: isRunning
                        ? null
                        : () => _runTraversal('PreOrder', _preOrderTraversal),
                    child: const Text('PreOrder'),
                  ),
                  OutlinedButton(
                    onPressed: isRunning
                        ? null
                        : () => _runTraversal('PostOrder', _postOrderTraversal),
                    child: const Text('PostOrder'),
                  ),
                  OutlinedButton(
                    onPressed: isRunning
                        ? null
                        : () => _runTraversal('BFS', _bfsTraversal),
                    child: const Text('BFS'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Status: $currentOperation',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              if (traversalResult.isNotEmpty)
                Text(
                  'Result: ${traversalResult.substring(0, traversalResult.length - 4)}',
                  style: TextStyle(color: Theme.of(context).primaryColor),
                  textAlign: TextAlign.center,
                ),
            ],
          ),
        ),

        // Visualization Area
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SingleChildScrollView(
                  child: SizedBox(
                    width:
                        max(constraints.maxWidth, 800), // Ensure enough width
                    height: max(constraints.maxHeight, 600),
                    child: CustomPaint(
                      painter: TreePainter(
                        root: root,
                        nodeRadius: nodeRadius,
                        primaryColor: Theme.of(context).primaryColor,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class TreePainter extends CustomPainter {
  TreePainter({
    required this.root,
    required this.nodeRadius,
    required this.primaryColor,
  });
  final TreeNode? root;
  final double nodeRadius;
  final Color primaryColor;

  @override
  void paint(Canvas canvas, Size size) {
    if (root == null) {
      return;
    }

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..color = Colors.grey;

    final nodePaint = Paint()..style = PaintingStyle.fill;

    final textPainter = TextPainter(
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );

    _drawTree(canvas, root!, paint, nodePaint, textPainter);
  }

  void _drawTree(Canvas canvas, TreeNode node, Paint linePaint, Paint nodePaint,
      TextPainter textPainter) {
    // Draw edges first (so they are behind nodes)
    if (node.left != null) {
      canvas.drawLine(
        Offset(node.x, node.y + nodeRadius),
        Offset(node.left!.x, node.left!.y - nodeRadius),
        linePaint,
      );
      _drawTree(canvas, node.left!, linePaint, nodePaint, textPainter);
    }

    if (node.right != null) {
      canvas.drawLine(
        Offset(node.x, node.y + nodeRadius),
        Offset(node.right!.x, node.right!.y - nodeRadius),
        linePaint,
      );
      _drawTree(canvas, node.right!, linePaint, nodePaint, textPainter);
    }

    // Draw node
    if (node.isHighlighted) {
      nodePaint.color = Colors.orange;
    } else if (node.isVisited) {
      nodePaint.color = Colors.green;
    } else {
      nodePaint.color = primaryColor;
    }

    canvas.drawCircle(Offset(node.x, node.y), nodeRadius, nodePaint);

    // Draw value
    textPainter
      ..text = TextSpan(
        text: node.value.toString(),
        style:
            const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
      )
      ..layout()
      ..paint(
        canvas,
        Offset(node.x - textPainter.width / 2, node.y - textPainter.height / 2),
      );
  }

  @override
  bool shouldRepaint(covariant TreePainter oldDelegate) {
    return true; // Simple approach, optimize if needed
  }
}
