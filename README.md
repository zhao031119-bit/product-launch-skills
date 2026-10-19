# product-launch-skills

做热点类 AI 网站（以及一般的 Web 产品）从选题到上线的全流程，写成 Agent Skills（SKILL.md 开放格式）。
AI 助手做到某一步时会自动读对应的 skill，提醒你别漏步骤，并按规范去做。

来源：ChatGPT Millionaire AI（"Get a job" 梗视频站）一路做下来的流程和踩过的坑。

## 里面有什么

| Skill | 什么时候用 |
|---|---|
| [`launch-checklist`](skills/launch-checklist/SKILL.md) | 开新项目、上线前过一遍总清单 |
| [`trend-site-strategy`](skills/trend-site-strategy/SKILL.md) | 选题、抢时机、定位、定价 |
| [`working-with-ai`](skills/working-with-ai/SKILL.md) | 怎么问 ChatGPT 做侦察（GEO）、怎么给 AI 助手下指令 |
| [`ai-video-prompt`](skills/ai-video-prompt/SKILL.md) | 逐帧拆原片、按秒写提示词、原声和口型 |
| [`google-sign-in`](skills/google-sign-in/SKILL.md) | Google 登录 + One Tap、第一个管理员 |
| [`compliance-and-copy`](skills/compliance-and-copy/SKILL.md) | 法律页面、诚实文案、禁用词、版权 |
| [`seo-launch`](skills/seo-launch/SKILL.md) | canonical、sitemap、301 跳转、结构化数据、答案页、提交收录 |
| [`multilingual-homepage`](skills/multilingual-homepage/SKILL.md) | 首页多语言、hreflang、AI 批量翻译和检查 |
| [`funnel-analytics`](skills/funnel-analytics/SKILL.md) | 漏斗埋点、GA4、归因 |
| [`cloudflare-deploy-checklist`](skills/cloudflare-deploy-checklist/SKILL.md) | 上线当天：D1、密钥、部署、冒烟测试、回退 |

附带脚本（Node 18+，零依赖）：
- `skills/seo-launch/scripts/seo-check.mjs`：上线后像爬虫一样检查 sitemap 和跳转。
- `skills/seo-launch/scripts/indexnow.mjs`：把 sitemap 提交给 Bing 等 IndexNow 搜索引擎。
- `skills/multilingual-homepage/scripts/collect-keys.cjs`：只挑出页面真正用到的文案 key。
- `skills/multilingual-homepage/scripts/check-translation.cjs`：检查 AI 翻译（占位符、品牌词、禁用词、长度）。
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
- 开新项目时说：「按 launch-checklist 过一遍」。
- 上线前说：「上线前检查」，它会按清单逐项核对。
- 做到某一步（加 Google 登录、做多语言、写提示词），对应的 skill 会被自动读取。

## 维护
每做完一个产品，把新踩的坑补进对应 skill 的「踩过的坑」表格里。
