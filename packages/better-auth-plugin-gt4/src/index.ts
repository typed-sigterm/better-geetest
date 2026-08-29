import type { CaptchaVerification } from '@better-geetest/gt4-server';
import type { BetterAuthPlugin } from 'better-auth';
import { GeetestRequestError, GeetestVerifier } from '@better-geetest/gt4-server';

export const GEETEST_GT4_HEADER = 'x-geetest-gt4';

export const DEFAULT_PROTECTED_ENDPOINTS = [
  '/sign-up/email',
  '/sign-in/email',
  '/request-password-reset',
] as const;

export interface GeetestGt4PluginOptions {
  captchaId: string
  captchaKey: string
  endpoints?: readonly string[]
  headerName?: string
  timeout?: number
}

export type GeetestGt4Credentials = CaptchaVerification;

function normalizePath(pathname: string, basePath: string): string {
  const relativePath = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  return `/${relativePath}`.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
}

function matches(pathname: string, pattern: string): boolean {
  const expression = pattern
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replaceAll('**', '.*')
    .replaceAll('*', '[^/]*');
  return new RegExp(`^${expression}$`).test(pathname);
}

function isCredentials(value: unknown): value is CaptchaVerification {
  if (typeof value !== 'object' || value === null)
    return false;
  const credentials = value as Record<string, unknown>;
  return ['captcha_output', 'gen_time', 'lot_number', 'pass_token'].every(key => typeof credentials[key] === 'string');
}

function reject(status: number, code: string, message: string): { response: Response } {
  return { response: Response.json({ code, message }, { status }) };
}

/**
 * Protect Better Auth endpoints with GeeTest CAPTCHA v4 second verification.
 *
 * Browsers send the result of `captcha.getValidate()` as JSON in the
 * `x-geetest-gt4` header before invoking a protected Better Auth endpoint.
 */
export function geetestGt4(options: GeetestGt4PluginOptions) {
  const verifier = new GeetestVerifier({
    captchaId: options.captchaId,
    captchaKey: options.captchaKey,
    timeout: options.timeout,
  });
  const endpoints = options.endpoints?.length ? options.endpoints : DEFAULT_PROTECTED_ENDPOINTS;
  const headerName = options.headerName ?? GEETEST_GT4_HEADER;

  return {
    id: 'geetest-gt4',
    onRequest: async (request, context) => {
      const path = normalizePath(new URL(request.url).pathname, context.options.basePath ?? '/api/auth');
      if (!endpoints.some(endpoint => matches(path, endpoint)))
        return;

      const serializedCredentials = request.headers.get(headerName);
      if (!serializedCredentials) {
        return reject(400, 'GEETEST_GT4_MISSING_CREDENTIALS', 'Missing GeeTest GT4 credentials');
      }

      let credentials: unknown;
      try {
        credentials = JSON.parse(serializedCredentials);
      } catch {
        return reject(400, 'GEETEST_GT4_INVALID_CREDENTIALS', 'Invalid GeeTest GT4 credentials');
      }
      if (!isCredentials(credentials)) {
        return reject(400, 'GEETEST_GT4_INVALID_CREDENTIALS', 'Invalid GeeTest GT4 credentials');
      }

      try {
        const result = await verifier.verify(credentials);
        if (result.result !== 'success') {
          return reject(403, 'GEETEST_GT4_VERIFICATION_FAILED', result.reason ?? 'GeeTest GT4 verification failed');
        }
      } catch (error) {
        context.logger.error(error instanceof Error ? error.message : 'GeeTest GT4 verification failed', { error });
        const message = error instanceof GeetestRequestError ? 'GeeTest GT4 service is unavailable' : 'GeeTest GT4 verification failed';
        return reject(503, 'GEETEST_GT4_SERVICE_UNAVAILABLE', message);
      }
    },
    options,
  } satisfies BetterAuthPlugin;
}
