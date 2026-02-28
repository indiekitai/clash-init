#!/usr/bin/env node

import { parseArgs } from 'node:util';
import * as readline from 'node:readline';
import { generateConfig, configToYaml, proxyToUri, testConnection, checkWarp } from './index.js';
import type { Proxy, Protocol, TemplateName } from './types.js';

const { values: args } = parseArgs({
  options: {
    // Protocol flags
    ss: { type: 'boolean', default: false },
    vmess: { type: 'boolean', default: false },
    vless: { type: 'boolean', default: false },
    trojan: { type: 'boolean', default: false },
    hysteria2: { type: 'boolean', default: false },
    // Common params
    server: { type: 'string' },
    port: { type: 'string' },
    password: { type: 'string' },
    cipher: { type: 'string' },
    uuid: { type: 'string' },
    name: { type: 'string', default: 'proxy' },
    sni: { type: 'string' },
    network: { type: 'string' },
    flow: { type: 'string' },
    'alter-id': { type: 'string' },
    obfs: { type: 'string' },
    'obfs-password': { type: 'string' },
    // Output options
    template: { type: 'string', default: 'global' },
    json: { type: 'boolean', default: false },
    uri: { type: 'boolean', default: false },
    output: { type: 'string', short: 'o' },
    // Actions
    test: { type: 'boolean', default: false },
    'check-warp': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    'mixed-port': { type: 'string' },
  },
  strict: false,
  allowPositionals: true,
}) as { values: Record<string, string | boolean | undefined> };

const s = (v: string | boolean | undefined): string => typeof v === 'string' ? v : '';

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  if (args['check-warp']) {
    try {
      const result = await checkWarp();
      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`IP: ${result.ip}`);
        console.log(`WARP: ${result.isWarp ? '✅ Active' : '❌ Not active'}`);
        if (result.org) console.log(`Org: ${result.org}`);
      }
    } catch (e: any) {
      console.error(e.message);
      process.exit(1);
    }
    return;
  }

  // Determine protocol
  const protocol = getProtocol();

  if (!protocol && args.test) {
    // Test from existing config file (positional arg)
    console.error('--test requires a proxy definition (use protocol flags)');
    process.exit(1);
  }

  if (!protocol) {
    // Interactive mode
    await interactive();
    return;
  }

  const proxy = buildProxy(protocol);

  if (args.test) {
    const result = await testConnection(proxy.server, proxy.port);
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`${proxy.server}:${proxy.port} - ${result.reachable ? `✅ OK (${result.latencyMs}ms)` : `❌ ${result.error}`}`);
    }
    process.exit(result.reachable ? 0 : 1);
    return;
  }

  const config = generateConfig({
    proxy,
    template: (s(args.template) as TemplateName) || 'global',
    mixedPort: s(args['mixed-port']) ? parseInt(s(args['mixed-port'])) : undefined,
  });

  if (args.uri) {
    console.log(proxyToUri(proxy));
    return;
  }

  const output = args.json ? JSON.stringify(config, null, 2) : configToYaml(config);

  if (s(args.output)) {
    const fs = await import('node:fs');
    fs.writeFileSync(s(args.output), output + '\n');
    console.error(`Written to ${s(args.output)}`);
  } else {
    console.log(output);
  }
}

function getProtocol(): Protocol | null {
  if (args.ss) return 'ss';
  if (args.vmess) return 'vmess';
  if (args.vless) return 'vless';
  if (args.trojan) return 'trojan';
  if (args.hysteria2) return 'hysteria2';
  return null;
}

