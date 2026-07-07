# Vercel Deployment Guide

AeroDrive Zenith is configured as a static-exported Next.js PWA.

## Required Vercel settings

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Install Command | `npm install` |
| Build Command | `npm run check && npm run build` |
| Output Directory | `out` |
| Node.js Version | 20.x |

These values are also encoded in `vercel.json`.

## Important browser requirements

- Service Workers require HTTPS or `localhost`.
- WebGPU requires a compatible browser/GPU and may need browser flags on unsupported machines.
- WebHID and force feedback require a secure context and user permission.
- Wheel/pedal HID report mappings must be calibrated on actual devices.

## Post-deployment smoke test

1. Open the deployed URL.
2. Confirm the boot panel shows Service Worker registered.
3. Refresh once, then disconnect network and reload.
4. Confirm the app loads offline.
5. Open `/#seed=alpha-bravo` and confirm the same seed is preserved.
6. Run keyboard controls: W/A/S/D, Q/E, Space, C.
