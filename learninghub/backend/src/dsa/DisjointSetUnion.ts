/**
 * Disjoint Set Union (DSU / Union-Find) with Path Compression & Union by Rank
 *
 * Provides near O(1) amortized time complexity (inverse Ackermann function α(N))
 * for dynamic connectivity queries, Kruskal's MST, and community/study group clustering.
 */

export class DisjointSetUnion<T = string | number> {
  private parent: Map<T, T> = new Map()
  private rank: Map<T, number> = new Map()
  private setSize: Map<T, number> = new Map()
  private componentCount = 0

  constructor(initialElements?: T[]) {
    if (initialElements) {
      for (const el of initialElements) {
        this.makeSet(el)
      }
    }
  }

  /**
   * Register a new element into its own singleton set.
   * Time Complexity: O(1)
   */
  public makeSet(x: T): void {
    if (!this.parent.has(x)) {
      this.parent.set(x, x)
      this.rank.set(x, 0)
      this.setSize.set(x, 1)
      this.componentCount++
    }
  }

  /**
   * Find the representative root of element `x` with Path Compression.
   * Time Complexity: O(α(N)) ≈ O(1)
   */
  public find(x: T): T {
    if (!this.parent.has(x)) {
      this.makeSet(x)
      return x
    }

    let root = x
    while (root !== this.parent.get(root)!) {
      root = this.parent.get(root)!
    }

    // Path compression pass
    let curr = x
    while (curr !== root) {
      const next = this.parent.get(curr)!
      this.parent.set(curr, root)
      curr = next
    }

    return root
  }

  /**
   * Unify sets containing `x` and `y` using Union by Rank.
   * Returns true if two disjoint sets were merged, false if already in same set.
   * Time Complexity: O(α(N)) ≈ O(1)
   */
  public union(x: T, y: T): boolean {
    const rootX = this.find(x)
    const rootY = this.find(y)

    if (rootX === rootY) {
      return false
    }

    const rankX = this.rank.get(rootX) ?? 0
    const rankY = this.rank.get(rootY) ?? 0
    const sizeX = this.setSize.get(rootX) ?? 1
    const sizeY = this.setSize.get(rootY) ?? 1

    if (rankX < rankY) {
      this.parent.set(rootX, rootY)
      this.setSize.set(rootY, sizeX + sizeY)
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX)
      this.setSize.set(rootX, sizeX + sizeY)
    } else {
      this.parent.set(rootY, rootX)
      this.rank.set(rootX, rankX + 1)
      this.setSize.set(rootX, sizeX + sizeY)
    }

    this.componentCount--
    return true
  }

  /**
   * Check if `x` and `y` belong to the same connected component.
   */
  public connected(x: T, y: T): boolean {
    return this.find(x) === this.find(y)
  }

  /**
   * Get size of the component containing `x`.
   */
  public getSizeOfComponent(x: T): number {
    const root = this.find(x)
    return this.setSize.get(root) ?? 1
  }

  public getComponentCount(): number {
    return this.componentCount
  }
}
