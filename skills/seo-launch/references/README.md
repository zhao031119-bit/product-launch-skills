# 一跳 301 规则（参考实现）

`canonical-url.ts` 是纯函数：给它请求网址和站点网址，返回该跳去的网址；已经是规范网址就返回 `null`。
`canonical-url.test.ts` 是 vitest 测试，覆盖 http、www 和裸域、workers.dev、末尾斜杠、旧路径前缀、TLS 代理不循环、本地开发不强制 https。在本仓库根目录跑 `npm test` 也会跑它（不用装 vitest）。

## 接到服务端入口（Cloudflare Worker / TanStack Start 例）

```ts
import { canonicalRedirectTarget } from './lib/canonical-url';

function canonicalRedirect(req: Request): Response | null {
  const target = canonicalRedirectTarget(req.url, {
    appUrl: envConfigs.app_url, // 例：https://example.org
    forwardedProto: req.headers.get('x-forwarded-proto'),
    legacyPrefixes: ['/zh'], // 例：以前用过的语言前缀；没有就删掉这行
  });
  if (!target) return null;
  // 308 保留请求方法和 body，POST 不会变成 GET。
  const status = req.method === 'GET' || req.method === 'HEAD' ? 301 : 308;
  return Response.redirect(target, status);
}

export default {
  async fetch(req: Request) {
    const redirect = canonicalRedirect(req);
    if (redirect) return redirect;
    return handler.fetch(req);
  },
};
```

## 按项目改
- `legacyPrefixes` 填以前用过、现在要跳走的路径前缀；没有就不传。还在用的语言别写进去：以后真做了中文版，`/zh` 就不能再跳。
- `/api/` 不处理末尾斜杠：API 客户端不该收到跳转。但 http 和另一个主机名（www 或裸域）上的 `/api/` 请求照样会跳，所以 webhook 一定要在服务商后台填规范网址：Stripe 等不跟随跳转，3xx 直接算投递失败。
- 站点网址是 `https://www.…` 时，裸域一跳到 www；站点网址是裸域时，www 一跳到裸域。别的域名不跳。
