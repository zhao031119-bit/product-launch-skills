---
name: multilingual-homepage
description: 网站多语言的规范：在首页本身切换语言（/es、/de…，带语言按钮），而不是另做简化落地页；只按 URL 定语言；hreflang 和 SEO；用 AI 批量翻译（翻译说明 + 自动检查脚本 + 截图验收）。Use when adding languages, a language switcher, hreflang, or translating UI strings ("多语言 / 翻译首页 / 语言切换 / i18n / hreflang").
---

# 多语言首页

## 原则
- 翻译的是首页本身：同一个版式、同一个生成器，只是换了语言。
  - 不要另做一个简化的语言页，再把按钮链回英文首页。用户会觉得"老在跳"。
- 每种语言一个网址：`/`（英文）、`/es`、`/pt`、`/fr`、`/de`、`/it`。Google 要靠不同网址才能收录各语言。
- 只按 URL 决定语言。不按 cookie、不按浏览器语言自动跳：对爬虫和用户都不跳。
- 切换语言会刷新一次页面，但停在同一个页面。
- 可以只翻首页。攻略、价格、条款保持英文。

## 只翻首页时的导航
- [ ] 翻译版的头部菜单只放本页锚点（`#how-it-works`、`#pricing`、`#faq`），不链到英文页面。
- [ ] 翻译版里藏掉"阅读全文"这种指向英文文章的链接，或者改成本页锚点。
- [ ] 在英文页面上选别的语言 → 打开那种语言的首页（因为这页没有翻译）。
- [ ] 页脚语言链接用普通 `<a href>`（整页加载）。
  - 坑：框架路由会把站内链接 `/es` 按当前语言重写回 `/`。

## SEO
- [ ] 每个语言版：canonical 指向自己，`<html lang>` 对，`og:locale` 对（例 `es_LA`、`pt_BR`）。
- [ ] hreflang 互相指向：每个版本都列出 en、es、pt、fr、de、it 和 x-default（指英文）。
- [ ] sitemap 里语言版带同一组 `xhtml:link`；英文专属页面不带。
- [ ] 每种语言自己的 title 和 description，用当地的搜索说法。
- [ ] 结构化数据（FAQPage、HowTo）跟着语言走。

## AI 批量翻译流程
1. 收集首页真正用到的文案 key：从首页和根布局沿 import 往下找（`scripts/collect-keys.cjs`）。别全量翻译。
2. 写一份翻译说明：模板见 `references/translation-brief.md`。要点：
   - 产品事实（价格、点数、有没有免费）。
   - 不翻译的词：品牌名、平台名、格式（MP4、9:16、480p）、套餐名。
   - 视频里说的原话保持原语言（例：原声是英文，台词就留英文）。
   - 语气：口语、短句、非正式的"你"。
   - 当地用词：西语用拉美说法（video 不写 vídeo，celular，computadora）；德语用 du；法语在 « » ? ! : ; 前用不换行空格。
   - 按钮、标签、表格单元格不能比英文长太多。
3. 一种语言一个 AI 助手，同时跑。
4. 每份结果跑检查脚本，FAIL 全部修掉：
   ```bash
   node scripts/check-translation.cjs en-home.json out/es.json es rules.json
   ```
   检查：key 一个不少、占位符 `{name}` 一致、品牌词还在、没有禁用词、原文没说免费的地方不写免费、短标签别超长、SEO 标题 ≤ 60。
5. 合并：按英文文件的 key 顺序写进 `messages/<lang>.json`。没翻的 key 自动回退英文。
6. 截图验收：手机 390 宽 + 电脑 1280 宽。先看德语，它最长。
   - 常见问题：标题里的引号掉到下一行；示例视频名字还是英文（写在配置里，不在文案里）；某个链接跳到英文页。
7. 改了产品（例：6 个场景变 5 个），所有语言一起改。

## Paraglide（TanStack Start / Vite）专门的坑
- `urlPatterns` 只给 `/` 配语言前缀，别的页面只有英文规则 → 别的页面不会生成 `/es/...`。
- 某种语言缺的 key 自动回退基础语言。
- `vite build` 和 `vite dev` 共用 `src/paraglide` 输出目录：跑完生产构建，要重启 dev server，否则报 `Failed to load url ./en.js`。
- 每条消息的所有语言都会打进包里：6 种语言首页文案，服务端消息块约多 400 KB（gzip）。注意 Worker 体积上限（→ `cloudflare-deploy-checklist`）。
