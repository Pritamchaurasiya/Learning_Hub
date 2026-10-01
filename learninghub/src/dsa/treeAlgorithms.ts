/**
 * Tree & Binary Search Tree (BST) & AVL Tree Visualizer Engine
 *
 * Provides dynamic node insertion, search, deletion, AVL rotations (LL, RR, LR, RL),
 * and animated tree traversals (In-Order, Pre-Order, Post-Order, Level-Order).
 */

export interface TreeNodeVisual {
  id: string
  value: number
  height: number
  x: number
  y: number
  left: TreeNodeVisual | null
  right: TreeNodeVisual | null
  highlight?: 'current' | 'found' | 'inserted' | 'rotating' | 'visited' | null
}

export class TreeEngine {
  public static calculateLayout(
    node: TreeNodeVisual | null,
    x = 400,
    y = 50,
    level = 1,
    horizontalSpacing = 160
  ): TreeNodeVisual | null {
    if (!node) return null

    const leftSpacing = horizontalSpacing / 1.6
    const rightSpacing = horizontalSpacing / 1.6

    return {
      ...node,
      x,
      y,
      left: node.left
        ? TreeEngine.calculateLayout(node.left, x - leftSpacing, y + 70, level + 1, leftSpacing)
        : null,
      right: node.right
        ? TreeEngine.calculateLayout(node.right, x + rightSpacing, y + 70, level + 1, rightSpacing)
        : null,
    }
  }

  public static getHeight(node: TreeNodeVisual | null): number {
    if (!node) return 0
    return Math.max(TreeEngine.getHeight(node.left), TreeEngine.getHeight(node.right)) + 1
  }

  public static getBalanceFactor(node: TreeNodeVisual | null): number {
    if (!node) return 0
    return TreeEngine.getHeight(node.left) - TreeEngine.getHeight(node.right)
  }

  public static insertBST(root: TreeNodeVisual | null, value: number): TreeNodeVisual {
    if (!root) {
      return {
        id: `node-${value}-${Date.now()}-${Math.random()}`,
        value,
        height: 1,
        x: 0,
        y: 0,
        left: null,
        right: null,
        highlight: 'inserted',
      }
    }

    if (value < root.value) {
      root.left = TreeEngine.insertBST(root.left, value)
    } else if (value > root.value) {
      root.right = TreeEngine.insertBST(root.right, value)
    }

    root.height = TreeEngine.getHeight(root)
    return root
  }

  public static insertAVL(root: TreeNodeVisual | null, value: number): TreeNodeVisual {
    if (!root) {
      return {
        id: `node-${value}-${Date.now()}-${Math.random()}`,
        value,
        height: 1,
        x: 0,
        y: 0,
        left: null,
        right: null,
        highlight: 'inserted',
      }
    }

    if (value < root.value) {
      root.left = TreeEngine.insertAVL(root.left, value)
    } else if (value > root.value) {
      root.right = TreeEngine.insertAVL(root.right, value)
    } else {
      return root // Duplicate keys not inserted
    }

    root.height = TreeEngine.getHeight(root)
    const balance = TreeEngine.getBalanceFactor(root)

    // Left Left Case -> Right Rotate
    if (balance > 1 && root.left && value < root.left.value) {
      return TreeEngine.rightRotate(root)
    }

    // Right Right Case -> Left Rotate
    if (balance < -1 && root.right && value > root.right.value) {
      return TreeEngine.leftRotate(root)
    }

    // Left Right Case -> Left Rotate on left child, then Right Rotate on root
    if (balance > 1 && root.left && value > root.left.value) {
      root.left = TreeEngine.leftRotate(root.left)
      return TreeEngine.rightRotate(root)
    }

    // Right Left Case -> Right Rotate on right child, then Left Rotate on root
    if (balance < -1 && root.right && value < root.right.value) {
      root.right = TreeEngine.rightRotate(root.right)
      return TreeEngine.leftRotate(root)
    }

    return root
  }

  public static rightRotate(y: TreeNodeVisual): TreeNodeVisual {
    const x = y.left!
    const T2 = x.right

    x.right = y
    y.left = T2

    y.height = TreeEngine.getHeight(y)
    x.height = TreeEngine.getHeight(x)

    return x
  }

  public static leftRotate(x: TreeNodeVisual): TreeNodeVisual {
    const y = x.right!
    const T2 = y.left

    y.left = x
    x.right = T2

    x.height = TreeEngine.getHeight(x)
    y.height = TreeEngine.getHeight(y)

    return y
  }

  public static inOrder(root: TreeNodeVisual | null): number[] {
    const res: number[] = []
    const traverse = (node: TreeNodeVisual | null) => {
      if (!node) return
      traverse(node.left)
      res.push(node.value)
      traverse(node.right)
    }
    traverse(root)
    return res
  }

  public static preOrder(root: TreeNodeVisual | null): number[] {
    const res: number[] = []
    const traverse = (node: TreeNodeVisual | null) => {
      if (!node) return
      res.push(node.value)
      traverse(node.left)
      traverse(node.right)
    }
    traverse(root)
    return res
  }

  public static postOrder(root: TreeNodeVisual | null): number[] {
    const res: number[] = []
    const traverse = (node: TreeNodeVisual | null) => {
      if (!node) return
      traverse(node.left)
      traverse(node.right)
      res.push(node.value)
    }
    traverse(root)
    return res
  }

  public static levelOrder(root: TreeNodeVisual | null): number[] {
    if (!root) return []
    const res: number[] = []
    const queue: TreeNodeVisual[] = [root]
    while (queue.length > 0) {
      const curr = queue.shift()!
      res.push(curr.value)
      if (curr.left) queue.push(curr.left)
      if (curr.right) queue.push(curr.right)
    }
    return res
  }
}
