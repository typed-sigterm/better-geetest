/** 匹配的原 SDK 版本号 */
export const SDK_VERSION = '4.2.1';
/** 匹配的原 SDK SHA256 哈希值 */
export const SDK_SHA256 = '449261e14e6b2880fe8711561e7c3cbfa79db3ed393117068ef2e403e03c0b1f';

export type CaptchaProduct = 'bind' | 'float' | 'popup';
export type CaptchaLanguage = 'ara' | 'deu' | 'eng' | 'fra' | 'ind' | 'jpn' | 'kor' | 'pon' | 'por' | 'rus' | 'spa' | 'udm' | 'zho' | 'zho-hk' | 'zho-tw';
export type HiddenControl = 'close' | 'refresh';
export interface NativeButtonOptions {
  height?: string
  width?: string
}
export interface CaptchaMaskOptions {
  bgColor?: string
  outside?: boolean
}

/**
 * 验证成功后由 `Captcha#getValidate` 返回的凭证。
 * 将此对象发送到你的服务器，用于 GeeTest 要求的二次验证。
 *
 * @see {@link https://docs.geetest.com/gt4/apirefer/api/web/ GeeTest GT4 Web API}
 */
export interface CaptchaVerification {
  captcha_id: string
  captcha_output: string
  gen_time: string
  lot_number: string
  pass_token: string
}

/** 加载器或 GeeTest 报告的验证码运行时错误 */
export interface CaptchaError {
  code: string
  desc?: { detail?: string, [key: string]: unknown }
  msg: string
}

/**
 * 由 {@link createCaptcha} 返回的验证码控制器。
 *
 * @see {@link https://docs.geetest.com/gt4/apirefer/api/web/ GeeTest GT4 Web API}
 */
export interface Captcha {
  /** 将 `embed` 验证码挂载到元素或选择器中 */
  appendTo: (container: string | HTMLElement) => void
  /** 销毁验证码 UI */
  destroy: () => void
  /** 获取当前验证凭证（仅在验证成功时有值） */
  getValidate: () => CaptchaVerification | undefined
  /** 订阅关闭事件 */
  onClose: (listener: () => void) => Captcha
  /** 订阅验证码运行时错误 */
  onError: (listener: (error: CaptchaError) => void) => Captcha
  /** 订阅验证失败 */
  onFail: (listener: (error?: unknown) => void) => Captcha
  /** 当 GeeTest 准备好下一个挑战时触发 */
  onNextReady: (listener: () => void) => Captcha
  /** 当验证码可以进行交互时触发 */
  onReady: (listener: () => void) => Captcha
  /** 订阅验证成功 */
  onSuccess: (listener: () => void) => Captcha
  /** 请求一个新的验证码挑战 */
  reset: () => void
  /** 打开 `bind` 验证码弹窗 */
  showBox: () => void
}

/**
 * {@link createCaptcha} 的配置选项。
 *
 * @see {@link https://docs.geetest.com/gt4/apirefer/api/web/ GeeTest GT4 Web API}
 */
export interface CreateCaptchaOptions {
  /** 从 GeeTest 控制台获取的验证码 ID */
  captchaId: string
  /** 中止初始化并移除待处理的加载脚本 */
  signal?: AbortSignal
  /** 验证码展示模式 */
  product?: CaptchaProduct
  /** GeeTest 中配置的业务风险类型 */
  riskType?: string
  /** GeeTest 界面语言，默认根据浏览器语言确定 */
  language?: CaptchaLanguage
  /** 触发按钮的宽高样式 */
  nativeButton?: NativeButtonOptions
  /** 验证码整体缩放比例 */
  rem?: number
  /** 协议头；混合开发或本地文件场景应显式设置 */
  protocol?: 'http://' | 'https://'
  /** 隐藏后续验证界面的指定按钮 */
  hideBar?: readonly HiddenControl[]
  /** popup 与 bind 模式的遮罩配置 */
  mask?: CaptchaMaskOptions
  /** 固定后续验证弹窗宽度 */
  nextWidth?: string
  /** 在 bind 模式隐藏验证成功弹窗 */
  hideSuccess?: boolean
  /** 覆盖默认宕机处理的回调 */
  offlineCb?: () => void
  /** 初始化前的错误回调 */
  onError?: (error: CaptchaError) => void
  /** 传递给 GeeTest 的用户自定义信息 */
  userInfo?: string
  /** 请求超时时间（毫秒），默认为 `10000` */
  timeout?: number
  /** 覆盖 API 源地址，用于私有化部署或测试 */
  apiServers?: readonly string[]
  /** 覆盖静态资源源地址，用于私有化部署或测试 */
  staticServers?: readonly string[]
}

