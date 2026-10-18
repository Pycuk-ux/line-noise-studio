// Заглушка для банкноты, картинки которой ещё нет: бумажный прямоугольник
// с рамкой и кодом валюты. Та же картинка идёт в 3D-сцену и в карточки сетки.

const W = 1024;
const H = 488; // пропорции типичной банкноты ≈ 2.1 : 1
const canvases = new Map(); // id → canvas
const urls = new Map(); // id → data URL

function draw(canvas, item) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e3d9c6';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#b8ad97';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.lineWidth = 1;
  ctx.strokeRect(42, 42, W - 84, H - 84);
  // Гильош: несколько концентрических эллипсов справа
  ctx.strokeStyle = 'rgba(150, 140, 120, 0.35)';
  for (let r = 40; r <= 150; r += 14) {
    ctx.beginPath();
    ctx.ellipse(W - 210, H / 2, r * 1.15, r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#8f846f';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 150px Manrope, Arial, sans-serif';
  ctx.fillText(item.currency, 80, H / 2 + 52);
  ctx.font = '500 26px Manrope, Arial, sans-serif';
  ctx.fillText(item.name.en.toUpperCase(), 84, H - 84);
}

export function placeholderCanvas(item) {
  let canvas = canvases.get(item.id);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    draw(canvas, item);
    canvases.set(item.id, canvas);
  }
  return canvas;
}

// Картинка банкноты для <img>: настоящая или заглушка
export function imageFor(item) {
  if (item.src) return item.src;
  if (!urls.has(item.id)) urls.set(item.id, placeholderCanvas(item).toDataURL('image/png'));
  return urls.get(item.id);
}

// Перерисовать заглушки, когда загрузится Manrope; onRedraw — обновить текстуры
export function whenFontsReady(items, onRedraw) {
  document.fonts?.ready?.then(() => {
    canvases.forEach((canvas, id) => draw(canvas, items.find((i) => i.id === id)));
    urls.clear();
    onRedraw();
  });
}
