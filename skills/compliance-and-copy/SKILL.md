---
name: compliance-and-copy
description: 上线前的合规与文案规范：5 个法律页面写什么、诚实文案（免费、原声、模型披露）、支付审核和广告的禁用词、第三方素材与原声版权、上传安全。Use when writing landing copy, legal pages, preparing for payment-provider review (Waffo, Stripe, Creem), or asking "文案能这么写吗 / 会不会被拒 / 隐私政策 / 版权".
---

# 合规与文案

## 法律页面（5 个都要有，页脚都能点到）
| 页面 | 必须写到 |
|---|---|
| 隐私政策 | 收集什么（邮箱、上传的照片）、用 Google 登录、分析工具（GA4）、支付由谁处理、照片保存多久、怎么删除 |
| 服务条款 | 服务是什么、点数规则、禁止的用途、免责声明 |
| Cookie 政策 | 登录 Cookie、分析 Cookie、Google One Tap 在点击前就可能设 Cookie、怎么拒绝 |
| 退款政策 | 生成失败自动退点数；已用点数怎么处理；联系方式 |
| 可接受使用 | 不能传没同意的真人照片、不能有未成年人、不能冒充他人、不能违法内容 |

改了内容就更新"最后更新"日期。

## 诚实文案
- 没有免费视频，就不写"免费"。"Is it free?"写成答案页，照实说多少钱、免费工具做不到什么。
- 只承诺做得到的：例如写"原声对口型"，就要真的交付原声（→ `ai-video-prompt`）。
- 披露模型：例 "Made with Seedance 2.0 Fast (ByteDance)"。
- 写明是剧本化的恶搞：例 "Scripted parody, not a real ChatGPT answer"。
- 非官方声明：例 "An independent fan tool, not affiliated with OpenAI. ChatGPT is a trademark of OpenAI."
- 价格处处一致：页面、FAQ、结构化数据、llms.txt。

## 禁用词（支付审核、广告、各语言翻译都适用）
- 不写：face swap、deepfake、celebrity，以及它们的翻译。
- 不暗示能用名人或真人做视频；用"你、朋友（经过同意）、宠物、卡通"。
- 翻译时把禁用词的各语言说法写进检查规则（→ `multilingual-homepage`）。

## 第三方素材
- 趋势片段：只用风险低的（例：动物翻拍版）；不放创作者账号和外链；标明"趋势片段，不是本站生成"。
- 原声音频：版权属于原作者，商用和支付审核都有风险。
  - 最好拿到授权。
  - 做成后台可配置：被投诉时一键换成模型配音，并同步改文案。
  - 文件是公开可下载的，心里有数。

## 上传安全
- 只收 JPG、PNG、WebP；不收 SVG。限制大小（例 5 MB）和数量。
- 建议加内容审核：未成年人、裸露、名人。
- 接口限流：先按 IP，登录后再按用户。

## 支付
- 价格、点数只从服务端目录取，不信前端传来的数字。
- webhook 要核对商户号、金额、币种，并且幂等（同一订单只发一次点数）。
- 结账页文案：安全托管结账、支持的付款方式、税在结账时计算。