interface LoadResponse extends Record<string, unknown> {
  bypass?: string
  gctPath?: string
  js?: string
  staticPath?: string
  staticServers?: string[]
  status?: string
  type?: string
}

interface VendorWindow extends Window {
  Geetest4?: new (options: Record<string, unknown>) => Captcha
}

const apiServers = ['gcaptcha4.geetest.com', 'gcaptcha4.geevisit.com', 'gcaptcha4.gsensebot.com'];
const staticServers = ['static.geetest.com', 'static.geevisit.com'];
const scriptCache = new Map<string, Promise<void>>();

function browserWindow(): VendorWindow {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    throw new Error('GeeTest CAPTCHA can only be initialized in a browser');
  return window as VendorWindow;
}

function errorFrom(code: string, detail: string): CaptchaError {
  return { code, msg: 'GeeTest resource failed to load', desc: { detail } };
}

function camelCase(value: string): string {
  return value.replace(/_([a-z])/gi, (_, character: string) => character.toUpperCase());
}

function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(camelizeKeys);
  if (value === null || typeof value !== 'object' || value instanceof Date || value instanceof RegExp)
    return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [camelCase(key), camelizeKeys(nestedValue)]),
  );
}

function urlFor(origin: string, path: string, parameters?: Record<string, string | undefined>): string {
  const base = new URL(origin.includes('://') ? origin : `https://${origin}`);
  const url = new URL(path, base);
  for (const [name, value] of Object.entries(parameters ?? {})) {
    if (value !== undefined)
      url.searchParams.set(name, value);
  }
  return url.href;
}

function abortError(): DOMException {
  return new DOMException('GeeTest initialization was aborted', 'AbortError');
}

function loadScript(url: string, timeout: number, signal?: AbortSignal): Promise<void> {
  const host = browserWindow();
  if (signal?.aborted)
    return Promise.reject(abortError());

  return new Promise((resolve, reject) => {
    const script = host.document.createElement('script');
    let timer: number | undefined;

    const finish = (error?: unknown) => {
      // eslint-disable-next-line ts/no-use-before-define
      cleanup();
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve();
      }
    };
    const onAbort = () => finish(abortError());
    const cleanup = () => {
      if (timer !== undefined)
        host.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      script.onerror = null;
      script.onload = null;
    };

    script.async = true;
    // script.charset = 'UTF-8';
    if (/static\.geetest\.com/.test(url))
      script.crossOrigin = 'anonymous';
    script.onerror = () => finish(new Error(`Failed to load ${url}`));
    script.onload = () => finish();
    timer = host.setTimeout(() => finish(new Error(`Timed out loading ${url}`)), timeout);
    signal?.addEventListener('abort', onAbort, { once: true });
    script.src = url;
    host.document.head.append(script);
  });
}

function jsonp(url: string, timeout: number, signal?: AbortSignal): Promise<LoadResponse> {
  const host = browserWindow();
  if (signal?.aborted)
    return Promise.reject(abortError());

  const callbackName = `geetest_${Date.now() + Math.floor(Math.random() * 10_000)}`;
  const callbackHost = host as unknown as Record<string, unknown>;

  return new Promise((resolve, reject) => {
    const script = host.document.createElement('script');
    let timer: ReturnType<typeof host.setTimeout> | undefined;

    const finish = (value?: LoadResponse, error?: unknown) => {
      // eslint-disable-next-line ts/no-use-before-define
      cleanup();
      if (error)
        reject(error);
      else if (value)
        resolve(value);
    };
    const callback = (value: LoadResponse & { data?: LoadResponse }) => {
      finish(camelizeKeys(value.status === 'success' && value.data ? value.data : value) as LoadResponse);
    };
    const onAbort = () => finish(undefined, abortError());
    const cleanup = () => {
      if (timer !== undefined)
        host.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      script.remove();
      if (callbackHost[callbackName] === callback)
        delete callbackHost[callbackName];
    };

    callbackHost[callbackName] = callback;
    script.async = true;
    script.onerror = () => finish(undefined, new Error(`Failed to load ${url}`));
    timer = host.setTimeout(() => finish(undefined, new Error(`Timed out loading ${url}`)), timeout);
    signal?.addEventListener('abort', onAbort, { once: true });
    const src = new URL(url);
    src.searchParams.set('callback', callbackName);
    script.src = src.href;
    host.document.head.append(script);
  });
}

