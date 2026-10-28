---
name: compliance-and-copy
description: SaaS 上线前的合规与文案规范：5 个法律页面写什么、用户数据交给了哪些第三方、欧盟 Cookie 同意、诚实文案（免费、无限、AI 能力、评价）、支付审核和广告的禁用词、第三方素材与商标（域名和站名）、用户上传和用户生成的内容，附上线前自查脚本。Use when writing landing copy or legal pages, choosing a domain or site name, preparing for payment-provider or ad review, handling uploads or user content, auditing a site before launch, or asking "文案能这么写吗 / 会不会被拒 / 隐私政策 / 版权 / 商标 / GDPR".
---

# 合规与文案

## 法律页面（5 个都要有，页脚都能点到）
| 页面 | 必须写到 |
|---|---|
| 隐私政策 | 收集什么（账号信息、上传的内容、使用数据）；交给了哪些第三方（登录、AI 服务商、支付、分析、邮件），是否传到境外；保存多久；怎么删除和导出 |
| 服务条款 | 服务是什么、收费和额度规则、用户内容归谁、禁止的用途、免责声明 |
| Cookie 政策 | 登录 Cookie、分析 Cookie、来源归因 Cookie（UTM）、第三方登录组件（例：Google One Tap 在点击前就可能设 Cookie）、怎么拒绝 |
| 退款政策 | 什么情况能退、多少天内、已用额度怎么算、联系方式（→ `payments-and-billing`） |
| 可接受使用 | 不能违法、侵权、冒充他人、滥用服务；AI 产品再加：不能传没经同意的真人照片、不能涉及未成年人 |

- 改了内容就更新"最后更新"日期。
- 有欧盟访客（做了法语、德语、意大利语就会有）：分析和归因 Cookie 要等用户同意后再写，所以 Cookie 横幅必须有（GA4 用 Consent Mode，→ `funnel-analytics`）。
- 卖给企业客户时，对方还会要数据处理协议（DPA）和子处理者清单。

## 诚实文案
- "免费"只在真免费时写；有免费额度就写清额度。"Is it free?"写成答案页，照实说多少钱、免费版做不到什么。
- "无限""秒出""100% 准确"这类词，做不到就不写。
- 只承诺做得到的：例如写"原声对口型"，就要真的交付原声（→ `ai-feature-prompts`）。
- AI 产品披露用的模型：例 "Made with Seedance 2.0 Fast (ByteDance)"。内容是剧本化的就写明：例 "Scripted parody, not a real ChatGPT answer"。
- 评价、案例、用户数要真实；没有就先不放。
- 用到别人的产品名时写非官方声明：例 "An independent tool, not affiliated with OpenAI. ChatGPT is a trademark of OpenAI."
- 域名和站名别放别人的商标（ChatGPT、TikTok、Notion…）：上面这句声明挡不住商标投诉和域名争议（UDRP）。商标词只在正文里描述性地用。
- 价格处处一致：页面、FAQ、结构化数据、llms.txt 都从产品事实文件取（→ `launch-checklist`）。

## 禁用词（支付审核、广告、各语言翻译都适用）
- 先查支付商和广告平台的禁售、限制清单，再定文案。
- AI 图片 / 视频产品：不写 face swap、deepfake、celebrity，以及它们的翻译；不暗示能用名人或真人做内容，用"你、朋友（经过同意）、宠物、卡通"。
- 其他常见的高风险说法：保证收益、医疗功效、"绕过检测"、成人内容。
- 翻译时把禁用词的各语言说法写进检查规则（→ `multilingual-site`）。

## 第三方素材
- 别人的视频、图片、音频、文字：能不用就不用，要用就拿授权。署名和标注都不降低侵权风险。
- 示例尽快换成自己产品做出来的结果。
- 热点视频站的例子：
  - 趋势片段只用风险低的（例：动物翻拍版）；不放创作者账号和外链；标明"趋势片段，不是本站生成"。
  - 原声音频版权属于原作者，商用和支付审核都有风险。最好拿到授权；做成后台可配置，被投诉时一键换成模型配音，并同步改文案；文件是公开可下载的，心里有数。

## 用户上传和用户生成的内容
- 只收需要的文件类型（例：图片只收 JPG、PNG、WebP，不收 SVG）；限制大小（例 5 MB）和数量。
- 存储和发给第三方之前去掉 EXIF：手机照片里常带 GPS 位置。
- 建议加内容审核：未成年人、裸露、名人、违法内容。
- 用户内容会公开展示时：要有举报入口和侵权投诉（DMCA）联系方式。
- 接口限流：先按 IP，登录后再按用户（→ `abuse-and-cost-control`）。

## 上线前自查
```bash
node scripts/site-audit.mjs https://<域名> --webhook=<支付回调路径>
```
- 必须过：首页页脚链到 5 个法律页面且都能打开；有联系邮箱；首页和定价页没有禁用词；支付回调地址不跳转，没签名的请求返回 4xx。
- 逐条列出、由人确认：英文页面上的 "free""unlimited""instant""guaranteed""100%" 这类说法是不是真的。
- 自己产品的禁用词用 `--banned=词,词` 加上；别的营销页用 `--page=/路径` 加上。
- 脚本在本 skill 的 `scripts/` 目录（Node 18+，零依赖），可以直接用 skill 目录里的路径运行。
