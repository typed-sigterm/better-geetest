# Better GeeTest Playground

使用 Nitro v3 + Better Auth + Bun SQLite 的真实认证示例：浏览器通过客户端 SDK 验证，`signUp.email` 请求携带 GT4 凭证，Better Auth 插件在真实认证端点前执行二次校验。

## 运行

```bash
cp .env.example .env
bun install
bun run --cwd packages/gt4-client build
bun run --cwd packages/gt4-server build
bun run --cwd playground db:migrate
bun run --cwd playground dev
```

在 `.env` 中设置 `VITE_GEETEST_CAPTCHA_ID` 和 `GEETEST_CAPTCHA_KEY`。后者只在 Nitro 路由中读取，绝不能以 `VITE_` 前缀暴露给浏览器。

用户、session、account、verification 数据保存在 `DATABASE_PATH` 指定的本地 SQLite 文件中。Better Auth CLI 生成的 SQL 是认证表结构的唯一来源，提交在 `server/db/migrations/`，`db:migrate` 使用 Bun 内置的 `bun:sqlite` 在启动前幂等执行，并通过 `_migrations` 表记录已应用的 migration。

## Schema 与迁移

本示例选择直接把 `bun:sqlite` 连接传给 Better Auth，因此不再引入 Drizzle，也不应该同时让 Drizzle 管理这些认证表。认证配置变化或新增 Better Auth 插件后重新生成 SQL，并将变更作为新的、有序的 `.sql` migration 审查和提交；不要覆盖已经应用的 migration。

```bash
bun run --cwd playground gen-auth-schema
bun run --cwd playground db:migrate
```

生成器输出的是 SQL，不是 TypeScript，所以文件扩展名使用 `.sql`。生产环境应在部署阶段显式运行 migration，并让应用以同一个 `DATABASE_PATH` 启动；不要在每个请求中执行 schema 初始化。

## 相关项目

- [客户端 SDK](../packages/gt4-client/README.md) 负责加载和操作验证码。
- [服务端 SDK](../packages/gt4-server/README.md) 负责二次校验。
- [Better Auth 插件](../packages/better-auth-plugin-gt4/README.md) 负责在认证端点前强制校验。
