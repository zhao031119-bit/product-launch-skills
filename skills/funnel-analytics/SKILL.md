---
name: funnel-analytics
description: SaaS 漏斗埋点规范：先定"激活"，再从来访、注册、激活、付费墙、结账、付款到续费和流失，每一步发什么事件、GA4 事件名、哪些进后台用户时间线、哪些只能服务端记录（付款、收入、订阅），来源归因（含 ChatGPT），上线后怎么验证。Use when adding analytics, tracking events, GA4, a conversion funnel, activation or retention metrics, or asking "埋点 / 漏斗 / 转化率 / 激活 / 留存 / 用户卡在哪一步".
---

# 漏斗埋点

## 先定"激活"
激活 = 用户第一次拿到产品价值的那一步。例：生成出第一条视频；导入第一份数据；第一次邀请同事。注册不等于激活，漏斗里最该盯的是"注册 → 激活"。

## 漏斗（按顺序）
| 步骤 | 事件 | 附带信息 | 谁来发 |
|---|---|---|---|
| 落地页按钮 | `landing_cta_clicked` | lang、placement | 前端 |
| 注册 | `sign_up` | method | 前端（注册成功后） |
| 激活 | 产品自己的事件（例 `video_ready`） | 关键选项 | 前端或服务端 |
| 看到价格（付费墙、定价页） | `paywall_view` | variant、plan、balance | 前端 |
| 去付款 | `begin_checkout` | plan、value、currency | 前端 |
| 付款成功 | `purchase` | transaction_id、value、currency | 服务端 |
| 续费、取消 | `subscription_renewed`、`subscription_canceled` | plan、value | 服务端（webhook） |
| 退款 | `refund` | transaction_id、value、currency | 服务端（webhook） |

核心功能的每一步也各发一个事件。例（AI 视频站）：

| 步骤 | 事件 | 附带信息 |
|---|---|---|
| 选了照片 | `photo_added` | type、size_kb |
| 点生成 | `generate_clicked` | quality、scene、signed_in |
| 要求登录 | `sign_in_prompted` | — |
| 出片（激活） | `video_ready` | quality、scene |
| 失败 | `video_failed` | reason |
| 下载 | `video_downloaded` | — |

## 收入
GA4 的收入只认 `purchase` 事件，`begin_checkout` 上的 value 不算收入。付款结果只有服务端可信，所以：
- 结账时用 `gtag('get', '<G-ID>', 'client_id', …)` 拿到 client_id，随订单存下。
- webhook 确认到账后，服务端用 Measurement Protocol 发 `purchase`：带上 client_id、`transaction_id`（订单号，GA4 用它去重）、value、currency。api_secret 在 GA4 的数据流设置里建，当密钥保存。
- 用户没同意分析 Cookie 的，不发。
- 订阅产品的 MRR、流失率、试用转化率：从支付商或自己的订单、订阅表算，不靠 GA4（→ `payments-and-billing`）。

## 发到哪里
- 一个 `funnel(step, detail)` 函数，同时发：
  - GA4（`gtag('event', …)`）：所有访客。
  - 后台用户时间线（`track()`）：只有登录用户；看单个用户卡在哪。
- 钱、权限、风控类事件不能从前端发：谁都能伪造。只在服务端记。

## 事件数据规则
- detail 是扁平对象：最多 10 个 key，值是短字符串、数字或布尔。
- 不放个人信息（邮箱、姓名、文件网址），不放密钥。
- 事件名用小写加下划线，一个动作一个名字，上线后别改名。

## 来源归因
- 首次访问记下 UTM（utm_source…）和外站 referrer，存 30 天 cookie；注册时写进用户记录。
- 后台能按来源看注册和付费：ChatGPT、Google、社区、Product Hunt、导航站各占多少。
- ChatGPT 的外链会带 `utm_source=chatgpt.com`，"ChatGPT 来源占比"主要靠它算；没带的再看 referrer。
- 这个 Cookie 写进 Cookie 政策；有欧盟访客时，等用户同意后再写。

## 上线后验证
- [ ] GA4 只在生产环境加载：本地看不到是正常的。
- [ ] 打开 GA4 实时报告，自己走一遍：注册、激活、去付款，事件应在 1 分钟内出现。
- [ ] 有欧盟访客就要有 Cookie 横幅：用户同意前 GA4 走 Consent Mode（不写 Cookie），归因 Cookie 也等同意后再写。
- [ ] 真买一次：GA4 里能看到这笔 `purchase` 和收入。服务端发之前，可以先把请求打到 `https://www.google-analytics.com/debug/mp/collect` 校验格式。
- [ ] 一周后看：哪一步掉得最多、哪个选项没人用、失败率多少。按数据删选项、改文案。