function cacheScript(url: string, timeout: number, signal: AbortSignal): Promise<void> {
  const promise = loadScript(url, timeout, signal).catch((error: unknown) => {
    scriptCache.delete(url);
    throw error;
  });
  scriptCache.set(url, promise);
  return promise;
}

async function raceUrls<Result>(
  urls: readonly string[],
  load: (url: string, signal: AbortSignal) => Promise<Result>,
  signal?: AbortSignal,
  abortLosers = true,
): Promise<Result> {
  if (urls.length === 0)
    throw new Error('No GeeTest servers are configured');
  if (signal?.aborted)
    throw abortError();

  const controllers = urls.map(() => new AbortController());
  const signals = controllers.map(controller => signal ? AbortSignal.any([signal, controller.signal]) : controller.signal);

  try {
    return await Promise.any(urls.map((url, index) => load(url, signals[index]!)));
  } catch (error) {
    if (signal?.aborted)
      throw abortError();
    throw error;
  } finally {
    if (abortLosers) {
      for (const controller of controllers)
        controller.abort();
    }
  }
}

async function loadFirst(urls: readonly string[], timeout: number, signal?: AbortSignal): Promise<void> {
  await raceUrls(
    urls,
    (url, requestSignal) => scriptCache.get(url) ?? cacheScript(url, timeout, requestSignal),
    signal,
  );
}

async function loadConfig(options: CreateCaptchaOptions, timeout: number, host: Window): Promise<LoadResponse> {
  return raceUrls(
    options.apiServers ?? apiServers,
    (server, signal) => jsonp(
      urlFor(server, 'load', {
        captcha_id: options.captchaId,
        challenge: crypto.randomUUID(),
        client_type: /Mobi/i.test(host.navigator.userAgent) ? 'h5' : 'web',
        lang: options.language ?? host.navigator.language.toLowerCase(),
        risk_type: options.riskType,
        user_info: options.userInfo,
      }),
      timeout,
      signal,
    ),
    options.signal,
    false,
  );
}

function resourcePath(response: LoadResponse): string | undefined {
  if (typeof response.bypass === 'string')
    return response.bypass;
  if (typeof response.staticPath === 'string' && typeof response.js === 'string')
    return `${response.staticPath}${response.js}`;
}

function toError(response: LoadResponse): CaptchaError {
  return {
    code: typeof response.code === 'string' ? response.code : '60204',
    desc: typeof response.desc === 'object' && response.desc !== null ? response.desc as CaptchaError['desc'] : undefined,
    msg: typeof response.msg === 'string' ? response.msg : 'GeeTest initialization failed',
  };
}

/**
 * 创建一个 GeeTest 验证码控制器，不会在 `window` 上安装 SDK API。
 *
 * @throws {CaptchaError | DOMException | Error} 当请求被拒绝、中止或无法加载必需资源时抛出。
 * @see {@link https://docs.geetest.com/gt4/apirefer/api/web/ GeeTest GT4 Web API}
 */
export async function createCaptcha(options: CreateCaptchaOptions): Promise<Captcha> {
  if (!options.captchaId.trim())
    throw new Error('`captchaId` must not be empty');
  if (options.signal?.aborted)
    throw abortError();

  const timeout = options.timeout ?? 10_000;
  const host = browserWindow();
  const response = await loadConfig(options, timeout, host);

  if (response.status === 'error')
    throw toError(response);

  const assets = options.staticServers ?? response.staticServers ?? staticServers;
  if (typeof response.gctPath === 'string') {
    await loadFirst(assets.map(server => urlFor(server, response.gctPath!)), timeout, options.signal);
  }

  const path = resourcePath(response);
  if (!path)
    throw errorFrom('60204', 'GeeTest response did not include a CAPTCHA script path');
  await loadFirst(assets.map(server => urlFor(server, path)), timeout, options.signal);

  if (!host.Geetest4)
    throw errorFrom('60204', 'GeeTest CAPTCHA runtime did not register its constructor');
  return new host.Geetest4({
    ...response,
    ...options,
    apiServers: options.apiServers ?? apiServers,
    captchaId: options.captchaId,
    product: options.product,
    protocol: options.protocol ?? `${host.location.protocol}//`,
    riskType: options.riskType,
    signal: undefined,
    staticServers: assets,
    typePath: '/load',
  });
}