function buildProxy(protocol: Protocol): Proxy {
  const base = {
    name: s(args.name) || 'proxy',
    server: s(args.server),
    port: parseInt(s(args.port) || '443'),
  };
  if (!base.server) {
    console.error('Error: --server is required');
    process.exit(1);
  }

  switch (protocol) {
    case 'ss':
      return { ...base, type: 'ss' as const, cipher: s(args.cipher) || 'aes-256-gcm', password: s(args.password), udp: true };
    case 'vmess':
      return { ...base, type: 'vmess' as const, uuid: s(args.uuid), alterId: parseInt(s(args['alter-id']) || '0'), cipher: s(args.cipher) || 'auto', tls: true, network: s(args.network) || 'tcp' };
    case 'vless':
      return { ...base, type: 'vless' as const, uuid: s(args.uuid), flow: s(args.flow) || undefined, tls: true, network: s(args.network) || 'tcp' };
    case 'trojan':
      return { ...base, type: 'trojan' as const, password: s(args.password), sni: s(args.sni) || undefined };
    case 'hysteria2':
      return { ...base, type: 'hysteria2' as const, password: s(args.password), sni: s(args.sni) || undefined, obfs: s(args.obfs) || undefined, 'obfs-password': s(args['obfs-password']) || undefined };
    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r));

  try {
    console.error('Clash Config Generator');
    console.error('======================\n');

    console.error('Protocol:');
    console.error('  1) Shadowsocks');
    console.error('  2) VMess');
    console.error('  3) VLESS');
    console.error('  4) Trojan');
    console.error('  5) Hysteria2');
    const protoChoice = await ask('\nChoose [1-5]: ');
    const protocols: Protocol[] = ['ss', 'vmess', 'vless', 'trojan', 'hysteria2'];
    const protocol = protocols[parseInt(protoChoice) - 1];
    if (!protocol) { console.error('Invalid choice'); return; }

    const server = await ask('Server: ');
    const port = await ask('Port [443]: ') || '443';
    const name = await ask('Name [proxy]: ') || 'proxy';

    // Set args for buildProxy
    args.server = server;
    args.port = port;
    args.name = name;

    if (protocol === 'ss' || protocol === 'trojan' || protocol === 'hysteria2') {
      args.password = await ask('Password: ');
    }
    if (protocol === 'ss') {
      args.cipher = await ask('Cipher [aes-256-gcm]: ') || 'aes-256-gcm';
    }
    if (protocol === 'vmess' || protocol === 'vless') {
      args.uuid = await ask('UUID: ');
    }

    console.error('\nTemplate:');
    console.error('  1) global - Route all through proxy');
    console.error('  2) china - China direct, rest proxy');
    console.error('  3) custom - Minimal rules');
    const tmplChoice = await ask('\nChoose [1-3]: ') || '1';
    const templates: TemplateName[] = ['global', 'china', 'custom'];
    const template = templates[parseInt(tmplChoice) - 1] || 'global';

    const proxy = buildProxy(protocol);
    const config = generateConfig({ proxy, template });

    console.error('\n--- Generated Config ---\n');
    console.log(configToYaml(config));
    console.error(`\nURI: ${proxyToUri(proxy)}`);

    const doTest = await ask('\nTest connectivity? [y/N]: ');
    if (doTest.toLowerCase() === 'y') {
      const result = await testConnection(proxy.server, proxy.port);
      console.error(`${result.reachable ? `✅ OK (${result.latencyMs}ms)` : `❌ ${result.error}`}`);
    }
  } finally {
    rl.close();
  }
}

function printHelp() {
  console.log(`clash-init - Clash/mihomo configuration generator

Usage:
  clash-init                              Interactive mode
  clash-init --ss --server IP [options]   Generate from CLI args
  clash-init --test --ss --server IP      Test connectivity
  clash-init --check-warp                 Check WARP exit IP

Protocols:
  --ss          Shadowsocks
  --vmess       VMess
  --vless       VLESS
  --trojan      Trojan
  --hysteria2   Hysteria2

Common options:
  --server HOST       Server address
  --port PORT         Server port (default: 443)
  --password PASS     Password (ss/trojan/hysteria2)
  --cipher CIPHER     Cipher (ss, default: aes-256-gcm)
  --uuid UUID         UUID (vmess/vless)
  --name NAME         Proxy name (default: proxy)
  --sni HOST          SNI (trojan/hysteria2)
  --network NET       Network type (vmess/vless)
  --flow FLOW         Flow control (vless)

Output:
  --template NAME     Rule template: global|china|custom (default: global)
  --json              JSON output
  --uri               Output share URI only
  -o, --output FILE   Write to file
  --mixed-port PORT   Mixed port (default: 7890)

Actions:
  --test              Test proxy connectivity
  --check-warp        Check WARP exit IP
  -h, --help          Show this help`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
