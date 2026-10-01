import { WebSocket } from 'ws';
import { WebSocketService } from './WebSocketService';
import { prisma } from '../prismaClient';

interface AnalyticsChannel {
  name: string;
  clients: Set<string>;
}

interface DashboardMetrics {
  timestamp: number;
  dau: number;
  activeTests: number;
  activeUsers: number;
  revenue: number;
  testCompletions: number;
  avgScore: number;
  aiCost: number;
  errors: number;
}

export class RealtimeAnalyticsService {
  private wsService: WebSocketService;
  private channels: Map<string, AnalyticsChannel> = new Map();
  private metricsCache: DashboardMetrics | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private readonly BROADCAST_INTERVAL = 5000; // 5 seconds

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
    this.initializeChannels();
  }

  private initializeChannels(): void {
    this.channels.set('dashboard:global', { name: 'dashboard:global', clients: new Set() });
    this.channels.set('admin:platform', { name: 'admin:platform', clients: new Set() });
  }

  start(): void {
    if (this.broadcastInterval) return;
    
    this.broadcastInterval = setInterval(async () => {
      await this.broadcastMetrics();
    }, this.BROADCAST_INTERVAL);
  }

  stop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  async broadcastMetrics(): Promise<void> {
    const metrics = await this.computeMetrics();
    this.metricsCache = metrics;

    // Broadcast to global dashboard channel
    this.broadcast('dashboard:global', {
      type: 'METRICS_UPDATE',
      payload: metrics,
      timestamp: Date.now()
    });

    // Broadcast to admin channel with additional data
    this.broadcast('admin:platform', {
      type: 'METRICS_UPDATE',
      payload: { ...metrics, adminOnly: true },
      timestamp: Date.now()
    });
  }

  private async computeMetrics(): Promise<DashboardMetrics> {
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    try {
      // Parallel queries for efficiency
      const [
        dauResult,
        activeTestsResult,
        activeUsersResult,
        revenueResult,
        completionsResult,
        avgScoreResult,
        aiCostResult,
        errorsResult
      ] = await Promise.all([
        // DAU: unique users with activity in last 24h
        prisma.activityLog.count({
          where: {
            createdAt: { gte: oneDayAgo },
            userId: { not: null }
          }
        }),
        // Active tests currently in progress
        prisma.testResult.count({
          where: {
            status: 'IN_PROGRESS',
            updatedAt: { gte: oneHourAgo }
          }
        }),
        // Active users in last hour
        prisma.activityLog.groupBy({
          by: ['userId'],
          where: {
            createdAt: { gte: oneHourAgo },
            userId: { not: null }
          }
        }).then((r: Array<{ userId: string | null }>) => r.length),
        // Revenue (completed orders)
        prisma.order.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: oneDayAgo }
          },
          _sum: { totalAmount: true }
        }),
        // Test completions in last hour
        prisma.testResult.count({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: oneHourAgo }
          }
        }),
        // Average score (completed tests last hour)
        prisma.testResult.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: oneHourAgo }
          },
          _avg: { percentage: true }
        }),
        // AI cost in last hour
        prisma.aICostLog.aggregate({
          where: { createdAt: { gte: oneHourAgo } },
          _sum: { cost: true }
        }),
        // Error count (5xx) in last hour
        prisma.activityLog.count({
          where: {
            createdAt: { gte: oneHourAgo },
            action: { contains: 'ERROR' }
          }
        })
      ]);

      return {
        timestamp: now,
        dau: dauResult,
        activeTests: activeTestsResult,
        activeUsers: activeUsersResult,
        revenue: Number(revenueResult._sum.totalAmount || 0),
        testCompletions: completionsResult,
        avgScore: Number(avgScoreResult._avg.percentage || 0),
        aiCost: Number(aiCostResult._sum.cost || 0),
        errors: errorsResult
      };
    } catch (error) {
      console.error('[RealtimeAnalytics] Error computing metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  private getDefaultMetrics(): DashboardMetrics {
    return {
      timestamp: Date.now(),
      dau: 0,
      activeTests: 0,
      activeUsers: 0,
      revenue: 0,
      testCompletions: 0,
      avgScore: 0,
      aiCost: 0,
      errors: 0
    };
  }

  private broadcast(channelName: string, message: any): void {
    const channel = this.channels.get(channelName);
    if (!channel) return;

    const messageStr = JSON.stringify(message);
    for (const clientId of channel.clients) {
      this.wsService.notifyUser(clientId, 'analytics:update', message);
    }
  }

  subscribe(channelName: string, clientId: string): void {
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = { name: channelName, clients: new Set() };
      this.channels.set(channelName, channel);
    }
    channel.clients.add(clientId);
  }

  unsubscribe(channelName: string, clientId: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.clients.delete(clientId);
    }
  }

  getCachedMetrics(): DashboardMetrics | null {
    return this.metricsCache;
  }

  // Track specific events
  async trackEvent(event: {
    type: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          userId: event.userId || null,
          action: event.type,
          metadata: event.metadata || {},
          ipAddress: '',
          userAgent: ''
        }
      });
    } catch (error) {
      console.error('[RealtimeAnalytics] Error tracking event:', error);
    }
  }
}

// Singleton instance
let realtimeAnalyticsInstance: RealtimeAnalyticsService | null = null;

export function getRealtimeAnalyticsService(wsService?: WebSocketService): RealtimeAnalyticsService {
  if (!realtimeAnalyticsInstance && wsService) {
    realtimeAnalyticsInstance = new RealtimeAnalyticsService(wsService);
  }
  if (!realtimeAnalyticsInstance) {
    throw new Error('RealtimeAnalyticsService not initialized. Call with WebSocketService first.');
  }
  return realtimeAnalyticsInstance;
}

export function initializeRealtimeAnalytics(wsService: WebSocketService): RealtimeAnalyticsService {
  realtimeAnalyticsInstance = new RealtimeAnalyticsService(wsService);
  realtimeAnalyticsInstance.start();
  return realtimeAnalyticsInstance;
}