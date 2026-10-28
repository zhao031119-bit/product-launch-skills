---
name: seo-launch
description: 网站和 SaaS 的 SEO 与 GEO（让 ChatGPT 能推荐你）上线规范：canonical、sitemap、robots、llms.txt、301 跳转（http/www/末尾斜杠）、结构化数据、SaaS 常用页面（定价、对比、替代品、使用场景、答案页）、hreflang、GSC/Bing/IndexNow 提交，附上线后自检脚本。Use when building or auditing SEO, planning comparison, alternatives or answer pages, before submitting a sitemap, or when pages are "not indexed / Page with redirect / Duplicate canonical" ("SEO 优化 / sitemap 不收录 / 跳转问题 / 301 / GEO / 对比页").
---

# SEO / GEO 上线规范

## 1. 每个页面
- [ ] 只有 1 个 canonical，指向自己，和 sitemap 里的网址一字不差。
- [ ] 根布局（root layout）不能给所有页面输出 canonical、og:url、hreflang。
  - 踩过的坑：根布局给每页都输出了 `canonical=/`，加上页面自己的，每页有 2 个 canonical。
- [ ] `<html lang>` 跟着页面语言走。
- [ ] title ≤ 60 字符，搜索词放前面；description ≤ 160 字符。
- [ ] og:title、og:description、og:url、og:image、twitter:card 每页自己的。
- [ ] 不存在的页面返回 404，不要 200（软 404），也不要跳回首页。
- [ ] 关键内容在不执行 JS 的源码里就有：title、H1、正文、canonical、hreflang。搜索引擎第一轮抓取不跑 JS，ChatGPT 等 AI 爬虫基本不跑 JS：只在前端渲染的内容，它们很晚才看到或根本看不到。
- [ ] 一个关键词只由一个页面主攻：几个页面抢同一个词会自相竞争。

## 2. 跳转：只跳一次，用 301
- [ ] http → https。Cloudflare Worker 默认也响应 http，要在代码里跳，别依赖后台开关。
- [ ] www → 裸域（或反过来，选定一个）。
- [ ] 末尾斜杠 `/es/` → `/es`。很多框架默认回 307（临时），要改成 301。
- [ ] 旧路径、旧语言前缀（例 `/zh/...`）→ 新地址。
- [ ] `*.workers.dev` 之类的备用域名 → 主域名。
- [ ] 所有规则合成一跳：`http://www.x.com/zh/es/` 直接 301 到 `https://x.com/es`。
- [ ] 非 GET 请求用 308，POST 不会变成 GET。但 webhook 别靠跳转：Stripe 等不跟随跳转，3xx 直接算投递失败。回调地址在服务商后台填规范网址（https + 主域名 + 无末尾斜杠）。
- [ ] 在 TLS 代理后面，用 `x-forwarded-proto` 判断协议，否则会无限跳。
- [ ] 写成纯函数并加单元测试：sitemap 网址返回 null（不跳），其余写法各跳一次。参考实现：`references/canonical-url.ts`。

## 3. sitemap / robots / llms.txt
- [ ] sitemap 只放会直接返回 200 的规范网址。返回 3xx 的网址会被报"Page with redirect"，不收录。
- [ ] 只有翻译过的页面带 hreflang（`xhtml:link`）；只有英文的页面一个 `<url>` 就够。
- [ ] `lastmod` 用真实的内容更新日期。
- [ ] robots.txt：`Sitemap: https://<域名>/sitemap.xml`（和规范网址完全一致）；屏蔽 /admin、/settings、/api/。
- [ ] robots.txt 放行搜索和 AI 爬虫：Googlebot、Bingbot、OAI-SearchBot、ChatGPT-User、GPTBot、PerplexityBot、ClaudeBot。
- [ ] 注意 `Disallow: /*?*`：带 UTM 的外链就爬不到，canonical 也就看不到。要权衡。
- [ ] llms.txt：页面清单，每个一句话说明，再加关键事实（价格、免费吗、输入和输出、限制）。事实从产品事实文件生成（→ `launch-checklist`）。

