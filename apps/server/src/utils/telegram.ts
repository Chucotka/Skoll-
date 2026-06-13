import crypto from 'node:crypto';

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface ParsedInitData {
  user: TelegramUser;
  authDate?: number;
}

/**
 * Validate Telegram Mini App initData per the official algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string, botToken: string): ParsedInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;

  try {
    const user = JSON.parse(userRaw) as TelegramUser;
    const authDate = params.get('auth_date');
    return { user, authDate: authDate ? Number(authDate) : undefined };
  } catch {
    return null;
  }
}
