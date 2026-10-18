# Paper Tender

Коллекция банкнот: колесо названий, бесконечная сетка и отдельная страница каждой купюры с 3D-купюрой, которую можно перевернуть.
Сделана на обычных HTML, CSS и JS без сборщика: Three.js 0.186.1, GSAP 3.15 и Lenis 1.3.26 подключаются через importmap с jsDelivr.

```
npx serve banknotes
```

- `index.html`: разметка, importmap и текстовый список, который видят скринридеры и браузеры без WebGL.
- `data.js`: купюры и подписи интерфейса на русском и английском. Чтобы добавить оборот, укажи у купюры поле `back`.
- `main.js`: сцена, смена поверхности купюры, страница купюры, язык. Числа вынесены в `CONFIG`.
- `views.js`: колесо и сетка.
- `styles.css`: все цвета и размеры заданы в CSS-переменных в `:root`.
- `assets/objects/`: картинки купюр, `assets/noise.png` — текстура шума.

## Хостинг на Vercel и курсы валют

Сайт статический, плюс одна серверная функция `api/rates.js`. Она берёт курсы из Open Exchange Rates и кэширует их на час.

1. Зарегистрируйся на openexchangerates.org (бесплатного тарифа хватает) и скопируй App ID.
2. На vercel.com → Add New → Project → импортируй репозиторий `pycuk-ux/line-noise-studio`.
3. Root Directory: `banknotes`. Framework Preset: Other. Build Command и Output Directory оставь пустыми.
4. Settings → Environment Variables: `OXR_APP_ID` = твой App ID.
5. Deploy. Проверить функцию: `https://<проект>.vercel.app/api/rates`.

Браузер обращается к `/api/rates` только на хостах из `RATES.hosts` в `rates.js`. Если подключишь свой домен, добавь его туда.
