// Курсы валют к доллару из Open Exchange Rates через функцию /api/rates на Vercel.
// Ключ живёт только на сервере (переменная окружения OXR_APP_ID), в браузер он не попадает.

export const RATES = {
  endpoint: '/api/rates',
  // Запрос идёт только на этих хостах: на claude.ai и при `npx serve` функции /api нет.
  // Добавь сюда свой домен, когда подключишь его к Vercel.
  hosts: ['vercel.app'],
};

let data = null;

export async function loadRates() {
  const host = location.hostname;
  if (!RATES.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  try {
    const res = await fetch(RATES.endpoint);
    if (!res.ok) return null;
    data = await res.json();
    return data;
  } catch {
    return null;
  }
}

// Сколько долларов стоит 1 единица валюты, или null, если курса нет
export function usdPer(code) {
  const perUsd = data?.rates?.[code];
  return perUsd ? 1 / perUsd : null;
}

export const ratesTimestamp = () => data?.timestamp ?? null;
