import * as net from 'node:net';
import * as https from 'node:https';
import type { TestResult, WarpCheckResult } from './types.js';

export function testConnection(server: string, port: number, timeoutMs = 5000): Promise<TestResult> {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = net.createConnection({ host: server, port, timeout: timeoutMs });
    socket.on('connect', () => {
      const latencyMs = Date.now() - start;
      socket.destroy();
      resolve({ server, port, reachable: true, latencyMs });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ server, port, reachable: false, error: 'timeout' });
    });
    socket.on('error', (err) => {
      resolve({ server, port, reachable: false, error: err.message });
    });
  });
}

export function checkWarp(): Promise<WarpCheckResult> {
  return new Promise((resolve, reject) => {
    https.get('https://1.1.1.1/cdn-cgi/trace', { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        const ipMatch = data.match(/ip=(.+)/);
        const warpMatch = data.match(/warp=(\w+)/);
        const ip = ipMatch?.[1]?.trim() ?? 'unknown';
        const isWarp = warpMatch?.[1] === 'on' || warpMatch?.[1] === 'plus';
        resolve({ ip, isWarp, org: isWarp ? 'Cloudflare WARP' : undefined });
      });
    }).on('error', (err) => {
      reject(new Error(`WARP check failed: ${err.message}`));
    });
  });
}
