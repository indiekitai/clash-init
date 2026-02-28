export type Protocol = 'ss' | 'vmess' | 'vless' | 'trojan' | 'hysteria2';

export interface ProxyBase {
  name: string;
  server: string;
  port: number;
}

export interface ShadowsocksProxy extends ProxyBase {
  type: 'ss';
  cipher: string;
  password: string;
  udp?: boolean;
}

export interface VMessProxy extends ProxyBase {
  type: 'vmess';
  uuid: string;
  alterId?: number;
  cipher?: string;
  tls?: boolean;
  network?: string;
  'ws-opts'?: { path?: string; headers?: Record<string, string> };
}

export interface VLESSProxy extends ProxyBase {
  type: 'vless';
  uuid: string;
  flow?: string;
  tls?: boolean;
  network?: string;
  'reality-opts'?: { 'public-key'?: string; 'short-id'?: string };
  'ws-opts'?: { path?: string; headers?: Record<string, string> };
}

export interface TrojanProxy extends ProxyBase {
  type: 'trojan';
  password: string;
  sni?: string;
  'skip-cert-verify'?: boolean;
}

export interface Hysteria2Proxy extends ProxyBase {
  type: 'hysteria2';
  password: string;
  obfs?: string;
  'obfs-password'?: string;
  sni?: string;
  'skip-cert-verify'?: boolean;
}

export type Proxy = ShadowsocksProxy | VMessProxy | VLESSProxy | TrojanProxy | Hysteria2Proxy;

export type TemplateName = 'global' | 'china' | 'custom';

export interface ClashConfig {
  'mixed-port'?: number;
  'allow-lan'?: boolean;
  mode?: string;
  'log-level'?: string;
  dns?: Record<string, unknown>;
  proxies: Proxy[];
  'proxy-groups': ProxyGroup[];
  rules: string[];
}

export interface ProxyGroup {
  name: string;
  type: string;
  proxies: string[];
  url?: string;
  interval?: number;
}

export interface GenerateOptions {
  proxy: Proxy;
  template?: TemplateName;
  mixedPort?: number;
}

export interface TestResult {
  server: string;
  port: number;
  reachable: boolean;
  latencyMs?: number;
  error?: string;
}

export interface WarpCheckResult {
  ip: string;
  isWarp: boolean;
  org?: string;
}
