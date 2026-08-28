# @better-geetest/gt4-server ![最新版本](https://img.shields.io/npm/v/%40better-geetest%2Fgt4-server) ![许可证](https://img.shields.io/npm/l/%40better-geetest%2Fgt4-server) ![OSS Lifecycle](https://img.shields.io/osslifecycle?file_url=https%3A%2F%2Fraw.githubusercontent.com%2Ftyped-sigterm%2Fbetter-geetest%2Fmain%2FOSSMETADATA) [![GitHub Stars](https://img.shields.io/github/stars/typed-sigterm/better-geetest)](https://github.com/typed-sigterm/better-geetest)


社区维护的[极验行为验证第四代](https://docs.geetest.com/gt4/overview/prodes) 的服务端 SDK。

## 安装

```bash
npm install @better-geetest/gt4-server # 或其他包管理器
```

## 使用

```ts
import process from 'node:process';
import { GeetestVerifier } from '@better-geetest/gt4-server';

const verifier = new GeetestVerifier({
  captchaId: process.env.GEETEST_CAPTCHA_ID!,
  captchaKey: process.env.GEETEST_CAPTCHA_KEY!,
});

const result = await verifier.verify(credentials);
if (result.result !== 'success')
  throw new Error(result.reason);
```

验证失败会返回 `result: 'fail'`；网络错误、超时、无效 HTTP 响应会抛出 `GeetestRequestError`。更多字段请参考 [GT4 服务端部署文档](https://docs.geetest.com/gt4/deploy/server)。

## 相关项目

- [客户端 SDK](../gt4-client/README.md)
- [Better Auth 插件](../better-auth-plugin-gt4/README.md)
