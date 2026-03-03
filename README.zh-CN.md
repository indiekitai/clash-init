[English](README.md) | [中文](README.zh-CN.md)

# @indiekitai/clash-init

Clash/mihomo 配置生成器 CLI。零外部依赖。

## 特性

- 🔧 通过 CLI 参数或交互式方式生成 Clash/mihomo 配置
- 📡 支持协议：Shadowsocks、VMess、VLESS、Trojan、Hysteria2
- 📋 内置规则模板：全局代理、国内直连、自定义
- 🔍 TCP 连通性测试
- 🔗 导出分享 URI（ss://、vmess://、trojan:// 等）
- 🌐 WARP 出口 IP 检测
- 🤖 MCP Server，用于 AI agent 集成

## 安装

```bash
npm i -g @indiekitai/clash-init
# 或直接使用
npx @indiekitai/clash-init
```

## CLI 用法

```bash
# 交互模式
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

# 国内直连模板
npx @indiekitai/clash-init --ss --server 1.2.3.4 --port 443 \
  --password "xxx" --template china

# JSON 输出
npx @indiekitai/clash-init --ss --server 1.2.3.4 --port 443 \
  --password "xxx" --json

# 仅输出分享 URI
npx @indiekitai/clash-init --ss --server 1.2.3.4 --port 443 \
  --password "xxx" --uri

# 测试连通性
npx @indiekitai/clash-init --test --ss --server 1.2.3.4 --port 443 --password "xxx"

# 检查 WARP 出口 IP
npx @indiekitai/clash-init --check-warp

# 写入文件
npx @indiekitai/clash-init --ss --server 1.2.3.4 --port 443 \
  --password "xxx" -o config.yaml
```

## 模板

| 模板 | 说明 |
|------|------|
| `global` | 所有流量走代理（默认） |
| `china` | 国内域名/IP 直连，其余走代理 |
| `custom` | 最简规则，仅私有 IP 直连 |

## 编程式 API

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

// 生成配置对象
const config = generateConfig({ proxy, template: 'china' });

// 转换为 YAML
console.log(configToYaml(config));

// 获取分享 URI
console.log(proxyToUri(proxy));

// 测试连通性
const result = await testConnection('1.2.3.4', 443);
console.log(result); // { server, port, reachable, latencyMs }

// 检查 WARP
const warp = await checkWarp();
console.log(warp); // { ip, isWarp, org }
```

## MCP Server

通过 [Model Context Protocol](https://modelcontextprotocol.io) 集成 AI agent：

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

或直接运行 MCP server：

```bash
node dist/mcp.js
```

### MCP 工具

| 工具 | 说明 |
|------|------|
| `generate_config` | 生成 Clash 配置（yaml/json/uri 输出） |
| `test_proxy` | 测试代理服务器的 TCP 连通性 |
| `check_ip` | 检查当前出口 IP 和 WARP 状态 |

## License

MIT
