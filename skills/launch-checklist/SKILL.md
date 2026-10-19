---
name: launch-checklist
description: 做新产品、上线前、上线后的总清单：选题时机 → 搭建 → 核心功能 → 登录支付 → 合规文案 → SEO/GEO → 多语言 → 埋点 → 部署 → 上线后。每一步列出"别忘了"，细节指向专项 skill。Use when starting a new web product, planning or doing a launch, or asking "上线前还差什么 / 帮我过一遍清单 / what am I forgetting / launch checklist".
---

# 产品上线总清单

怎么用：
- 开新项目时，从头过一遍，把不做的项写上理由。
- 每次部署前，再过一遍「5 SEO」「8 部署」。
- 细节都在专项 skill 里，这里只放"别忘了"。

## 0. 选题与时机 → `trend-site-strategy`
- [ ] 一句话说清产品：输入什么，得到什么（例：一张照片 → 13 秒 9:16 MP4）。
- [ ] 记下趋势开始的日期。热点通常 1–3 周，上线 2–3 天到峰值，一周后流量约减半。
- [ ] 去 ChatGPT 侦察：它推荐谁、怎么描述（→ `working-with-ai`）。
- [ ] 定关键词：用户真实的叫法（"<梗名> template / generator / maker"）。
- [ ] 域名：含核心词、短；先把 zone 建在 Cloudflare。

## 1. 搭建
- [ ] 首屏就是生成器：上传 → 选项 → 生成。手机优先，底部常驻 CTA。
- [ ] 首页区块：示例、3 步怎么做、梗的解释、为什么选我们、对比表、价格、FAQ、结尾 CTA。
- [ ] 站名可以是品牌，但首页 `<title>` 以搜索词开头。
- [ ] 复用上一个站的组件，改名即可，别从零写。

## 2. 核心功能 → `ai-video-prompt`
- [ ] 逐帧拆原片：有没有剪辑、每句台词几秒到几秒（看音频波形，别猜）。
- [ ] 提示词按秒写动作、谁在说话、嘴张还是闭。
- [ ] 参考素材（照片、原声）在提示词里写明角色。
- [ ] 每个选项（场景、清晰度）都跑过真实生成。
- [ ] 生成失败自动退点数。

## 3. 登录与支付 → `google-sign-in`
- [ ] Google 登录 + One Tap：回调地址、JS 来源、发布应用。
- [ ] 一次性点数包，不订阅；入门价低；写清每个包能做几条。
- [ ] 金额只信服务端；webhook 幂等；上线后真买一次。

## 4. 合规与文案 → `compliance-and-copy`
- [ ] 隐私、条款、Cookie、退款、可接受使用：5 个页面都要有。
- [ ] 只写做得到的事："免费"只在真免费时写；不用 face swap / deepfake / celebrity 一类词。
- [ ] 别人的素材（趋势片段、原声）：风险写下来，标明"不是本站生成"。
- [ ] "非官方，与 OpenAI 等无关"的声明。

## 5. SEO 与 GEO → `seo-launch`
- [ ] 每页只有 1 个指向自己的 canonical；title ≤ 60 字符，description ≤ 160。
- [ ] sitemap 里只放直接返回 200 的网址；robots.txt 写 Sitemap 行；有 llms.txt。
- [ ] 跳转只跳一次，用 301：http→https、www→裸域、去掉末尾斜杠。
- [ ] 结构化数据：首页 FAQPage + HowTo，攻略页 Article + BreadcrumbList + FAQPage。
- [ ] 答案页：每个长尾问题一页（"免费吗""宠物版""CapCut 模板""用什么照片"）。
- [ ] 上线后跑 `seo-check`，全绿再提交 GSC（网域资源）、Bing（从 GSC 导入）和 IndexNow。

## 6. 多语言 → `multilingual-homepage`
- [ ] 首页本身切换语言（/es、/de…），不要另做简化落地页。
- [ ] 只按 URL 定语言，不按 cookie 或浏览器语言自动跳。
- [ ] hreflang 互相指向，加 x-default；每种语言有自己的 title 和 description。

## 7. 埋点 → `funnel-analytics`
- [ ] 上传 → 点生成 → 要求登录 → 看到价格 → 去付款 → 出片/失败 → 下载。
- [ ] GA4 看所有访客；后台时间线看登录用户；付款以服务端订单为准。

## 8. 部署上线 → `cloudflare-deploy-checklist`
- [ ] 等明确说"上线"才部署。
- [ ] 数据库迁移 → 角色权限 → 配置项（密钥加密）→ Worker 密钥 → 部署。
- [ ] 冒烟：页面 200、配置开关、静态资源、登录回调地址。
- [ ] 管理员：先用 Google 登录一次，再提升为 super_admin。
- [ ] 填 AI 和支付密钥，跑第一条真实生成，完整买一次。

## 9. 上线后
- [ ] GA4 实时报告：事件有没有进来。
- [ ] GSC 覆盖率、Bing 收录；在 ChatGPT 里搜一次，看能不能找到自己。
- [ ] 按数据删选项（例：场景选择分布）。
- [ ] 换掉在聊天里出现过的密钥。
- [ ] 提交导航站和目录，拿外链。

## 和 AI 协作 → `working-with-ai`
不可逆的操作用明确字眼授权："上线""提交代码""删除"。想停就直接说"停"。
