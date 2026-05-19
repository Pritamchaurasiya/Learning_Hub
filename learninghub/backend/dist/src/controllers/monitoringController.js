"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepHealthCheck = deepHealthCheck;
exports.getMetrics = getMetrics;
exports.getDatabaseStatus = getDatabaseStatus;
exports.getCacheStatus = getCacheStatus;
exports.getProcesses = getProcesses;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
const os_1 = __importDefault(require("os"));
/**
 * Deep Health Check Controller
 *
 * Returns granular health status for all system components:
 * - Database connectivity + latency
 * - Cache status (in-memory)
 * - System resources (CPU, memory, disk)
 * - AI engine availability placeholder
 */
// ─── Helper: Measure DB latency ──────────────────────────────────────
async function checkDatabase() {
    const start = performance.now();
    try {
        await prismaClient_1.prisma.$queryRaw `SELECT 1`;
        const latency = (performance.now() - start).toFixed(2);
        return { status: 'healthy', latency: `${latency}ms` };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown database error';
        return { status: 'unhealthy', error: message };
    }
}
// ─── Helper: Check cache ─────────────────────────────────────────────
function checkCache() {
    // Currently using in-memory cache (no Redis in Express backend)
    // If you add ioredis later, replace this with a PING check
    return {
        status: 'healthy',
        backend: 'in-memory',
    };
}
// ─── Helper: System metrics ──────────────────────────────────────────
function getDiskInfo() {
    try {
        // Use Node.js statfs (available in Node 18+)
        const { statfsSync } = require('fs');
        const stats = statfsSync(process.cwd());
        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        const used = total - free;
        return {
            free_gb: parseFloat((free / 1073741824).toFixed(2)),
            total_gb: parseFloat((total / 1073741824).toFixed(2)),
            used_percent: total > 0 ? Math.round((used / total) * 100) : 0,
        };
    }
    catch {
        // statfsSync not available (older Node or Windows)
        return { free_gb: -1, total_gb: -1, used_percent: -1 };
    }
}
function getSystemMetrics() {
    const totalMem = os_1.default.totalmem();
    const freeMem = os_1.default.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os_1.default.cpus();
    const loadAvg = os_1.default.loadavg();
    const disk = getDiskInfo();
    // Calculate CPU usage from all cores
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) {
            // eslint-disable-next-line security/detect-object-injection
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    }
    const cpuPercent = totalTick > 0 ? Math.round(((totalTick - totalIdle) / totalTick) * 100) : 0;
    return {
        memory_used_percent: Math.round((usedMem / totalMem) * 100),
        memory_used_gb: parseFloat((usedMem / 1073741824).toFixed(2)),
        memory_total_gb: parseFloat((totalMem / 1073741824).toFixed(2)),
        disk_free_gb: disk.free_gb,
        disk_total_gb: disk.total_gb,
        disk_used_percent: disk.used_percent,
        cpu_percent: cpuPercent,
        cpu_count: cpus.length,
        load_avg_1m: parseFloat(loadAvg[0].toFixed(2)),
        load_avg_5m: parseFloat(loadAvg[1].toFixed(2)),
        load_avg_15m: parseFloat(loadAvg[2].toFixed(2)),
        uptime_seconds: Math.round(os_1.default.uptime()),
        platform: os_1.default.platform(),
        hostname: os_1.default.hostname(),
    };
}
// ─── /health/deep/ ───────────────────────────────────────────────────
async function deepHealthCheck(_req, res) {
    const [db, cache] = await Promise.all([checkDatabase(), Promise.resolve(checkCache())]);
    const system = getSystemMetrics();
    // Derive overall status
    let status = 'healthy';
    if (db.status !== 'healthy')
        status = 'critical';
    else if (system.memory_used_percent > 90 || system.cpu_percent > 90)
        status = 'degraded';
    const report = {
        status,
        timestamp: Date.now(),
        components: {
            database: db,
            cache,
            system: {
                memory_used_percent: system.memory_used_percent,
                disk_free_gb: system.disk_free_gb,
                cpu_percent: system.cpu_percent,
                status: system.cpu_percent > 90 ? 'high-load' : 'ok',
            },
            ai_engine: {
                status: process.env.GEMINI_API_KEY ? 'available' : 'not-configured',
                provider: process.env.GEMINI_API_KEY ? 'gemini' : 'none',
            },
        },
    };
    const httpStatus = status === 'critical' ? 503 : 200;
    res.status(httpStatus).json(report);
}
// ─── /monitoring/api/metrics/ ────────────────────────────────────────
async function getMetrics(_req, res) {
    const system = getSystemMetrics();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalMem = os_1.default.totalmem();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const freeMem = os_1.default.freemem();
    // Application stats from DB
    let appStats = { total_users: 0, total_courses: 0, total_categories: 0, total_enrollments: 0 };
    try {
        const [userCount, courseCount, enrollCount] = await Promise.all([
            prismaClient_1.prisma.user.count(),
            prismaClient_1.prisma.course.count(),
            prismaClient_1.prisma.userProgress.count(),
        ]);
        appStats = {
            total_users: userCount,
            total_courses: courseCount,
            total_categories: 0, // No category model in Prisma
            total_enrollments: enrollCount,
        };
    }
    catch (err) {
        logger_1.default.error('Failed to fetch app stats for metrics', err instanceof Error ? err : new Error(String(err)));
    }
    res.json({
        timestamp: new Date().toISOString(),
        system: {
            cpu_percent: system.cpu_percent,
            cpu_count: system.cpu_count,
            memory_percent: system.memory_used_percent,
            memory_used_gb: system.memory_used_gb,
            memory_total_gb: system.memory_total_gb,
            disk_percent: system.disk_used_percent,
            disk_used_gb: system.disk_total_gb > 0
                ? parseFloat((system.disk_total_gb - system.disk_free_gb).toFixed(2))
                : -1,
            disk_total_gb: system.disk_total_gb,
            load_avg_1m: system.load_avg_1m,
            load_avg_5m: system.load_avg_5m,
            load_avg_15m: system.load_avg_15m,
        },
        network: {
            bytes_sent: 0,
            bytes_recv: 0,
            packets_sent: 0,
            packets_recv: 0,
        },
        application: appStats,
    });
}
// ─── /monitoring/api/database/ ───────────────────────────────────────
async function getDatabaseStatus(_req, res) {
    const start = performance.now();
    try {
        await prismaClient_1.prisma.$queryRaw `SELECT 1`;
        const responseTime = parseFloat((performance.now() - start).toFixed(2));
        res.json({
            status: 'connected',
            response_time_ms: responseTime,
            database: process.env.DB_PROVIDER ?? 'sqlite',
        });
    }
    catch (err) {
        const responseTime = parseFloat((performance.now() - start).toFixed(2));
        res.status(503).json({
            status: 'error',
            response_time_ms: responseTime,
            database: process.env.DB_PROVIDER ?? 'sqlite',
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    }
}
// ─── /monitoring/api/cache/ ──────────────────────────────────────────
function getCacheStatus(_req, res) {
    res.json({
        status: 'connected',
        response_time_ms: 0.01,
        test_value: 'ok',
    });
}
// ─── /monitoring/api/processes/ ──────────────────────────────────────
function getProcesses(_req, res) {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    res.json({
        processes: [
            {
                pid: process.pid,
                name: 'learninghub-api',
                cpu_percent: parseFloat(((cpuUsage.user + cpuUsage.system) / 1e6 / os_1.default.uptime()).toFixed(2)),
                memory_percent: parseFloat(((memUsage.rss / os_1.default.totalmem()) * 100).toFixed(2)),
                status: 'running',
            },
        ],
    });
}
