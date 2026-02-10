// Dependency Resolver: Topological sort for slot calculations
// Ensures calculations are performed in the correct order

import { PrismaClient } from '@prisma/client';
import { SlotDefinition } from '@/lib/types/slot-definition';

const prisma = new PrismaClient();

export class DependencyResolver {
  /**
   * Resolve the calculation order for a set of slot keys
   * Returns slots in topological order (dependencies first)
   */
  async resolveCalculationOrder(slotKeys: string[]): Promise<string[]> {
    // Build dependency graph
    const graph = new Map<string, string[]>();

    for (const key of slotKeys) {
      const slot = await prisma.slotDefinition.findUnique({
        where: { slotKey: key }
      });

      if (slot) {
        const config = slot.config as any as SlotDefinition;
        graph.set(key, config.calculation?.dependencies || []);
      } else {
        // Slot not found, assume no dependencies
        graph.set(key, []);
      }
    }

    // Perform topological sort
    return this.topologicalSort(graph);
  }

  /**
   * Topological sort implementation using DFS
   * Detects circular dependencies
   */
  private topologicalSort(graph: Map<string, string[]>): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (node: string) => {
      // Already processed
      if (visited.has(node)) {
        return;
      }

      // Circular dependency detected
      if (visiting.has(node)) {
        throw new Error(`Circular dependency detected: ${node}`);
      }

      visiting.add(node);

      // Visit all dependencies first
      const deps = graph.get(node) || [];
      for (const dep of deps) {
        visit(dep);
      }

      visiting.delete(node);
      visited.add(node);
      sorted.push(node);
    };

    // Visit all nodes
    for (const node of graph.keys()) {
      visit(node);
    }

    return sorted;
  }

  /**
   * Analyze dependencies and return a report
   */
  async analyzeDependencies(slotKeys: string[]): Promise<{
    totalSlots: number;
    layers: string[][];
    maxDepth: number;
    circularDependencies: string[];
  }> {
    try {
      const ordered = await this.resolveCalculationOrder(slotKeys);

      // Group into dependency layers
      const layers: string[][] = [];
      const graph = new Map<string, string[]>();

      // Build graph again
      for (const key of slotKeys) {
        const slot = await prisma.slotDefinition.findUnique({
          where: { slotKey: key }
        });

        if (slot) {
          const config = slot.config as any as SlotDefinition;
          graph.set(key, config.calculation?.dependencies || []);
        }
      }

      // Calculate layers
      const depth = new Map<string, number>();

      const calculateDepth = (node: string): number => {
        if (depth.has(node)) {
          return depth.get(node)!;
        }

        const deps = graph.get(node) || [];
        if (deps.length === 0) {
          depth.set(node, 0);
          return 0;
        }

        const maxDepDepth = Math.max(...deps.map(dep => calculateDepth(dep)));
        depth.set(node, maxDepDepth + 1);
        return maxDepDepth + 1;
      };

      for (const node of slotKeys) {
        calculateDepth(node);
      }

      // Group by depth
      const maxDepth = Math.max(...Array.from(depth.values()));
      for (let i = 0; i <= maxDepth; i++) {
        const layer = slotKeys.filter(key => depth.get(key) === i);
        if (layer.length > 0) {
          layers.push(layer);
        }
      }

      return {
        totalSlots: slotKeys.length,
        layers,
        maxDepth,
        circularDependencies: []
      };
    } catch (error: any) {
      // Check if it's a circular dependency error
      if (error.message.includes('Circular dependency')) {
        return {
          totalSlots: slotKeys.length,
          layers: [],
          maxDepth: -1,
          circularDependencies: [error.message]
        };
      }
      throw error;
    }
  }
}

// Export singleton instance
export const dependencyResolver = new DependencyResolver();
