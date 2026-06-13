// Thin wrapper around the Telegram WebApp API with a graceful browser fallback.

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      photo_url?: string;
    };
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openTelegramLink?: (url: string) => void;
  HapticFeedback?: { impactOccurred?: (s: string) => void };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function isInTelegram(): boolean {
  const wa = getWebApp();
  return !!wa && !!wa.initData;
}

export function initTelegram() {
  const wa = getWebApp();
  if (!wa) return;
  try {
    wa.ready();
    wa.expand();
    wa.setHeaderColor?.('#0a0c14');
    wa.setBackgroundColor?.('#0a0c14');
  } catch {
    /* ignore */
  }
}

export function getStartParam(): string | null {
  const wa = getWebApp();
  const fromTg = wa?.initDataUnsafe?.start_param;
  if (fromTg) return fromTg;
  const params = new URLSearchParams(window.location.search);
  return params.get('startapp') ?? params.get('start') ?? null;
}

export function haptic() {
  getWebApp()?.HapticFeedback?.impactOccurred?.('light');
}

/** A stable per-browser dev user so refreshes keep the same identity. */
export function getDevUser() {
  let id = localStorage.getItem('toastup_dev_id');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('toastup_dev_id', id);
  }
  let name = localStorage.getItem('toastup_dev_name');
  if (!name) {
    name = 'Guest ' + id.slice(-3).toUpperCase();
    localStorage.setItem('toastup_dev_name', name);
  }
  return {
    telegramId: id,
    username: name.toLowerCase().replace(/\s+/g, '_'),
    firstName: name,
  };
}
