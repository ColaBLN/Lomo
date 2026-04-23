export function applyRandomLomoEffect(sourceCanvas, seed = Date.now().toString()) {
  const random = mulberry32(hashSeed(seed));
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const context = canvas.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" });
  context.drawImage(sourceCanvas, 0, 0);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const width = image.width;
  const height = image.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.hypot(centerX, centerY);

  const contrast = 1.14 + random() * 0.28;
  const saturation = 1.1 + random() * 0.32;
  const warmth = -8 + random() * 28;
  const cyanLift = -10 + random() * 20;
  const vignette = 0.44 + random() * 0.18;
  const grain = 10 + random() * 18;

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const distance = Math.hypot(x - centerX, y - centerY) / maxDistance;
    const edge = 1 - Math.max(0, distance - 0.18) ** 1.75 * vignette;
    const noise = (random() - 0.5) * grain;

    let r = data[index];
    let g = data[index + 1];
    let b = data[index + 2];

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    r = luminance + (r - luminance) * saturation;
    g = luminance + (g - luminance) * saturation;
    b = luminance + (b - luminance) * saturation;

    r = (r - 128) * contrast + 128 + warmth + noise;
    g = (g - 128) * (contrast * 0.98) + 128 + cyanLift * 0.35 + noise * 0.55;
    b = (b - 128) * (contrast * 1.02) + 128 - warmth * 0.26 + cyanLift + noise * 0.75;

    data[index] = clamp(r * edge);
    data[index + 1] = clamp(g * edge);
    data[index + 2] = clamp(b * (edge * 0.98));
  }

  context.putImageData(image, 0, 0);
  addLightLeak(context, canvas.width, canvas.height, random);
  addChromaticNudge(context, canvas, random);
  return canvas;
}

function addLightLeak(context, width, height, random) {
  if (random() < 0.42) return;

  const x = random() < 0.5 ? 0 : width;
  const y = height * (0.18 + random() * 0.64);
  const radius = Math.max(width, height) * (0.28 + random() * 0.28);
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(236, ${92 + random() * 80}, 48, 0.24)`);
  gradient.addColorStop(0.55, "rgba(242, 185, 80, 0.08)");
  gradient.addColorStop(1, "rgba(242, 185, 80, 0)");

  context.globalCompositeOperation = "screen";
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";
}

function addChromaticNudge(context, canvas, random) {
  if (random() < 0.5) return;

  context.save();
  context.globalAlpha = 0.08;
  context.globalCompositeOperation = "screen";
  context.drawImage(canvas, 1 + random() * 2, 0);
  context.globalCompositeOperation = "multiply";
  context.drawImage(canvas, -1 - random() * 2, 0);
  context.restore();
}

function hashSeed(seed) {
  let hash = 2166136261;
  const input = String(seed);
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function next() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
