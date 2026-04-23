import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { captureBlindPhoto } from "./services/camera.js";
import "./styles.css";

const statusCopy = {
  idle: "bereit",
  requestingPermission: "kamera wird geweckt",
  capturing: "verschluss offen",
  developing: "film wird entwickelt",
  sharing: "wird gesichert",
  error: "kein bild",
};

function App() {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("nur licht.");
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
      setMessage("kamera wird gefragt.");

      setState("capturing");
      const photo = await captureBlindPhoto({
        onDeveloping: () => {
          setState("developing");
          setMessage("film burn, koernung, zufallslook.");
        },
      });

      setState("sharing");
      setMessage("wird automatisch gespeichert.");
      triggerAutomaticDownload(photo, objectUrlRef, cleanupTimerRef);
      setMessage("gespeichert.");
      setState("idle");
    } catch (error) {
      clearPendingDownload();
      setState("error");
      setMessage(error instanceof Error ? error.message : "die kamera hat nicht geantwortet.");
    }
  };

  const busy = state === "requestingPermission" || state === "capturing" || state === "developing";

  return (
    <main className="app-shell" aria-live="polite">
      <section className="camera-face" aria-label="Lomography Blindkamera">
        <p className="kicker">blindkamera</p>
        <div className="meter" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <button
          className="shutter"
          type="button"
          onClick={handleCapture}
          disabled={busy}
          aria-label="Blindfoto aufnehmen"
        >
          <span className="shutter-core" />
        </button>
        <div className="status-block">
          <p className="status">{statusCopy[state]}</p>
          <p className="message">{message}</p>
        </div>
      </section>
    </main>
  );
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
