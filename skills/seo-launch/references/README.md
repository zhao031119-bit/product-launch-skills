# 一跳 301 规则（参考实现）

`canonical-url.ts` 是纯函数：给它请求网址和站点网址，返回该跳去的网址；已经是规范网址就返回 `null`。
`canonical-url.test.ts` 是 vitest 测试，覆盖 http、www、workers.dev、末尾斜杠、旧 `/zh` 前缀、TLS 代理不循环、本地开发不强制 https。

## 接到服务端入口（Cloudflare Worker / TanStack Start 例）

```ts
import { canonicalRedirectTarget } from './lib/canonical-url';

function canonicalRedirect(req: Request): Response | null {
  const target = canonicalRedirectTarget(req.url, {
    appUrl: envConfigs.app_url, // 例：https://example.org
    forwardedProto: req.headers.get('x-forwarded-proto'),
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
- `/zh` 那条规则是旧语言前缀的例子：换成你的旧路径，或删掉。
- `/api/` 不处理末尾斜杠：API 客户端不该收到跳转。
- 站点网址是 `https://www.…` 时，函数会保留 www，不会反向跳。
