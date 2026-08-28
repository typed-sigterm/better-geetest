# better-auth-plugin-gt4 ![最新版本](https://img.shields.io/npm/v/%40better-geetest%2Fbetter-auth-plugin-gt4) ![许可证](https://img.shields.io/npm/l/%40better-geetest%2Fbetter-auth-plugin-gt4) ![OSS Lifecycle](https://img.shields.io/osslifecycle?file_url=https%3A%2F%2Fraw.githubusercontent.com%2Ftyped-sigterm%2Fbetter-geetest%2Fmain%2FOSSMETADATA) [![GitHub Stars](https://img.shields.io/github/stars/typed-sigterm/better-geetest)](https://github.com/typed-sigterm/better-geetest)

在 Better Auth 的认证端点前执行极验 GT4 二次校验。

## 安装

```bash
bun add @better-geetest/better-auth-plugin-gt4 better-auth
```

## 服务端

```ts
import { geetestGt4 } from '@better-geetest/better-auth-plugin-gt4';
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  plugins: [geetestGt4({
    captchaId: process.env.GEETEST_CAPTCHA_ID!,
    captchaKey: process.env.GEETEST_CAPTCHA_KEY!,
  })],
});
```

默认保护 `/sign-up/email`、`/sign-in/email`、`/request-password-reset`。可用 `endpoints` 和 `headerName` 覆盖默认值。

## 客户端

```ts
import { geetestGt4Client, geetestGt4Headers } from '@better-geetest/better-auth-plugin-gt4/client';
import { createAuthClient } from 'better-auth/client';

const authClient = createAuthClient({ plugins: [geetestGt4Client()] });

await authClient.signIn.email({
  email,
  password,
  fetchOptions: { headers: geetestGt4Headers(credentials) },
});
```

`credentials` 是 GT4 客户端 SDK `captcha.getValidate()` 的结果；插件会将验证失败返回为 `403`，缺少或格式错误的凭证返回为 `400`，极验服务不可用返回为 `503`。

## 相关项目

- [gt4 客户端 SDK](../gt4-client/README.md)
- [gt4 服务端 SDK](../gt4-server/README.md)
- [示例](../../playground/README.md)
