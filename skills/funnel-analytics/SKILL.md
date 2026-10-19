---
name: funnel-analytics
description: 生成类产品的漏斗埋点规范：从上传到下载每一步发什么事件、GA4 事件名、哪些进后台用户时间线、哪些只能服务端记录、上线后怎么验证。Use when adding analytics, tracking events, GA4, conversion funnel, or asking "埋点 / 漏斗 / 转化率 / 用户卡在哪一步".
---

# 漏斗埋点

## 漏斗（按顺序）
| 步骤 | GA4 事件 | 附带信息 |
|---|---|---|
| 选了照片 | `photo_added` | type、size_kb |
| 点生成 | `generate_clicked` | quality、scene、signed_in |
| 要求登录 | `sign_in_prompted` | — |
| 看到价格（付费墙 / 追加购买） | `paywall_view` | variant、quality、balance |
| 去付款 | `begin_checkout` | product_id、value、currency |
| 付款成功 | 服务端订单 | 以订单表为准，不信前端 |
| 出片 | `video_ready` | quality、scene |
| 失败 | `video_failed` | reason |
| 下载 | `video_downloaded` | — |
| 落地页按钮 | `landing_cta_clicked` | lang、placement |

`begin_checkout` 带 `value` 和 `currency`，GA4 才能算收入漏斗。

## 发到哪里
- 一个 `funnel(step, detail)` 函数，同时发：
  - GA4（`gtag('event', …)`）：所有访客。
  - 后台用户时间线（`track()`）：只有登录用户；看单个用户卡在哪。
- 钱、权限、风控类事件不能从前端发：谁都能伪造。只在服务端记。

## 事件数据规则
- detail 是扁平对象：最多 10 个 key，值是短字符串、数字或布尔。
- 不放个人信息（邮箱、姓名、照片网址），不放密钥。
- 事件名用小写加下划线，一个动作一个名字，上线后别改名。

## 来源归因
- 首次访问记下 UTM（utm_source…）和外站 referrer，存 30 天 cookie；注册时写进用户记录。
- 后台能按来源看注册和付费：ChatGPT、Google、TikTok、导航站各占多少。

## 上线后验证
- [ ] GA4 只在生产环境加载：本地看不到是正常的。
- [ ] 打开 GA4 实时报告，自己走一遍：上传、生成、去付款，事件应在 1 分钟内出现。
- [ ] 有 Cookie 横幅时：用户同意前 GA4 走 Consent Mode（不写 Cookie）。
- [ ] 一周后看：哪一步掉得最多、哪个选项没人选、失败率多少。按数据删选项、改文案。
