const { type, name } = $arguments
const compatible_outbound = {
  tag: 'COMPATIBLE',
  type: 'direct',
}

let compatible
let config = JSON.parse($files[0])

// 1. 获取所有代理节点
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
})

// 2. [已优化] 过滤掉信息节点和无效节点
const infoKeywords = /流量|剩余|到期|时间|重置|官网|群组/i;
let validProxies = proxies.filter(p => p.tag && !infoKeywords.test(p.tag));

// 3. 将过滤后的有效代理节点添加到配置中
config.outbounds.push(...validProxies)

// 4. 遍历策略组，并使用过滤后的有效代理节点进行填充
config.outbounds.map(i => {
  if (['all', 'all-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(validProxies))
  }
  if (['hk', 'hk-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(validProxies, /港|hk|hongkong|kong kong|🇭🇰/i))
  }
  if (['tw', 'tw-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(validProxies, /台|tw|taiwan|🇹🇼/i))
  }
  if (['jp', 'jp-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(validProxies, /日本|jp|japan|🇯🇵/i))
  }
  if (['sg', 'sg-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(validProxies, /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i))
  }
  if (['us', 'us-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(validProxies, /美|us|unitedstates|united states|🇺🇸/i))
  }
})

// 5. 为空的策略组添加兼容性 fallback 节点
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound)
      compatible = true
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

// 6. 转换为字符串并进行 URL 替换
let contentString = JSON.stringify(config, null, 2)
const github_proxy = 'https://ghfast.top/' // <--- 您可以修改为您偏好的加速服务地址
// [已修正] 使用正确的替换逻辑
contentString = contentString.replace(/(https?:\/\/(?:raw\.githubusercontent\.com|github\.com)\/)/g, `${github_proxy}$1`)
contentString = contentString.replace(/"download_detour":\s*".*?"/g, '"download_detour": "direct"')

// 7. 输出最终内容
$content = contentString

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag)
}
