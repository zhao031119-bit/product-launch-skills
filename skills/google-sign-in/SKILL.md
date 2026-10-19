---
name: google-sign-in
description: 给网站加 Google 登录和 One Tap 的完整步骤：Google Cloud 配置、回调地址和 JS 来源、发布应用、密钥加密保存、隐私政策更新、怎么验证、首个管理员。Use when adding or debugging Google OAuth / Google One Tap / "redirect_uri_mismatch" / "access blocked" / 登录不了 ("加 Google 登录 / OAuth 配置").
---

# Google 登录 + One Tap

## 1. Google Cloud（Google Auth Platform）
- [ ] 新建 OAuth 客户端，类型选 Web application。
- [ ] Authorized JavaScript origins：`https://<域名>`。要本地测试，再加 `http://localhost:3000`。
- [ ] Authorized redirect URIs：`https://<域名>/api/auth/callback/google`。本地测试再加 `http://localhost:3000/api/auth/callback/google`。
- [ ] Branding：应用名、Logo、隐私政策和服务条款网址、授权域名。
- [ ] Audience → **Publish app**。不发布，只有测试用户能登录，其他人会看到 403 access_denied。
- [ ] 记下 Client ID（公开）和 Client Secret（保密）。

## 2. 存到网站里
- [ ] Client Secret 存进后台设置（数据库 config 表），加密保存。
  - 加密钥匙（例 `CONFIG_ENCRYPTION_KEY`）一旦设好就别换，换了旧密文就解不开。
- [ ] 秘密文件（例 `.env.production.secrets`）加进 `.gitignore`，权限 600。
- [ ] 打开 Google 登录开关和 One Tap 开关。
- [ ] better-auth 之类的库：`trustedOrigins` 用正式域名。不要自动关联账号，保留邮箱验证。

## 3. 隐私和 Cookie 政策
- [ ] 隐私政策：写明用 Google 登录，拿到哪些信息（姓名、邮箱、头像）。
- [ ] Cookie 政策：One Tap 提示框在用户点击前就可能设置 Cookie，要写明。
- [ ] 改了就更新"最后更新"日期。

## 4. 怎么验证
- 回调地址：只用 Client ID 就能测（打开授权网址，看会不会报 `redirect_uri_mismatch`）。
- Client Secret：只能靠一次真实登录来验证。
  - 别用 curl 把密钥发到 token 接口去试；安全扫描会当成外泄拦下。
- 上线后：`POST /api/auth/sign-in/social`（provider=google，带正式域名的 Origin 头）返回的网址里，`redirect_uri` 应该是正式域名。
- 第一次真实登录成功后，查数据库：用户 `email_verified=1`，账号的 provider 是 `google`。

## 5. 第一个管理员
1. 自己先用 Google 登录一次。
2. 把这个用户加上 super_admin 角色（D1 例）：
   ```sql
   INSERT OR IGNORE INTO user_role (id, user_id, role_id)
   SELECT lower(hex(randomblob(16))), u.id, r.id
   FROM user u, role r
   WHERE u.email = '<你的邮箱>' AND r.name = 'super_admin';
   ```
3. 进后台报 403，就退出再登录（旧会话里还没有新角色）。

这样不用在聊天里发密码，也顺便验证了 Google 密钥。

## 踩过的坑
| 现象 | 原因 |
|---|---|
| 本地登录报 `redirect_uri_mismatch` | localhost 回调没加到 Google 后台 |
| 本地接口报 origin 不对 | 用 `127.0.0.1` 打开的，配置的是 `localhost` |
| 别人登录报 access_denied | 应用还没 Publish |
| One Tap 不弹 | JS 来源没加这个域名，或者用户之前关掉过 |
