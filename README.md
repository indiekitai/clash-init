# @indiekitai/clash-init

Clash/mihomo configuration generator CLI. Zero external dependencies.

## Features

- 🔧 Generate Clash/mihomo config from CLI args or interactively
- 📡 Protocols: Shadowsocks, VMess, VLESS, Trojan, Hysteria2
- 📋 Built-in rule templates: global proxy, China direct, custom
- 🔍 TCP connectivity test for proxy servers
- 🔗 Export share URIs (ss://, vmess://, trojan://, etc.)
- 🌐 WARP exit IP detection
- 🤖 MCP Server for AI agent integration

## Install

```bash
npm i -g @indiekitai/clash-init
# or use directly
npx @indiekitai/clash-init
```

## CLI Usage

```bash
# Interactive mode
npx @indiekitai/clash-init

# Shadowsocks
npx @indiekitai/clash-init --ss --server 1.2.3.4 --port 443 \
  --password "xxx" --cipher "2022-blake3-aes-128-gcm"

# VMess
npx @indiekitai/clash-init --vmess --server 1.2.3.4 --port 443 --uuid "your-uuid"

# VLESS
npx @indiekitai/clash-init --vless --server 1.2.3.4 --port 443 --uuid "your-uuid"

# Trojan
npx @indiekitai/clash-init --trojan --server 1.2.3.4 --port 443 --password "xxx"

# Hysteria2
npx @indiekitai/clash-init --hysteria2 --server 1.2.3.4 --port 443 --password "xxx"

# China direct template
npx @indiekitai/clash-init --ss --server 1.2.3.4 --port 443 \
  --password "xxx" --template china

# JSON output
npx @indiekitai/clash-init --ss --server 1.2.3.4 --port 443 \
  --password "xxx" --json

# Share URI only
npx @indiekitai/clash-init --ss --server 1.2.3.4 --port 443 \
  --password "xxx" --uri

# Test connectivity
npx @indiekitai/clash-init --test --ss --server 1.2.3.4 --port 443 --password "xxx"

# Check WARP exit IP
npx @indiekitai/clash-init --check-warp

# Write to file
npx @indiekitai/clash-init --ss --server 1.2.3.4 --port 443 \
  --password "xxx" -o config.yaml
```

## Templates

| Template | Description |
|----------|-------------|
| `global` | Route everything through proxy (default) |
| `china`  | China domains/IPs direct, rest through proxy |
| `custom` | Minimal rules, only private IPs direct |

## Programmatic API

```js
import { generateConfig, configToYaml, proxyToUri, testConnection, checkWarp } from '@indiekitai/clash-init';

const proxy = {
  name: 'my-proxy',
  type: 'ss',
  server: '1.2.3.4',
  port: 443,
  cipher: '2022-blake3-aes-128-gcm',
  password: 'secret',
};

// Generate config object
const config = generateConfig({ proxy, template: 'china' });

// Convert to YAML
console.log(configToYaml(config));

// Get share URI
console.log(proxyToUri(proxy));

// Test connectivity
const result = await testConnection('1.2.3.4', 443);
console.log(result); // { server, port, reachable, latencyMs }

// Check WARP
const warp = await checkWarp();
console.log(warp); // { ip, isWarp, org }
```

## MCP Server

For AI agent integration via [Model Context Protocol](https://modelcontextprotocol.io):

```json
{
  "mcpServers": {
    "clash-init": {
      "command": "npx",
      "args": ["@indiekitai/clash-init", "--mcp"]
    }
  }
}
```

Or run the MCP server directly:

```bash
node dist/mcp.js
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `generate_config` | Generate Clash config (yaml/json/uri output) |
| `test_proxy` | Test TCP connectivity to a proxy server |
| `check_ip` | Check current exit IP and WARP status |

## License

MIT
