---
name: auth-and-accounts
description: SaaS 的登录和账号：选登录方式（Google、邮箱验证码 / 魔法链接、GitHub）、Google 登录和 One Tap 的完整配置（回调地址、JS 来源、发布应用、密钥加密、怎么验证）、发信域名、账号关联、删除账号、第一个管理员。Use when adding or debugging sign-in, Google OAuth / One Tap, magic links or verification emails, account deletion or admin roles ("加 Google 登录 / 登录不了 / redirect_uri_mismatch / access blocked / 验证邮件收不到 / 管理员").
---

# 登录与账号

## 1. 选登录方式
- To C：Google 登录（加 One Tap）为主，邮箱验证码或魔法链接兜底。
- 开发者工具：再加 GitHub。B2B：Google + 邮箱；大客户要 SSO 时再加。
- 尽量不做密码登录：做了就得做找回密码、限流、撞库防护。
- 邮件登录要能收到信：用专门的发信服务，发信域名配好 SPF、DKIM、DMARC；上线前给 Gmail、Outlook 各发一封，看进不进收件箱。

## 2. Google 登录 + One Tap

### Google Cloud（Google Auth Platform）
- [ ] 新建 OAuth 客户端，类型选 Web application。
- [ ] Authorized JavaScript origins：`https://<域名>`。要本地测试，再加 `http://localhost:3000`。
- [ ] Authorized redirect URIs：`https://<域名>/api/auth/callback/google`。本地测试再加 `http://localhost:3000/api/auth/callback/google`。
- [ ] Branding：应用名、Logo、隐私政策和服务条款网址、授权域名。
- [ ] Audience → **Publish app**。不发布，只有测试用户能登录，其他人会看到 403 access_denied。
- [ ] 记下 Client ID（公开）和 Client Secret（保密）。

### 存到网站里
- [ ] Client Secret 存进后台设置（数据库 config 表），加密保存。
  - 加密钥匙（例 `CONFIG_ENCRYPTION_KEY`）一旦设好就别换，换了旧密文就解不开。
- [ ] 秘密文件（例 `.env.production.secrets`）加进 `.gitignore`，权限 600。
- [ ] 打开 Google 登录开关和 One Tap 开关。
- [ ] better-auth 之类的库：`trustedOrigins` 用正式域名。

### 怎么验证
- 回调地址：只用 Client ID 就能测（打开授权网址，看会不会报 `redirect_uri_mismatch`）。
- Client Secret：只能靠一次真实登录来验证。
  - 别用 curl 把密钥发到 token 接口去试；安全扫描会当成外泄拦下。
- 上线后：`POST /api/auth/sign-in/social`（provider=google，带正式域名的 Origin 头）返回的网址里，`redirect_uri` 应该是正式域名。
- 第一次真实登录成功后，查数据库：用户 `email_verified=1`，账号的 provider 是 `google`。

## 3. 账号规则
- 账号关联：不要自动关联账号，保留邮箱验证。要关联，只在两边的邮箱都验证过时才关联。
- 删除账号：设置页里用户能自己删；删掉或匿名化这个用户的数据，订单记录按法律要求保留。隐私政策写清楚（→ `compliance-and-copy`）。
- 改了用户的角色或权限：旧会话里还是旧权限，要退出再登录（或者服务端让旧会话失效）。

## 4. 隐私和 Cookie 政策
- [ ] 隐私政策：写明用了哪些登录方式、拿到哪些信息（例 Google：姓名、邮箱、头像）。
- [ ] Cookie 政策：One Tap 提示框在用户点击前就可能设置 Cookie，要写明。
- [ ] 改了就更新"最后更新"日期。

## 5. 第一个管理员
1. 自己先用正常方式登录一次（例 Google）。
2. 把这个用户加上管理员角色（D1 / SQLite 例）：
   ```sql
   INSERT INTO user_role (id, user_id, role_id)
   SELECT lower(hex(randomblob(16))), u.id, r.id
   FROM user u, role r
   WHERE u.email = '<你的邮箱>' AND r.name = 'super_admin'
     AND NOT EXISTS (
       SELECT 1 FROM user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id
     );
   ```
   重复执行也不会多插一行（不依赖表上有没有唯一约束）。
3. 进后台报 403，就退出再登录（旧会话里还没有新角色）。

这样不用在聊天里发密码，也顺便验证了登录配置。

## 踩过的坑
| 现象 | 原因 |
|---|---|
| 本地登录报 `redirect_uri_mismatch` | localhost 回调没加到 Google 后台 |
| 本地接口报 origin 不对 | 用 `127.0.0.1` 打开的，配置的是 `localhost` |
| 别人登录报 access_denied | 应用还没 Publish |
| One Tap 不弹 | JS 来源没加这个域名，或者用户之前关掉过 |
