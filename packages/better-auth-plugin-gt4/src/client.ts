import type { BetterAuthClientPlugin } from 'better-auth/client';
import type { geetestGt4, GeetestGt4Credentials } from './index';

/** Create the header map expected by the {@link geetestGt4} server plugin. */
export function geetestGt4Headers(credentials: GeetestGt4Credentials): HeadersInit {
  return { 'x-geetest-gt4': JSON.stringify(credentials) };
}

/** Client companion that enables Better Auth plugin type inference. */
export function geetestGt4Client() {
  return {
    id: 'geetest-gt4',
    $InferServerPlugin: {} as ReturnType<typeof geetestGt4>,
  } satisfies BetterAuthClientPlugin;
}
