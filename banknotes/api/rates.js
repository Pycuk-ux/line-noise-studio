// Vercel-функция: берёт последние курсы из Open Exchange Rates и кэширует их на час
// на краю сети. Бесплатный тариф OXR — 1000 запросов в месяц и курсы к USD раз в час;
// с часовым кэшем выходит не больше ~750 запросов в месяц.

export default async function handler(req, res) {
  const appId = process.env.OXR_APP_ID;
  if (!appId) {
    res.status(500).json({ error: 'OXR_APP_ID is not set in the Vercel project settings' });
    return;
  }
  try {
    const upstream = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${appId}`);
    if (!upstream.ok) {
      res.status(502).json({ error: `Open Exchange Rates answered ${upstream.status}` });
      return;
    }
    const { base, timestamp, rates } = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ base, timestamp, rates });
  } catch {
    res.status(502).json({ error: 'Could not reach Open Exchange Rates' });
  }
}
