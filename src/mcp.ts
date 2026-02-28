#!/usr/bin/env node

/**
 * MCP Server for clash-init
 * Exposes: generate_config, test_proxy, check_ip tools
 * Protocol: JSON-RPC over stdio (MCP spec)
 */

import { generateConfig, configToYaml, proxyToUri, testConnection, checkWarp } from './index.js';
import type { Proxy, Protocol, TemplateName } from './types.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

const TOOLS = [
  {
    name: 'generate_config',
    description: 'Generate a Clash/mihomo proxy configuration file',
    inputSchema: {
      type: 'object',
      properties: {
        protocol: { type: 'string', enum: ['ss', 'vmess', 'vless', 'trojan', 'hysteria2'], description: 'Proxy protocol' },
        server: { type: 'string', description: 'Server address' },
        port: { type: 'number', description: 'Server port', default: 443 },
        password: { type: 'string', description: 'Password (ss/trojan/hysteria2)' },
        cipher: { type: 'string', description: 'Cipher (ss)', default: 'aes-256-gcm' },
        uuid: { type: 'string', description: 'UUID (vmess/vless)' },
        name: { type: 'string', description: 'Proxy name', default: 'proxy' },
        template: { type: 'string', enum: ['global', 'china', 'custom'], default: 'global' },
        format: { type: 'string', enum: ['yaml', 'json', 'uri'], default: 'yaml' },
        sni: { type: 'string' },
        network: { type: 'string' },
        flow: { type: 'string' },
      },
      required: ['protocol', 'server'],
    },
  },
  {
    name: 'test_proxy',
    description: 'Test proxy server connectivity (TCP connection test)',
    inputSchema: {
      type: 'object',
      properties: {
        server: { type: 'string', description: 'Server address' },
        port: { type: 'number', description: 'Server port', default: 443 },
        timeoutMs: { type: 'number', description: 'Timeout in ms', default: 5000 },
      },
      required: ['server'],
    },
  },
  {
    name: 'check_ip',
    description: 'Check current exit IP and WARP status via Cloudflare',
    inputSchema: { type: 'object', properties: {} },
  },
];

function buildProxyFromParams(params: Record<string, unknown>): Proxy {
  const base = {
    name: (params.name as string) || 'proxy',
    server: params.server as string,
    port: (params.port as number) || 443,
  };
  const protocol = params.protocol as Protocol;
  switch (protocol) {
    case 'ss':
      return { ...base, type: 'ss', cipher: (params.cipher as string) || 'aes-256-gcm', password: (params.password as string) || '', udp: true };
    case 'vmess':
      return { ...base, type: 'vmess', uuid: (params.uuid as string) || '', cipher: 'auto', tls: true, network: (params.network as string) || 'tcp' };
    case 'vless':
      return { ...base, type: 'vless', uuid: (params.uuid as string) || '', flow: params.flow as string, tls: true, network: (params.network as string) || 'tcp' };
    case 'trojan':
      return { ...base, type: 'trojan', password: (params.password as string) || '', sni: params.sni as string };
    case 'hysteria2':
      return { ...base, type: 'hysteria2', password: (params.password as string) || '', sni: params.sni as string };
    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}

async function handleToolCall(name: string, params: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'generate_config': {
      const proxy = buildProxyFromParams(params);
      const config = generateConfig({
        proxy,
        template: (params.template as TemplateName) || 'global',
      });
      const format = (params.format as string) || 'yaml';
      if (format === 'json') return config;
      if (format === 'uri') return { uri: proxyToUri(proxy) };
      return { yaml: configToYaml(config) };
    }
    case 'test_proxy': {
      return testConnection(
        params.server as string,
        (params.port as number) || 443,
        (params.timeoutMs as number) || 5000,
      );
    }
    case 'check_ip': {
      return checkWarp();
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function respond(id: string | number | undefined, result: unknown) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write(`${msg}\n`);
}

function respondError(id: string | number | undefined, code: number, message: string) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
  process.stdout.write(`${msg}\n`);
}

async function handleMessage(req: JsonRpcRequest) {
  switch (req.method) {
    case 'initialize':
      respond(req.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'clash-init', version: '1.0.0' },
      });
      break;
    case 'notifications/initialized':
      break;
    case 'tools/list':
      respond(req.id, { tools: TOOLS });
      break;
    case 'tools/call': {
      const p = req.params as { name: string; arguments?: Record<string, unknown> };
      try {
        const result = await handleToolCall(p.name, p.arguments || {});
        respond(req.id, {
          content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
        });
      } catch (e: any) {
        respond(req.id, {
          content: [{ type: 'text', text: `Error: ${e.message}` }],
          isError: true,
        });
      }
      break;
    }
    default:
      respondError(req.id, -32601, `Method not found: ${req.method}`);
  }
}

// Stdio transport
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop()!;
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      handleMessage(JSON.parse(line));
    } catch {
      respondError(undefined, -32700, 'Parse error');
    }
  }
});
process.stdin.on('end', () => process.exit(0));