## 4. 结构化数据（JSON-LD）
- 全站：WebSite、Organization、WebApplication 或 SoftwareApplication（featureList、价格、inLanguage）。
- 首页：FAQPage（和页面上看得到的 FAQ 一致）、HowTo（3 步）。
- 攻略、答案页、对比页：Article + BreadcrumbList + FAQPage。
- 只写页面上真有的内容，别编。价格（offers）从产品事实文件生成，和定价页一致。
- 别指望 FAQ / HowTo 富结果：Google 2023 年起不再显示 HowTo 富结果，FAQ 富结果只给政府、医疗类权威站。这些 JSON-LD 帮机器读懂页面，写上无妨，但别为它卡上线。

## 5. 内容：给 Google 和 ChatGPT 的答案
- [ ] 首页放"快速回答"事实块：是什么、给谁用、输入和输出、价格、免费吗、要不要注册、支持哪些平台。
- [ ] FAQ 用用户原话提问，第一句就给答案。
- [ ] SaaS 常用的几类页面，按需做：
  - 定价页：每档写清能做什么。
  - 对比页：`<你> vs <竞品>`、`<竞品> alternatives`。列出 ChatGPT 会推荐的那几类替代品（→ `working-with-ai` 的侦察），诚实比较。
  - 使用场景页：`<类别> for <人群或场景>`。
  - 答案页：每个长尾问题一页，每页 5 条 FAQ。例（视频站）："is it free""with your dog""CapCut template""best photo for …"。
  - 有的话：集成页、模板页、文档、更新日志。
- [ ] 每页都要有真内容：只换关键词批量生成的页面，容易被当成低质量内容。
- [ ] 页脚链到这些页面（内链）。
- [ ] 描述要和产品一致（例：手机是"说出来"还是"屏幕上显示"）。改了产品，同步改所有页面。

## 6. 多语言 → `multilingual-site`
hreflang 必须互相指向（每个版本都列出全部版本 + x-default），sitemap 里也一样。

## 7. 上线当天
1. 部署后先跑自检，必须显示 `All clear`：
   ```bash
   node scripts/seo-check.mjs https://<域名>
   # 有要跳走的旧路径前缀（例：以前的 /zh）就加上，可以写多个
   node scripts/seo-check.mjs https://<域名> --legacy-prefix=/zh
   ```
   它会检查：robots（有 Sitemap 行，没把搜索和 AI 爬虫挡在外面）、sitemap（sitemap index 会往下读）、每个网址 200 + 自指 canonical + 没有 noindex、hreflang 目标、http / 另一个主机名（www 或裸域）/ 末尾斜杠 / 旧前缀各一跳 301、未知页面 404。另外给出提示（不算失败）：title 和 description 的长度、`<html lang>`、OG 标签、llms.txt。
2. Google Search Console：添加"网域"资源（一并覆盖 www 和 http），只提交 `https://<域名>/sitemap.xml`。
3. Bing Webmaster Tools：从 GSC 导入网站。ChatGPT 搜索靠 Bing 的索引。
4. IndexNow：`public/` 放 `<key>.txt`，然后运行
   ```bash
   node scripts/indexnow.mjs https://<域名>
   ```
   返回 200 或 202 都是收下了。

脚本在本 skill 的 `scripts/` 目录（Node 18+，零依赖）。可以复制到项目的 `scripts/` 下，也可以直接用 skill 目录里的路径运行。indexnow 要在项目根目录运行：它读 `./public` 里的 key 文件，或者把那个目录作为第二个参数传进去。

## 踩过的坑
| 现象 | 原因 | 做法 |
|---|---|---|
| 每页 2 个 canonical | 根布局给所有页面输出了首页的 canonical | 只在各页面路由里输出 |
| `/es/` 返回 307 | 框架处理末尾斜杠用临时跳转 | 服务端入口先 301 |
| `http://` 返回 200 | Worker 默认也响应 http | 代码里按 `x-forwarded-proto` 跳 https |
| 跳 3 次才到 | 每条规则各跳一次 | 先算出最终网址，再一次跳过去 |
| sitemap 不收录 | 提交的网址会跳转，或 sitemap 在 www 下而资源是裸域 | sitemap 只放规范网址；GSC 用网域资源 |
