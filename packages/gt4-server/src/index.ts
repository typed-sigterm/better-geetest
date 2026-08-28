/** GeeTest 验证码 v4 的服务端验证工具 */
export const VALIDATE_ENDPOINT = 'https://gcaptcha4.geetest.com/validate';

/** 浏览器端 GT4 SDK 挑战成功后返回的凭证 */
export interface CaptchaVerification {
  captcha_output: string
  gen_time: string
  lot_number: string
  pass_token: string
}

/** 验证器所有请求共享的配置选项 */
export interface VerifierOptions {
  /** 从 GeeTest 控制台获取的验证码 ID */
  captchaId: string
  /** 从 GeeTest 控制台获取的验证码密钥。请仅在服务端保存 */
  captchaKey: string
  /** 覆盖 GeeTest 验证接口地址，可用于测试 */
  endpoint?: string
  /** 请求超时时间（毫秒），默认为 `5000` */
  timeout?: number
  /** 自定义 fetch 实现，可用于测试或非标准运行时环境 */
  fetch?: typeof globalThis.fetch
}

/** GeeTest 验证接口返回的成功 HTTP 响应 */
export interface VerificationResponse {
  captcha_args?: Record<string, unknown>
  code?: string
  desc?: Record<string, unknown>
  msg?: string
  reason?: string
  result: 'success' | 'fail'
  status: 'success' | 'error'
}

/** 当请求无法完成或 GeeTest 返回格式错误的 JSON 时抛出 */
export class GeetestRequestError extends Error {
  override readonly cause?: unknown;
  readonly status?: number;

  constructor(message: string, options: { cause?: unknown, status?: number } = {}) {
    super(message);
    this.name = 'GeetestRequestError';
    this.cause = options.cause;
    this.status = options.status;
  }
}

function assertNonEmpty(value: string, name: string): void {
  if (!value.trim())
    throw new TypeError(`\`${name}\` must not be empty`);
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function sign(lotNumber: string, captchaKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(captchaKey),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(lotNumber)));
}

function requestSignal(timeout: number, signal?: AbortSignal): AbortSignal {
  if (!signal)
    return AbortSignal.timeout(timeout);
  return AbortSignal.any([signal, AbortSignal.timeout(timeout)]);
}

/**
 * 使用仅服务端的验证码密钥验证 GT4 挑战凭证。
 *
 * @see {@link https://docs.geetest.com/gt4/deploy/server GeeTest GT4 服务端部署}
 */
export class GeetestVerifier {
  #captchaId: string;
  #captchaKey: string;
  #endpoint: string;
  #fetch: typeof globalThis.fetch;
  #timeout: number;

  constructor(options: VerifierOptions) {
    assertNonEmpty(options.captchaId, 'captchaId');
    assertNonEmpty(options.captchaKey, 'captchaKey');
    this.#captchaId = options.captchaId;
    this.#captchaKey = options.captchaKey;
    this.#endpoint = options.endpoint ?? VALIDATE_ENDPOINT;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#timeout = options.timeout ?? 5_000;
  }

  /**
   * 将浏览器端凭证提交至 GeeTest 进行二次验证。
   * 返回 `result: 'fail'` 属于正常的验证响应，仅当请求本身失败时 Promise 才会被拒绝。
   */
  async verify(credentials: CaptchaVerification, options: { signal?: AbortSignal } = {}): Promise<VerificationResponse> {
    assertNonEmpty(credentials.lot_number, 'credentials.lot_number');
    assertNonEmpty(credentials.captcha_output, 'credentials.captcha_output');
    assertNonEmpty(credentials.pass_token, 'credentials.pass_token');
    assertNonEmpty(credentials.gen_time, 'credentials.gen_time');

    const url = new URL(this.#endpoint);
    url.searchParams.set('captcha_id', this.#captchaId);
    const body = new URLSearchParams({
      captcha_output: credentials.captcha_output,
      gen_time: credentials.gen_time,
      lot_number: credentials.lot_number,
      pass_token: credentials.pass_token,
      sign_token: await sign(credentials.lot_number, this.#captchaKey),
    });

    let response: Response;
    try {
      response = await this.#fetch(url, {
        body,
        headers: { accept: 'application/json' },
        method: 'POST',
        signal: requestSignal(this.#timeout, options.signal),
      });
    } catch (cause) {
      throw new GeetestRequestError('GeeTest validation request failed', { cause });
    }

    if (!response.ok) {
      throw new GeetestRequestError(`GeeTest validation request returned HTTP ${response.status}`, { status: response.status });
    }

    try {
      return await response.json() as VerificationResponse;
    } catch (cause) {
      throw new GeetestRequestError('GeeTest validation response was not valid JSON', { cause, status: response.status });
    }
  }
}
