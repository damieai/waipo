const { name, type } = $arguments;

// 1. 加载优化后的模板
let config = JSON.parse($files[0]);

// 2. 拉取订阅或合集节点
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 3. 去重：过滤掉 tag 冲突的节点
const existingTags = config.outbounds.map((o) => o.tag);
proxies = proxies.filter((p) => !existingTags.includes(p.tag));

// 4. 添加节点到 outbounds
config.outbounds.push(...proxies);

// 5. 获取所有新节点的 tag 列表
const allProxyTags = proxies.map((p) => p.tag);

// 6. 定义区域匹配规则
const regions = {
  "🇭🇰 香港节点": /香港|HK|Hong\s?Kong/i,
  "🇹🇼 台湾节点": /台湾|台|Tai\s?Wan|TW|TWN/i,
  "🇯🇵 日本节点": /日本|JP|JPN|Japan|Tokyo/i,
  "🇺🇸 美国节点": /美国|US|USA|United\s?States|America/i,
  "🇸🇬 新加坡节点": /新加坡|SG|SIN|Singapore/i,
};

// 7. 定义需要填充节点的代理组
const manualSwitchGroup = config.outbounds.find(o => o.tag === "⚙️ 手动切换");
const autoSelectGroup = config.outbounds.find(o => o.tag === "🎚️ 自动选择");
const globalProxyGroup = config.outbounds.find(o => o.tag === "🌍 全球代理");

// 8. 填充核心代理组
if (manualSwitchGroup) manualSwitchGroup.outbounds.push(...allProxyTags);
if (autoSelectGroup) autoSelectGroup.outbounds.push(...allProxyTags);
// 全球代理组默认已包含自动和手动，无需再次填充

// 9. 填充区域分组，并设置安全回退
Object.keys(regions).forEach((groupTag) => {
  const group = config.outbounds.find((o) => o.tag === groupTag);
  if (!group) return;

  const matched = allProxyTags.filter((tag) => regions[groupTag].test(tag));

  // --- 安全性修复 ---
  // 如果区域内有节点，则使用匹配到的节点
  // 如果没有匹配到任何节点，则回退到'全球代理'，而不是'直连'，防止流量泄露
  group.outbounds = matched.length > 0 ? matched : ["🌍 全球代理"];
});

// 10. 输出最终配置
$content = JSON.stringify(config, null, 2);
