import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateConfig, configToYaml, proxyToUri } from '../dist/index.js';

describe('generateConfig', () => {
  const ssProxy = {
    name: 'my-ss',
    type: 'ss',
    server: '1.2.3.4',
    port: 443,
    cipher: '2022-blake3-aes-128-gcm',
    password: 'testpass',
    udp: true,
  };

  it('generates config with ss proxy', () => {
    const config = generateConfig({ proxy: ssProxy });
    assert.equal(config['mixed-port'], 7890);
    assert.equal(config.proxies.length, 1);
    assert.equal(config.proxies[0].type, 'ss');
    assert.equal(config.proxies[0].server, '1.2.3.4');
    assert.ok(config.rules.length > 0);
    assert.ok(config.rules.at(-1).includes('MATCH'));
  });

  it('uses global template by default', () => {
    const config = generateConfig({ proxy: ssProxy });
    assert.ok(!config.rules.some(r => r.includes('baidu')));
    assert.ok(config.rules.some(r => r.includes('MATCH')));
  });

  it('uses china template with direct rules', () => {
    const config = generateConfig({ proxy: ssProxy, template: 'china' });
    assert.ok(config.rules.some(r => r.includes('GEOIP,CN,DIRECT')));
    assert.ok(config.rules.some(r => r.includes('baidu')));
  });

  it('custom mixed port', () => {
    const config = generateConfig({ proxy: ssProxy, mixedPort: 1080 });
    assert.equal(config['mixed-port'], 1080);
  });

  it('proxy groups reference proxy name', () => {
    const config = generateConfig({ proxy: ssProxy });
    assert.ok(config['proxy-groups'][0].proxies.includes('my-ss'));
  });
});

describe('configToYaml', () => {
  it('produces valid-looking yaml', () => {
    const config = generateConfig({ proxy: { name: 'test', type: 'ss', server: '1.1.1.1', port: 443, cipher: 'aes-256-gcm', password: 'pw' } });
    const yaml = configToYaml(config);
    assert.ok(yaml.includes('mixed-port: 7890'));
    assert.ok(yaml.includes('proxies:'));
    assert.ok(yaml.includes('server: 1.1.1.1'));
  });
});

describe('proxyToUri', () => {
  it('generates ss URI', () => {
    const uri = proxyToUri({ name: 'test', type: 'ss', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass' });
    assert.ok(uri.startsWith('ss://'));
    assert.ok(uri.includes('#test'));
  });

  it('generates trojan URI', () => {
    const uri = proxyToUri({ name: 'trj', type: 'trojan', server: '5.6.7.8', port: 443, password: 'secret' });
    assert.ok(uri.startsWith('trojan://'));
    assert.ok(uri.includes('secret@5.6.7.8:443'));
  });

  it('generates vmess URI', () => {
    const uri = proxyToUri({ name: 'vm', type: 'vmess', server: '1.1.1.1', port: 443, uuid: 'abc-123' });
    assert.ok(uri.startsWith('vmess://'));
  });

  it('generates vless URI', () => {
    const uri = proxyToUri({ name: 'vl', type: 'vless', server: '2.2.2.2', port: 443, uuid: 'def-456' });
    assert.ok(uri.startsWith('vless://'));
    assert.ok(uri.includes('def-456@2.2.2.2:443'));
  });

  it('generates hysteria2 URI', () => {
    const uri = proxyToUri({ name: 'hy', type: 'hysteria2', server: '3.3.3.3', port: 443, password: 'hp' });
    assert.ok(uri.startsWith('hy2://'));
  });
});
