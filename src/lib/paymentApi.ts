function paymentApiBase(): string {
  return (import.meta.env.VITE_PAYMENT_API_BASE_URL || 'http://localhost:5200/api/v1').replace(/\/$/, '');
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { message?: string; error?: { message?: string } };
    if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
    const nested = parsed.error?.message;
    if (typeof nested === 'string' && nested) return nested;
  } catch {
    /* ignore */
  }
  return text || res.statusText;
}

export type CheckoutResponse = {
  checkoutUrl: string;
  code: string;
};

export type CheckoutBirthFields = {
  date: string;
  time: string;
  location: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  displayName?: string;
};

export type CheckoutCouplePayload = {
  personA: CheckoutBirthFields;
  personB: CheckoutBirthFields;
};

export type CheckoutPayload = {
  type?: 'single' | 'double';
  mode: 'single' | 'couple';
  language: 'en' | 'vi';
  single?: CheckoutBirthFields;
  couple?: CheckoutCouplePayload;
};

export async function postCheckout(payload: CheckoutPayload): Promise<CheckoutResponse> {
  const res = await fetch(`${paymentApiBase()}/payment/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<CheckoutResponse>;
}

export type CodeInfoResponse = {
  payload: CheckoutPayload;
};

export type VerifyCodeResult = { valid: boolean; message: string };

export async function postVerifyCode(code: string): Promise<VerifyCodeResult> {
  const res = await fetch(`${paymentApiBase()}/code/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  let body: { valid?: boolean; message?: string } = {};
  try {
    body = (await res.json()) as { valid?: boolean; message?: string };
  } catch {
    /* ignore */
  }
  if (res.ok && body.valid === true) {
    return { valid: true, message: 'Mã đã xác thực thành công.' };
  }
  const message =
    typeof body.message === 'string' && body.message.trim()
      ? body.message
      : res.statusText || 'Mã không hợp lệ.';
  return { valid: false, message };
}

export async function getCodeInfo(code: string): Promise<CodeInfoResponse> {
  const q = encodeURIComponent(code);
  const res = await fetch(`${paymentApiBase()}/code/info?code=${q}`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<CodeInfoResponse>;
}

export async function postCodeUse(code: string): Promise<void> {
  const res = await fetch(`${paymentApiBase()}/code/use`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}
