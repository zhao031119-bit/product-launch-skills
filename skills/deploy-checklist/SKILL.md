---
name: deploy-checklist
description: 上线当天的执行手册：部署前检查、数据库迁移前留恢复点、种子数据、密钥、部署、冒烟测试（页面、登录、支付回调、SEO 自检、IndexNow）、管理员、第一笔真实交易、回退（代码和数据库）。Cloudflare Workers + D1 的具体命令和坑见 references/cloudflare-workers-d1.md。Use when deploying or launching to production, or when the user says "上线 / 发布 / deploy / ship it".
---

# 上线当天

规矩：用户明确说"上线"才部署。密钥只用管道或平台的 secret 命令传，绝不打印出来。

项目用 wrangler 部署到 Cloudflare Workers + D1 的（有 `wrangler.jsonc` 或 `wrangler.toml`）：每一步的命令和坑见 `references/cloudflare-workers-d1.md`。别的平台按同样的顺序，命令换成那个平台的。

## 部署前
- [ ] 部署工具已登录，账号和项目都对。
- [ ] 域名在这个账号里；裸域和 www 都会指向新站，没有冲突的旧解析记录。
- [ ] 公开配置（站点网址、站名、分析 ID）和密钥分开放：密钥一律用平台的 secret。
- [ ] 构建时的站点网址 = 运行时配置里的站点网址 = 正式域名。包里打进了 localhost，登录和回调都会出错。
- [ ] 本地：类型检查、测试、构建都过。
- [ ] 每个模型服务商的后台都设好了花费上限和用量提醒（→ `abuse-and-cost-control`）。

## 顺序执行
1. 结构没改就不生成新迁移。
2. 迁移前先留恢复点（备份、快照，或时间点恢复的书签），再执行迁移。
   - 迁移要兼容上一个版本的代码：只加表、加列；删列、改名放到下一次部署。回退只回滚代码，不回滚数据库。
3. 种子数据（角色、权限、默认配置）：用"已存在就跳过"的写法，重复执行也不出错。
4. 密钥：只用管道或平台命令写入。加密配置用的钥匙一旦设好就别换：数据库里的密文靠它解密。
5. 部署：用加载了生产配置的构建命令。
6. 看部署包体积：离平台上限不到 10% 就要提醒。

## 部署后（冒烟测试）
结果按 `launch-checklist` 里「核对时怎么汇报」的格式给出。
- [ ] DNS：裸域和 www 都解析到新站（本地 DNS 不可信时用 DoH：`https://1.1.1.1/dns-query`）。
- [ ] 首页、各语言首页、定价页、主要内容页、sitemap、robots、llms.txt、关键静态资源都是 200。
- [ ] 公开配置接口（如果有）：开关和服务商设置都对。只剩默认值 = 没读到数据库。
- [ ] 登录：OAuth 返回的 `redirect_uri` 是正式域名（→ `auth-and-accounts`）。
- [ ] 支付：webhook 地址指向生产，填的是规范网址（→ `payments-and-billing`）。
- [ ] 跑 `seo-launch` 的 `seo-check.mjs https://<域名>`，显示 `All clear`（有旧路径前缀就加 `--legacy-prefix=/zh` 之类）。
- [ ] 在项目根目录跑 `seo-launch` 的 `indexnow.mjs https://<域名>`，返回 200 或 202。
- [ ] 跑 `compliance-and-copy` 的 `site-audit.mjs https://<域名> --webhook=<支付回调路径>`，显示 `All clear`；列出来的 free、unlimited 这类说法逐条确认。

## 然后（要用户参与）
1. 用户正常登录一次 → 把这个账号提升为管理员（→ `auth-and-accounts`）。
2. 后台填 AI 密钥、支付密钥。直接写数据库的话，也要先加密。
3. 跑一遍核心流程（例：第一条真实生成）；用真卡买一次最便宜的套餐。
4. GSC 提交 sitemap，Bing 从 GSC 导入。
5. 在聊天里出现过的密钥，之后都换掉。

## 回退
- 代码：回到上一个版本（平台一般有一键回滚）。
- 数据库不会跟着回退，所以迁移要兼容上一个版本。数据坏了用第 2 步的恢复点：恢复点之后写入的数据会丢，先导出现状。
- 第一次上线想下线：把自定义域名从项目上移除。

## 踩过的坑
| 现象 | 原因 / 做法 |
|---|---|
| 浏览器登录 403 Invalid origin | 包里打进了 localhost：用生产配置构建，运行时配置写正式网址 |
| 页面全 500 | 关键密钥没设（例 `AUTH_SECRET`），或数据库连接配置不对 |
| 安全扫描拦下 `curl -d @secret-file` | 被当成外泄：密钥只在真实登录时验证，或交给平台的 secret 命令 |
| 部署包超过上限 | 把重的库改成动态 import、少打进几种语言，或升级套餐 |
