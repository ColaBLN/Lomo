import { applyRandomLomoEffect } from "./lomo.js";

const MAX_EXPORT_EDGE = 2200;
const READY_TIMEOUT_MS = 4500;

export async function captureBlindPhoto({ onDeveloping } = {}) {
  assertCameraAvailable();

  let stream;
  try {
    stream = await requestBackCamera();
  } catch (error) {
    if (isConstraintFailure(error)) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } else {
      throw cameraError(error);
    }
  }

  try {
    const { video, cleanup } = await primeHiddenVideo(stream);
    let source;
    try {
      source = drawVideoFrame(video);
    } finally {
      cleanup();
    }
    onDeveloping?.();

    const seed = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const treated = applyRandomLomoEffect(source, seed);
    const blob = await canvasToJpeg(treated);

    return new File([blob], makeFilename(), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    stopStream(stream);
  }
}

function assertCameraAvailable() {
  if (!window.isSecureContext) {
    throw new Error("kamera braucht https oder localhost.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("dieser browser kann die kamera nicht direkt oeffnen.");
  }
}

function requestBackCamera() {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 2560 },
    },
  });
}

function primeHiddenVideo(stream) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = stream;
    video.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
    video.setAttribute("aria-hidden", "true");
    document.body.append(video);

    const cleanup = () => {
      video.pause();
      video.srcObject = null;
      video.remove();
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("die kamera liefert kein bild."));
    }, READY_TIMEOUT_MS);

    const finish = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      window.clearTimeout(timeout);
      resolve({
        video,
        cleanup,
      });
    };

    video.addEventListener("loadedmetadata", finish, { once: true });
    video.addEventListener("canplay", finish, { once: true });
    video.play().then(finish).catch((error) => {
      window.clearTimeout(timeout);
      cleanup();
      reject(cameraError(error));
    });
  }).then(async ({ video, cleanup }) => {
    await waitForFrame(video);
    return { video, cleanup };
  });
}

function waitForFrame(video) {
  if ("requestVideoFrameCallback" in video) {
    return new Promise((resolve) => video.requestVideoFrameCallback(() => resolve()));
  }

  return new Promise((resolve) => window.setTimeout(resolve, 160));
}

function drawVideoFrame(video) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const scale = Math.min(1, MAX_EXPORT_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { colorSpace: "srgb" });
  context.drawImage(video, 0, 0, width, height);
  return canvas;
}

function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("das bild konnte nicht gespeichert werden."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function makeFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `blindkamera-${stamp}.jpg`;
}

function isConstraintFailure(error) {
  return error?.name === "OverconstrainedError" || error?.name === "NotFoundError";
}

function cameraError(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return new Error("kamera wurde nicht erlaubt.");
  }

  if (error?.name === "NotFoundError") {
    return new Error("keine kamera gefunden.");
  }

  return error instanceof Error ? error : new Error("die kamera hat nicht geantwortet.");
}
