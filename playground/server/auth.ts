import process from 'node:process';
import { geetestGt4 } from '@better-geetest/better-auth-plugin-gt4';
import { betterAuth } from 'better-auth';
import { Database } from 'bun:sqlite';

export const auth = betterAuth({
  baseURL: 'https://better-geetest.localhost',
  database: new Database(process.env.DATABASE_PATH ?? './.data/db.sqlite'),
  plugins: [
    geetestGt4({
      captchaId: process.env.VITE_GEETEST_CAPTCHA_ID ?? '',
      captchaKey: process.env.GEETEST_CAPTCHA_KEY ?? '',
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: { joins: true },
  },
});
