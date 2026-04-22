# LOMO — Superchic Minimal Camera App

Mobile-first Lomography Web-App mit:

- Kein Preview vor dem Auslösen
- Keine Einstellungen
- Zufallsfilter bei jeder Aufnahme
- Automatische lokale Speicherung in der App (Bereich **Fotos**)
- Zusätzlich automatischer JPG-Download pro Foto

## Lokal testen

```bash
python3 -m http.server 4173
```

Dann öffnen: `http://localhost:4173`

> Für Kamera-Funktionen auf Mobile am besten via HTTPS (z. B. auf Vercel).

## Deployment auf Vercel (fix gegen 404)

1. Repo zu GitHub pushen.
2. In Vercel: **Add New Project** → Repo auswählen.
3. **Root Directory** auf dieses Projekt setzen (wo `index.html` liegt).
4. Framework Preset: **Other** (oder Auto-Detected).
5. Deploy.

`vercel.json` enthält eine Dateisystem-Route + Fallback auf `/index.html`, damit kein `404 NOT_FOUND` auf Deep-Links entsteht.
