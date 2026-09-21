import type { HumanVerification } from "../ports";

// No captcha in the MVP (the prototype's fake captcha was removed): the token is always null.
// A Turnstile or hCaptcha adapter will implement the same port later.
export function createNoopHumanVerification(): HumanVerification {
  return {
    async getToken() {
      return null;
    },
  };
}
