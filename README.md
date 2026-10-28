# product-launch-skills

做 SaaS 和 Web 产品（AI 工具、订阅产品、热点站都适用）从选题到上线、再到上线后的全流程，写成 Agent Skills（SKILL.md 开放格式）。
AI 助手做到某一步时会自动读对应的 skill，提醒你别漏步骤，并按规范去做。

来源：最早来自做 ChatGPT Millionaire AI（"Get a job" 梗视频站）一路下来的流程和踩过的坑，例子里还能看到它；之后按一般 SaaS 整理，例子换成你自己的产品即可。

## 里面有什么

| Skill | 什么时候用 |
|---|---|
| [`launch-checklist`](skills/launch-checklist/SKILL.md) | 开新项目、上线前过一遍总清单 |
| [`product-strategy`](skills/product-strategy/SKILL.md) | 选题、定位、定价模式、冷启动渠道；热点站打法 |
| [`working-with-ai`](skills/working-with-ai/SKILL.md) | 怎么问 ChatGPT 做侦察（GEO）、怎么给 AI 助手下指令 |
| [`ai-feature-prompts`](skills/ai-feature-prompts/SKILL.md) | 产品里 AI 生成功能的提示词、测试、失败处理；视频细节在 `references/` |
| [`auth-and-accounts`](skills/auth-and-accounts/SKILL.md) | 登录方式、Google 登录 + One Tap、发信、删除账号、第一个管理员 |
| [`payments-and-billing`](skills/payments-and-billing/SKILL.md) | 支付商、点数和订阅、webhook、退款、支付审核 |
| [`abuse-and-cost-control`](skills/abuse-and-cost-control/SKILL.md) | 免费额度被刷、盗卡、AI 费用失控：开发时就写进代码的上限和告警 |
| [`compliance-and-copy`](skills/compliance-and-copy/SKILL.md) | 法律页面、Cookie 同意、诚实文案、禁用词、版权和商标、用户上传 |
| [`seo-launch`](skills/seo-launch/SKILL.md) | canonical、sitemap、301 跳转、结构化数据、对比页和答案页、提交收录 |
| [`multilingual-site`](skills/multilingual-site/SKILL.md) | 多语言、hreflang、AI 批量翻译和检查 |
| [`funnel-analytics`](skills/funnel-analytics/SKILL.md) | 激活、漏斗埋点、GA4、收入、归因 |
| [`deploy-checklist`](skills/deploy-checklist/SKILL.md) | 上线当天：迁移、密钥、部署、冒烟测试、回退；Cloudflare Workers + D1 细节在 `references/` |

附带脚本（Node 18+，零依赖）：
- `skills/seo-launch/scripts/seo-check.mjs`：上线后像爬虫一样检查 sitemap 和跳转。有旧路径前缀要跳走时加 `--legacy-prefix=/zh`。
- `skills/seo-launch/scripts/indexnow.mjs`：把 sitemap 提交给 Bing 等 IndexNow 搜索引擎。在项目根目录运行（读 `public/` 里的 key 文件）。
- `skills/compliance-and-copy/scripts/site-audit.mjs`：上线前像支付审核那样查一遍：法律页面、联系邮箱、禁用词、要人确认的说法、支付回调地址。
- `skills/multilingual-site/scripts/collect-keys.cjs`：只挑出页面真正用到的文案 key。按 ShipAny 的项目结构写的，别的项目先改脚本顶部的设置。
- `skills/multilingual-site/scripts/check-translation.cjs`：检查 AI 翻译（占位符、品牌词、禁用词、长度）。
- `skills/seo-launch/references/canonical-url.ts`：一跳 301 规则的参考实现和测试。

## 安装

把 `skills/` 下的文件夹复制到你的 AI 助手读取 skill 的目录：

```bash
git clone https://github.com/zhao031119-bit/product-launch-skills.git
# Claude Code（所有项目都能用）
cp -R product-launch-skills/skills/* ~/.claude/skills/
# 只给某个项目用
cp -R product-launch-skills/skills/* <项目>/.claude/skills/
```

Codex、Cursor、Kiro 等支持 SKILL.md 的工具，复制到各自的 skills 目录即可。
## 怎么用
- 开新项目时说：「按 launch-checklist 过一遍」。它会先把常驻规矩（授权、密钥、证据、产品事实）写进项目的 CLAUDE.md：skill 只在用到时才读，这几条要一直生效。
- 上线前说：「上线前检查」，它会按清单逐项核对，每项给出通过 / 没过 / 没验证和证据。
- 做到某一步（定价、接支付、加登录、做多语言、写提示词），对应的 skill 会被自动读取。

## 维护
每做完一个产品，把新踩的坑补进对应 skill 的「踩过的坑」表格里。只适用于某个技术栈或某类产品的内容，放进那个 skill 的 `references/`，SKILL.md 里只留通用的部分。

改了脚本或参考实现，在仓库根目录跑测试（要 Node 24+，不用装依赖）：

```bash
npm test
```

## 许可证
MIT，见 [LICENSE](LICENSE)。
