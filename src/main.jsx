import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { captureBlindPhoto } from "./services/camera.js";
import "./styles.css";

const statusCopy = {
  idle: "bereit",
  requestingPermission: "kamera wird geweckt",
  capturing: "verschluss offen",
  developing: "film wird entwickelt",
  sharing: "bereit zum speichern",
  error: "kein bild",
};

function App() {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("nur licht.");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("blindkamera.jpg");
  const objectUrlRef = useRef("");

  const clearDownload = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
    setDownloadUrl("");
  }, []);

  useEffect(() => clearDownload, [clearDownload]);

  const handleCapture = async () => {
    if (state !== "idle" && state !== "error" && state !== "sharing") return;

    clearDownload();

    try {
      setState("requestingPermission");
      setMessage("kamera wird gefragt.");

      setState("capturing");
      const photo = await captureBlindPhoto({
        onDeveloping: () => {
          setState("developing");
          setMessage("farben kippen, koernung kommt.");
        },
      });

      setState("sharing");
      setDownloadName(photo.name);

      if (navigator.canShare?.({ files: [photo] })) {
        await navigator.share({
          files: [photo],
          title: "Blindkamera",
          text: "Lomography Blindkamera",
        });
        setMessage("gespeichert oder geteilt.");
        setState("idle");
        return;
      }

      const url = URL.createObjectURL(photo);
      objectUrlRef.current = url;
      setDownloadUrl(url);
      setMessage("share sheet fehlt. speichern ist bereit.");
    } catch (error) {
      clearDownload();
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
        {downloadUrl ? (
          <a className="save-link" href={downloadUrl} download={downloadName}>
            Speichern
          </a>
        ) : null}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
