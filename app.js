const shootButton = document.getElementById('shootButton');
const cameraInput = document.getElementById('cameraInput');
const statusText = document.getElementById('statusText');
const photoGrid = document.getElementById('photoGrid');
const photoCardTemplate = document.getElementById('photoCardTemplate');

const STORAGE_KEY = 'lomo-photos-v1';
const MAX_PHOTOS = 40;

const randomFilters = [
  {
    name: 'Neon Pop',
    cssFilter: 'contrast(1.25) saturate(1.45) hue-rotate(-12deg)',
    vignette: 0.36,
    grain: 0.06,
  },
  {
    name: 'Warm Dust',
    cssFilter: 'contrast(1.12) saturate(1.2) sepia(0.3) hue-rotate(-9deg)',
    vignette: 0.28,
    grain: 0.08,
  },
  {
    name: 'Cold Slide',
    cssFilter: 'contrast(1.22) saturate(1.12) hue-rotate(22deg)',
    vignette: 0.33,
    grain: 0.05,
  },
  {
    name: 'Dream Fade',
    cssFilter: 'contrast(1.06) brightness(1.05) saturate(1.15) sepia(0.17)',
    vignette: 0.22,
    grain: 0.05,
  },
  {
    name: 'Retro Flash',
    cssFilter: 'contrast(1.28) brightness(1.1) saturate(1.35) sepia(0.16)',
    vignette: 0.4,
    grain: 0.07,
  },
];

let photos = loadPhotos();
renderPhotos();

shootButton.addEventListener('click', () => {
  cameraInput.click();
});

cameraInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  shootButton.disabled = true;
  setStatus('Entwickle Film...');

  try {
    const processedDataUrl = await processImage(file);
    const now = new Date();
    const entry = {
      id: crypto.randomUUID(),
      dataUrl: processedDataUrl,
      createdAt: now.toISOString(),
    };

    photos.unshift(entry);
    photos = photos.slice(0, MAX_PHOTOS);
    persistPhotos();
    renderPhotos();

    saveToDevice(entry);
    setStatus('Gespeichert unter Fotos/Downloads.');
  } catch (error) {
    console.error(error);
    setStatus('Fehler bei der Entwicklung. Bitte nochmal.');
  } finally {
    cameraInput.value = '';
    shootButton.disabled = false;
  }
});

function setStatus(message) {
  statusText.textContent = message;
}

function loadPhotos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistPhotos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
}

function renderPhotos() {
  photoGrid.innerHTML = '';

  if (photos.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Noch keine Aufnahmen.';
    empty.className = 'status';
    photoGrid.append(empty);
    return;
  }

  for (const photo of photos) {
    const card = photoCardTemplate.content.firstElementChild.cloneNode(true);
    const img = card.querySelector('img');
    const time = card.querySelector('time');

    img.src = photo.dataUrl;
    time.dateTime = photo.createdAt;
    time.textContent = new Date(photo.createdAt).toLocaleString('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    photoGrid.append(card);
  }
}

async function processImage(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext('2d');
  const filter = randomFilters[Math.floor(Math.random() * randomFilters.length)];

  ctx.filter = filter.cssFilter;
  ctx.drawImage(bitmap, 0, 0);
  ctx.filter = 'none';

  addVignette(ctx, canvas.width, canvas.height, filter.vignette);
  addGrain(ctx, canvas.width, canvas.height, filter.grain);

  setStatus(`Filter: ${filter.name}`);

  return canvas.toDataURL('image/jpeg', 0.94);
}

function addVignette(ctx, width, height, strength) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.28,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.78,
  );

  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function addGrain(ctx, width, height, amount) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const scale = 255 * amount;

  for (let i = 0; i < pixels.length; i += 4) {
    const noise = (Math.random() - 0.5) * scale;
    pixels[i] = clamp(pixels[i] + noise);
    pixels[i + 1] = clamp(pixels[i + 1] + noise);
    pixels[i + 2] = clamp(pixels[i + 2] + noise);
  }

  ctx.putImageData(imageData, 0, 0);
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function saveToDevice(entry) {
  const a = document.createElement('a');
  a.href = entry.dataUrl;
  a.download = `lomo-${entry.createdAt.replaceAll(':', '-').replace('.', '-')}.jpg`;
  document.body.append(a);
  a.click();
  a.remove();
}
