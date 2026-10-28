# Cloudflare Workers + D1（ShipAny 类模板）

按 `../SKILL.md` 的顺序，这里是每一步在 Cloudflare 上的具体命令和坑。

## 部署前
- [ ] `npx wrangler whoami` 已登录，账号对。
- [ ] 域名的 zone 在这个账号里；裸域和 www 没有冲突的 A/AAAA/CNAME 记录（自定义域名会自己建）。
- [ ] `wrangler.jsonc`：`routes` 里裸域和 www 都是 `custom_domain: true`；`compatibility_date` 写死；D1 带 `migrations_dir`。
- [ ] `vars` 只放公开值（站点网址、站名、GA ID）；密钥一律用 `wrangler secret`。
- [ ] `.env.production` 的站点网址 = `vars` 里的站点网址 = 正式域名。
- [ ] 本地：类型检查、测试、构建都过；提示词长度测试过。

## 顺序执行
1. 结构没改就不生成迁移：`pnpm db:generate`（应显示 No schema changes）。
2. 建表。先记下数据库当前的 bookmark（出事时用它恢复，见「回退」）：`npx wrangler d1 time-travel info <db>`；再执行 `echo y | npx wrangler d1 migrations apply <db> --remote`。
3. 角色权限：在本地 D1 跑种子脚本，导出 `role`、`permission`、`role_permission` 三张表的 INSERT，改成 `INSERT OR IGNORE`，再 `--remote --file` 执行。
4. 配置项（Google 登录开关、Client ID、加密后的 Secret、原声网址等）：
   - 用项目自己的加密函数和同一把 `CONFIG_ENCRYPTION_KEY` 生成 `enc:v1:` 密文，写成 SQL 文件，`--remote --file` 执行，执行完马上删 SQL 文件。
5. Worker 密钥（第一次会顺便建出 Worker）：
   ```bash
   grep '^AUTH_SECRET=' .env.production.secrets | cut -d= -f2- | tr -d '\r\n' | npx wrangler secret put AUTH_SECRET
   grep '^CONFIG_ENCRYPTION_KEY=' .env.production.secrets | cut -d= -f2- | tr -d '\r\n' | npx wrangler secret put CONFIG_ENCRYPTION_KEY
   ```
   这两个以后不要重新生成：数据库里的密文靠它解密。
   `.env` 里的值别加引号：这条管道会把引号一起存进密钥。
6. 部署：`pnpm run cf:deploy`（先加载 `.env.production` 再构建，正式网址才会被打进包里）。
7. 看输出里的 `Total Upload … gzip`：免费版上限 3 MiB（3072 KiB），付费版 10 MiB。离上限不到 10% 就要提醒。

## 部署后
- [ ] DNS：裸域和 www 都有 Cloudflare 的 A 记录。
- [ ] 关键静态资源（音频、IndexNow key 文件）都是 200。
- [ ] `/api/config/public`：登录开关、AI 服务商、原声网址等都对。只剩默认值 = 没读到数据库。
- 之后在后台改配置：D1 下配置不缓存，写完立刻生效。

## 回退
- 改坏了：`npx wrangler deployments list` 找到上一个版本，`npx wrangler rollback <版本 ID>`。
- `wrangler rollback` 只回滚 Worker 代码，不回滚 D1。所以迁移要兼容上一个版本。
- 数据坏了：先导出现状 `npx wrangler d1 export <db> --remote --output=backup.sql`，再 `npx wrangler d1 time-travel restore <db> --bookmark=<迁移前记下的 bookmark>`。恢复后，那之后写入的数据都没了。
- 第一次部署想下线：Cloudflare 后台 → Workers → 这个 Worker → Domains，移除两个自定义域名。

## 踩过的坑
| 现象 | 原因 / 做法 |
|---|---|
| 本地 dev 报 `Failed to load url ./en.js` | 生产构建覆盖了 dev 的 i18n 生成文件：构建后重启 dev server |
| 安全扫描拦下 `curl -d @secret-file` | 被当成外泄：密钥只在真实登录时验证，或交给 wrangler 管道 |
| 页面全 500 | `AUTH_SECRET` 没设，或 `DATABASE_PROVIDER` 不是 d1 |
| 浏览器登录 403 Invalid origin | 包里打进了 localhost：用 `cf:deploy` 部署，`vars` 里写正式网址 |
| 体积超限部署失败 | 升级付费版，或把重的库改成动态 import、少打进几种语言 |
| `http://` 返回 200 | Worker 默认也响应 http：代码里跳 https（→ `seo-launch`） |
