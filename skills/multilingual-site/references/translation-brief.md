# 翻译说明模板（发给每个翻译助手）

把 `<…>` 换成你的项目内容。一种语言开一个助手，同时跑。

```markdown
# Translate <产品名>'s <页面或界面，例 homepage> into one language

Files:
- Input, English: <path>/en-home.json (<N> keys)
- Output: <path>/out/<lang>.json — the SAME keys, translated values, 2-space JSON, UTF-8.
- Checker: `node check-translation.cjs en-home.json out/<lang>.json <lang> rules.json` — must end with PASS.
  Fix every FAIL. Read every WARN and fix it unless you have a reason (report the reason).
- Approved terms for your language (read first, reuse its wording): <参考文件，可选>

Do not edit anything in the project. Only write your output file.

## The product
<两三句：输入什么、输出什么、多长、什么格式、有没有水印、多久出片>
Prices: <套餐和点数，从产品事实文件抄>. There is NO free <产品>. (如果真有免费，就照实写)

Key prefixes tell you where a string shows: <nav/hero = 首屏; compare = 表格; faq = 问答; …>

## Rules
1. Same keys. Keep every `{placeholder}` exactly; you may move it inside the sentence.
2. Never translate: <品牌名、平台名、格式、套餐名、话题标签、邮箱、网址>.
3. These stay in <原语言>: <要保留原文的内容，例：视频里说的台词、代码、命令>. Use your language's normal quotes.
4. <只有英文的页面名> stays in English, in local quotes. Keys starting with <settings./admin.> stay unchanged.
5. Honest copy: never say or imply something is free unless the English says "free".
6. Never write: <禁用词及其各语言译法>.
7. Short UI strings (buttons, labels, chips, nav, table cells): about as short as the English. The checker warns when one is longer than both 1.6× the English and the English + 12 characters.
8. Tone: casual, short sentences, informal "you".
9. Keep prices, numbers and units exactly as in English.
10. SEO title ≤ 60 characters, description ≤ 160; keep the main keyword.

## Per language
- es: Latin American Spanish ("video", "celular", "computadora", "ustedes"). Quotes « ».
- pt: Brazilian Portuguese ("você", "celular"). Quotes “ ”.
- fr: "tu". Quotes « » with a no-break space inside; no-break space before ? ! : ;
- de: "du". Quotes „ “.
- it: "tu". Quotes « ».

When the checker says PASS, reply with the output path, the PASS line, and each WARN you kept with a one-line reason.
```

## 合并以后
- 法语：把 `« ` / ` »` / ` ?` 等里的普通空格换成不换行空格（U+00A0）。
- 引号风格统一（例：葡语只用 “ ”）。
- 写在配置里的文字（例：示例名、套餐名）不在文案文件里，要单独加 key 并翻译。
