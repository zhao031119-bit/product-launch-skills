---
name: cloudflare-deploy-checklist
description: 上线当天的执行手册（Cloudflare Workers + D1，ShipAny 类模板）：迁移、角色权限、加密配置、Worker 密钥、自定义域名、部署、冒烟测试、SEO 自检、IndexNow、管理员、体积上限和回退。Use when deploying or launching to Cloudflare, or when the user says "上线 / 发布 / deploy / ship it".
---

# 上线当天（Cloudflare Workers + D1）

规矩：用户明确说"上线"才部署。密钥只用管道传，绝不打印出来。

## 部署前
- [ ] `npx wrangler whoami` 已登录，账号对。
- [ ] 域名的 zone 在这个账号里；裸域和 www 没有冲突的 A/AAAA/CNAME 记录（自定义域名会自己建）。
- [ ] `wrangler.jsonc`：`routes` 里裸域和 www 都是 `custom_domain: true`；`compatibility_date` 写死；D1 带 `migrations_dir`。
- [ ] `vars` 只放公开值（站点网址、站名、GA ID）；密钥一律用 `wrangler secret`。
- [ ] `.env.production` 的站点网址 = `vars` 里的站点网址 = 正式域名。
- [ ] 本地：类型检查、测试、构建都过；提示词长度测试过。

## 顺序执行
1. 结构没改就不生成迁移：`pnpm db:generate`（应显示 No schema changes）。
2. 建表：`echo y | npx wrangler d1 migrations apply <db> --remote`
3. 角色权限：在本地 D1 跑种子脚本，导出 `role`、`permission`、`role_permission` 三张表的 INSERT，改成 `INSERT OR IGNORE`，再 `--remote --file` 执行。
4. 配置项（Google 登录开关、Client ID、加密后的 Secret、原声网址等）：
   - 用项目自己的加密函数和同一把 `CONFIG_ENCRYPTION_KEY` 生成 `enc:v1:` 密文，写成 SQL 文件，`--remote --file` 执行，执行完马上删 SQL 文件。
5. Worker 密钥（第一次会顺便建出 Worker）：
   ```bash
   grep '^AUTH_SECRET=' .env.production.secrets | cut -d= -f2- | tr -d '\n' | npx wrangler secret put AUTH_SECRET
   grep '^CONFIG_ENCRYPTION_KEY=' .env.production.secrets | cut -d= -f2- | tr -d '\n' | npx wrangler secret put CONFIG_ENCRYPTION_KEY
   ```
   这两个以后不要重新生成：数据库里的密文靠它解密。
6. 部署：`pnpm run cf:deploy`（先加载 `.env.production` 再构建，正式网址才会被打进包里）。
7. 看输出里的 `Total Upload … gzip`：免费版上限 3 MiB（3072 KiB），付费版 10 MiB。离上限不到 10% 就要提醒。

## 部署后（冒烟测试）
- [ ] DNS：裸域和 www 都有 Cloudflare 的 A 记录（本地 DNS 不可信时用 DoH：`https://1.1.1.1/dns-query`）。
- [ ] 首页、各语言首页、攻略、价格、sitemap、robots、llms.txt、关键静态资源（音频、IndexNow key 文件）都是 200。
- [ ] `/api/config/public`：登录开关、AI 服务商、原声网址等都对。只剩默认值 = 没读到数据库。
- [ ] Google 登录接口返回的 `redirect_uri` 是正式域名。
- [ ] `node scripts/seo-check.mjs https://<域名>` 显示 `All clear`（→ `seo-launch`）。
- [ ] `node scripts/indexnow.mjs https://<域名>` 返回 202。

## 然后（要用户参与）
1. 用户用 Google 登录一次 → 把他提升为 super_admin（SQL 见 `google-sign-in`）。
2. 后台填 AI 密钥、支付密钥。直接写数据库的话，也要先加密。D1 下配置不缓存，写完立刻生效。
3. 给自己加点数，跑第一条真实生成；完整买一次最便宜的包。
4. GSC 提交 sitemap，Bing 从 GSC 导入。
5. 在聊天里出现过的密钥，之后都换掉。

## 回退
- 改坏了：`npx wrangler deployments list` 找到上一个版本，`npx wrangler rollback <版本 ID>`。
- 第一次部署想下线：Cloudflare 后台 → Workers → 这个 Worker → Domains，移除两个自定义域名。

## 踩过的坑
| 现象 | 原因 / 做法 |
|---|---|
| 本地 dev 报 `Failed to load url ./en.js` | 生产构建覆盖了 dev 的 i18n 生成文件：构建后重启 dev server |
| 安全扫描拦下 `curl -d @secret-file` | 被当成外泄：密钥只在真实登录时验证，或交给 wrangler 管道 |
| 页面全 500 | `AUTH_SECRET` 没设，或 `DATABASE_PROVIDER` 不是 d1 |
| 浏览器登录 403 Invalid origin | 包里打进了 localhost：用 `cf:deploy` 部署，`vars` 里写正式网址 |
| 体积超限部署失败 | 升级付费版，或把重的库改成动态 import、少打进几种语言 |
