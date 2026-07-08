# AeroDrive Zenith v0.3.8

## Purpose

This release adds a premium startup experience and mobile landscape enforcement before gameplay begins.

## User-facing changes

- Adds a cinematic startup screen with a prominent Play button.
- Adds an Open Settings action before entering the drive.
- Shows render, seed, and offline readiness highlights on the launch screen.
- Requires landscape orientation on mobile before the game can start.
- Shows a dedicated rotate-to-landscape message if a mobile device returns to portrait after launch.
- Attempts fullscreen and landscape orientation lock on supported browsers.

## Runtime behavior

The renderer, physics worker, input controller, and audio graph now boot after the user presses Play. This improves perceived quality and avoids starting active simulation systems before intentional user entry.

## Cache

Service Worker and offline readiness cache versions are aligned to `aerodrive-zenith-v0.3.8`.
