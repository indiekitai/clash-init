import type { ClashConfig, GenerateOptions, Proxy, TemplateName } from './types.js';
import { getDns, getRules } from './templates.js';

export function generateConfig(options: GenerateOptions): ClashConfig {
  const { proxy, template = 'global', mixedPort = 7890 } = options;
  const groupName = 'Proxy';

  return {
    'mixed-port': mixedPort,
    'allow-lan': false,
    mode: 'rule',
    'log-level': 'info',
    dns: getDns(template),
    proxies: [proxy],
    'proxy-groups': [
      {
        name: groupName,
        type: 'select',
        proxies: [proxy.name, 'DIRECT'],
      },
    ],
    rules: getRules(template, groupName),
  };
}

export function configToYaml(config: ClashConfig): string {
  // Simple YAML serializer (no deps)
  return serializeYaml(config, 0);
}

function serializeYaml(value: unknown, indent: number): string {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (/[:{}\[\],&*?|>!%#@`"'\n]/.test(value) || value === '' || value === 'true' || value === 'false') {
      return JSON.stringify(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    // Check if simple array (all primitives)
    if (value.every(v => typeof v !== 'object' || v === null)) {
      return value.map(v => `\n${pad}- ${serializeYaml(v, indent + 1)}`).join('');
    }
    return value.map(v => {
      const inner = serializeYaml(v, indent + 1);
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        const lines = inner.split('\n');
        return `\n${pad}- ${lines[0]}\n${lines.slice(1).map(l => `${pad}  ${l}`).join('\n')}`;
      }
      return `\n${pad}- ${inner}`;
    }).join('');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        return `${k}:${Array.isArray(v) && v.length === 0 ? ' []' : serializeYaml(v, indent + 1).startsWith('\n') ? serializeYaml(v, indent + 1) : ' ' + serializeYaml(v, indent + 1)}`;
      }
      return `${k}: ${serializeYaml(v, indent + 1)}`;
    }).join('\n');
  }
  return String(value);
}

export function proxyToUri(proxy: Proxy): string {
  switch (proxy.type) {
    case 'ss': {
      const userinfo = Buffer.from(`${proxy.cipher}:${proxy.password}`).toString('base64');
      return `ss://${userinfo}@${proxy.server}:${proxy.port}#${encodeURIComponent(proxy.name)}`;
    }
    case 'trojan':
      return `trojan://${proxy.password}@${proxy.server}:${proxy.port}#${encodeURIComponent(proxy.name)}`;
    case 'vmess': {
      const obj = {
        v: '2', ps: proxy.name, add: proxy.server, port: proxy.port,
        id: proxy.uuid, aid: proxy.alterId ?? 0, net: proxy.network ?? 'tcp',
        type: 'none', tls: proxy.tls ? 'tls' : '',
      };
      return `vmess://${Buffer.from(JSON.stringify(obj)).toString('base64')}`;
    }
    case 'vless':
      return `vless://${proxy.uuid}@${proxy.server}:${proxy.port}?flow=${proxy.flow ?? ''}&type=${proxy.network ?? 'tcp'}#${encodeURIComponent(proxy.name)}`;
    case 'hysteria2':
      return `hy2://${proxy.password}@${proxy.server}:${proxy.port}?sni=${proxy.sni ?? ''}#${encodeURIComponent(proxy.name)}`;
    default:
      return '';
  }
}
