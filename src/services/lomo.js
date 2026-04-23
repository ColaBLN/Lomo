export function applyRandomLomoEffect(sourceCanvas, seed = Date.now().toString()) {
  const random = mulberry32(hashSeed(seed));
  const profile = chooseFilmProfile(random);
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

  const contrast = profile.contrast + random() * 0.16;
  const saturation = profile.saturation + random() * 0.2;
  const warmth = profile.warmth + (-8 + random() * 16);
  const cyanLift = profile.cyanLift + (-10 + random() * 18);
  const vignette = profile.vignette + random() * 0.14;
  const grain = profile.grain + random() * 20;
  const fade = profile.fade + random() * 10;
  const shadowTint = profile.shadowTint + random() * 8;

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

    r = (r - 128) * contrast + 128 + warmth + fade + noise;
    g = (g - 128) * (contrast * 0.98) + 128 + cyanLift * 0.28 + fade * 0.75 + noise * 0.55;
    b = (b - 128) * (contrast * 1.03) + 128 - warmth * 0.24 + cyanLift + fade * 0.45 + noise * 0.82;

    if (luminance < 90) {
      r += shadowTint;
      b -= shadowTint * 0.6;
    }

    data[index] = clamp(r * edge);
    data[index + 1] = clamp(g * edge);
    data[index + 2] = clamp(b * (edge * 0.98));
  }

  context.putImageData(image, 0, 0);
  addFilmBurn(context, canvas.width, canvas.height, random, profile.burnColor);
  if (random() > 0.34) {
    addFilmBurn(context, canvas.width, canvas.height, random, profile.burnColor);
  }
  addChromaticNudge(context, canvas, random);
  return canvas;
}

function addFilmBurn(context, width, height, random, burnColor) {
  const edgeChoice = Math.floor(random() * 4);
  const x = edgeChoice === 0 ? 0 : edgeChoice === 1 ? width : width * (0.2 + random() * 0.6);
  const y = edgeChoice === 2 ? 0 : edgeChoice === 3 ? height : height * (0.16 + random() * 0.68);
  const radius = Math.max(width, height) * (0.26 + random() * 0.4);
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${burnColor[0]}, ${burnColor[1]}, ${burnColor[2]}, ${0.24 + random() * 0.18})`);
  gradient.addColorStop(0.36, `rgba(255, ${158 + Math.round(random() * 52)}, 84, 0.18)`);
  gradient.addColorStop(0.7, "rgba(255, 214, 142, 0.05)");
  gradient.addColorStop(1, "rgba(255, 214, 142, 0)");

  context.globalCompositeOperation = "screen";
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";
}

function addChromaticNudge(context, canvas, random) {
  if (random() < 0.28) return;

  context.save();
  context.globalAlpha = 0.1 + random() * 0.06;
  context.globalCompositeOperation = "screen";
  context.drawImage(canvas, 1 + random() * 3, 0);
  context.globalCompositeOperation = "multiply";
  context.drawImage(canvas, -1 - random() * 3, 0);
  context.restore();
}

function chooseFilmProfile(random) {
  const profiles = [
    {
      contrast: 1.24,
      saturation: 1.22,
      warmth: 20,
      cyanLift: -4,
      vignette: 0.48,
      grain: 18,
      fade: 6,
      shadowTint: 8,
      burnColor: [255, 90, 52],
    },
    {
      contrast: 1.18,
      saturation: 1.34,
      warmth: 6,
      cyanLift: 12,
      vignette: 0.54,
      grain: 22,
      fade: 10,
      shadowTint: 5,
      burnColor: [255, 130, 46],
    },
    {
      contrast: 1.3,
      saturation: 1.12,
      warmth: 26,
      cyanLift: -12,
      vignette: 0.58,
      grain: 26,
      fade: 4,
      shadowTint: 10,
      burnColor: [255, 82, 28],
    },
    {
      contrast: 1.16,
      saturation: 1.26,
      warmth: -2,
      cyanLift: 18,
      vignette: 0.46,
      grain: 20,
      fade: 12,
      shadowTint: 4,
      burnColor: [255, 116, 70],
    },
  ];

  return profiles[Math.floor(random() * profiles.length)];
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
