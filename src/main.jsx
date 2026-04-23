import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { captureBlindPhoto } from "./services/camera.js";
import "./styles.css";

const PHOTO_COUNT_KEY = "goodbylomo-photo-count";

const statusCopy = {
  idle: "press",
  requestingPermission: "wake",
  capturing: "hold",
  developing: "develop",
  sharing: "save",
  error: "again",
};

function App() {
  const [state, setState] = useState("idle");
  const [photoCount, setPhotoCount] = useState(() => readPhotoCount());
  const objectUrlRef = useRef("");
  const cleanupTimerRef = useRef(0);

  const clearPendingDownload = useCallback(() => {
    if (cleanupTimerRef.current) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = 0;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  }, []);

  useEffect(() => clearPendingDownload, [clearPendingDownload]);

  const handleCapture = async () => {
    if (state !== "idle" && state !== "error" && state !== "sharing") return;

    clearPendingDownload();

    try {
      setState("requestingPermission");

      setState("capturing");
      const photo = await captureBlindPhoto({
        onDeveloping: () => {
          setState("developing");
        },
      });

      setState("sharing");
      await saveAsPhotoFirst(photo, objectUrlRef, cleanupTimerRef);
      incrementPhotoCount(setPhotoCount);
      setState("idle");
    } catch {
      clearPendingDownload();
      setState("error");
    }
  };

  const busy = state === "requestingPermission" || state === "capturing" || state === "developing";
  const showInstagram = photoCount >= 3;

  return (
    <main className="app-shell" aria-live="polite">
      <section className="camera-face" aria-label="goodbylomo camera">
        <p className="kicker">goodbylomo</p>
        <div className="meter" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <button
          className={`shutter ${!busy ? "shutter-prompt" : ""}`}
          type="button"
          onClick={handleCapture}
          disabled={busy}
          aria-label="Take photo"
        >
          <span className="shutter-ring" aria-hidden="true" />
          <span className="shutter-core" />
        </button>
        <div className="status-block">
          <p className="status">{statusCopy[state]}</p>
        </div>
        <div className="footer-slot">
          {showInstagram ? (
            <a className="instagram-link" href="https://instagram.com/goodbyproduction" target="_blank" rel="noreferrer">
              @goodbyproduction
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}

async function saveAsPhotoFirst(file, objectUrlRef, cleanupTimerRef) {
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: file.name,
      text: "Blindkamera",
    });
    return "share";
  }

  triggerAutomaticDownload(file, objectUrlRef, cleanupTimerRef);
  return "download";
}

function readPhotoCount() {
  try {
    const raw = window.localStorage.getItem(PHOTO_COUNT_KEY);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function incrementPhotoCount(setPhotoCount) {
  setPhotoCount((current) => {
    const next = current + 1;
    try {
      window.localStorage.setItem(PHOTO_COUNT_KEY, String(next));
    } catch {}
    return next;
  });
}

function triggerAutomaticDownload(file, objectUrlRef, cleanupTimerRef) {
  const url = URL.createObjectURL(file);
  objectUrlRef.current = url;

  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();

  cleanupTimerRef.current = window.setTimeout(() => {
    URL.revokeObjectURL(url);
    if (objectUrlRef.current === url) {
      objectUrlRef.current = "";
    }
    cleanupTimerRef.current = 0;
  }, 9000);
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
