import { geetestGt4Headers } from '@better-geetest/better-auth-plugin-gt4/client';
import { createCaptcha } from '@better-geetest/gt4-client';
import { createAuthClient } from 'better-auth/client';

const authClient = createAuthClient({ baseURL: window.location.origin });
const form = document.querySelector<HTMLFormElement>('#auth-form')!;
const button = document.querySelector<HTMLButtonElement>('#verify')!;
const signOut = document.querySelector<HTMLButtonElement>('#sign-out')!;
const status = document.querySelector<HTMLElement>('#status')!;
const captchaId = import.meta.env.VITE_GEETEST_CAPTCHA_ID;

if (!captchaId) {
  button.disabled = true;
  status.textContent = '请在 .env 设置 VITE_GEETEST_CAPTCHA_ID。';
} else {
  void createCaptcha({ captchaId, product: 'bind' }).then((captcha) => {
    captcha.onSuccess(async () => {
      const credentials = captcha.getValidate();
      if (!credentials)
        return;
      const fields = new FormData(form);
      const result = await authClient.signUp.email({
        email: String(fields.get('email')),
        name: String(fields.get('name')),
        password: String(fields.get('password')),
        fetchOptions: { headers: geetestGt4Headers(credentials) },
      });
      status.textContent = result.error ? `${result.error.code}: ${result.error.message}` : '注册成功，Better Auth session 已建立。';
      captcha.reset();
      if (!result.error) {
        form.hidden = true;
        signOut.hidden = false;
      }
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      captcha.showBox();
    });
    status.textContent = '验证码已就绪';
  }).catch((error) => {
    button.disabled = true;
    status.textContent = `验证码加载失败：${error}`;
  });
}

signOut.addEventListener('click', async () => {
  await authClient.signOut();
  form.hidden = false;
  signOut.hidden = true;
  status.textContent = '已退出登录。';
});
