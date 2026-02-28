import type { TemplateName } from './types.js';

const chinaDirectDomains = [
  'DOMAIN-SUFFIX,cn,DIRECT',
  'DOMAIN-SUFFIX,baidu.com,DIRECT',
  'DOMAIN-SUFFIX,qq.com,DIRECT',
  'DOMAIN-SUFFIX,weixin.qq.com,DIRECT',
  'DOMAIN-SUFFIX,taobao.com,DIRECT',
  'DOMAIN-SUFFIX,tmall.com,DIRECT',
  'DOMAIN-SUFFIX,jd.com,DIRECT',
  'DOMAIN-SUFFIX,alipay.com,DIRECT',
  'DOMAIN-SUFFIX,163.com,DIRECT',
  'DOMAIN-SUFFIX,126.com,DIRECT',
  'DOMAIN-SUFFIX,bilibili.com,DIRECT',
  'DOMAIN-SUFFIX,zhihu.com,DIRECT',
  'DOMAIN-SUFFIX,douyin.com,DIRECT',
  'DOMAIN-SUFFIX,bytedance.com,DIRECT',
  'DOMAIN-SUFFIX,weibo.com,DIRECT',
  'DOMAIN-SUFFIX,xiaomi.com,DIRECT',
  'DOMAIN-SUFFIX,douban.com,DIRECT',
  'DOMAIN-KEYWORD,baidu,DIRECT',
  'DOMAIN-KEYWORD,alibaba,DIRECT',
  'GEOIP,CN,DIRECT',
];

const chinaDirectIPs = [
  'IP-CIDR,10.0.0.0/8,DIRECT',
  'IP-CIDR,172.16.0.0/12,DIRECT',
  'IP-CIDR,192.168.0.0/16,DIRECT',
  'IP-CIDR,127.0.0.0/8,DIRECT',
  'IP-CIDR,100.64.0.0/10,DIRECT',
];

export function getRules(template: TemplateName, proxyGroupName: string): string[] {
  switch (template) {
    case 'global':
      return [
        ...chinaDirectIPs,
        `MATCH,${proxyGroupName}`,
      ];
    case 'china':
      return [
        ...chinaDirectIPs,
        ...chinaDirectDomains,
        `MATCH,${proxyGroupName}`,
      ];
    case 'custom':
      return [
        ...chinaDirectIPs,
        `MATCH,${proxyGroupName}`,
      ];
    default:
      return [`MATCH,${proxyGroupName}`];
  }
}

export function getDns(template: TemplateName): Record<string, unknown> {
  const base = {
    enable: true,
    listen: '0.0.0.0:53',
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    nameserver: ['https://dns.google/dns-query', 'https://1.1.1.1/dns-query'],
  };
  if (template === 'china') {
    return {
      ...base,
      'default-nameserver': ['223.5.5.5', '119.29.29.29'],
      fallback: ['https://dns.google/dns-query', 'https://1.1.1.1/dns-query'],
      'fallback-filter': { geoip: true, 'geoip-code': 'CN' },
    };
  }
  return base;
}
