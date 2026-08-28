# @better-geetest/gt4-client ![最新版本](https://img.shields.io/npm/v/%40better-geetest%2Fgt4-client) ![许可证](https://img.shields.io/npm/l/%40better-geetest%2Fgt4-client) ![OSS Lifecycle](https://img.shields.io/osslifecycle?file_url=https%3A%2F%2Fraw.githubusercontent.com%2Ftyped-sigterm%2Fbetter-geetest%2Fmain%2FOSSMETADATA) [![GitHub Stars](https://img.shields.io/github/stars/typed-sigterm/better-geetest)](https://github.com/typed-sigterm/better-geetest)

社区维护的 [极验行为验证第四代](https://docs.geetest.com/gt4/overview/prodes) 的客户端 SDK。匹配官方 SDK v4.2.1。

## 安装

```bash
npm install @better-geetest/gt4-client # 或其他包管理器
```

## 使用

```ts
import { createCaptcha } from '@better-geetest/gt4-client';

const captcha = await createCaptcha({
  captchaId: 'your-captcha-id',
  product: 'bind',
  riskType: 'slide',
});

captcha.onSuccess(async () => {
  const credentials = captcha.getValidate();
  if (!credentials)
    return;
  const result = await fetch('/api/verify', {
    body: JSON.stringify(credentials),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  // ...
});

document.querySelector('#verify')?.addEventListener('click', () => captcha.showBox());
```

> [!IMPORTANT]
>
> **注意**：一个页面只能初始化一个 GeeTest CAPTCHA 实例！
>
> 同一页面多次调用 `createCaptcha()` 会导致竞态条件和安全风险。如果确实需要多个验证场景，请使用 `reset()` 重置现有实例或复用验证码控制器。
> 
> SSR/SSG 环境下请确保只在客户端浏览器中初始化。

## 相关项目

- [服务端 SDK](../gt4-server/README.md)
- [Better Auth 插件](../better-auth-plugin-gt4/README.md)
