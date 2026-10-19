---
name: trend-site-strategy
description: 蹭热点的单一功能 AI 站（新词 / 梗 / 爆款视频模板）怎么选题、抢时机、定位、定价。Use when deciding whether to build a site for a new trend or meme, choosing the keyword, domain, positioning, pricing or launch timing ("这个梗值得做吗 / 新词站 / meme generator site / trend site").
---

# 热点单功能站策略

## 时机：越早越好
- 热点一般活 1–3 周。上线后 2–3 天到峰值，一周后流量约减半。
- 记下趋势开始日期，倒推上线日。晚一周，大部分流量就没了。
- 先把站做完整，再一次性上线。爬虫和 ChatGPT 第一次看到的就是完整的站。

## 渠道：ChatGPT 优先（GEO）
- 社群复盘里，ChatGPT 常是新词站最大的流量和订单来源，占 50–85%。
- ChatGPT 搜索靠 Bing 的索引：上线当天就提交 Bing 和 IndexNow（→ `seo-launch`）。
- robots.txt 放行 OAI-SearchBot、ChatGPT-User、GPTBot、Bingbot。
- 页面写"能被直接引用"的事实块：输入、输出、时长、价格、有无水印、要不要 App。

## 定位：做那个梗的"模板 / 生成器"
- 标题用用户的原话：例如 "Get a Job Meme Template"，不用自造的品牌词。
- 先问 ChatGPT 它推荐什么（→ `working-with-ai`），把它推荐的那类工具当真正的对手。
  - 例：它推荐"假聊天截图视频工具"和 CapCut 模板，就在对比表里各列一栏。
- 保留原梗的标志：同样的台词、节奏、眼神、原声。原声往往是最大的卖点。
- 选项只在多一个笑点、又不伤质量时才加（例：豪宅场景），否则删掉。

## 产品形态
- 一个输入，一个输出，3 步：上传 → 选择 → 生成。
- 默认值就是原版（原场景、原台词）。大多数人不会改默认。
- 示例视频只用安全的素材（例：动物版），不放创作者账号，标明"不是本站生成"。

## 定价
- 一次性点数包，不订阅。例：$9.90 / 10 点、$19.90 / 30 点、$29.90 / 50 点。
- 标清每个包能做几条：标准一条 10 点，HD 一条 20 点。
- 中间档标"最受欢迎"，按点数单价算"省 X%"。
- 没有免费视频就不要写"免费"。"Is it free?"做成答案页，诚实回答。
- 生成失败自动退点数，并在页面上写明。

## 复用
- 上一个站的组件和清单直接复用、改名。每次做完更新这些 skill。
- 每个新站都过一遍 `launch-checklist`。

## 上线后头 3 天
- 每天看 GA4 漏斗、失败率、ChatGPT 来源占比。
- 根据数据只改一处：标题、首屏文案或默认选项。
