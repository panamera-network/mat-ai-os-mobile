# MAT.AI OS — Mobile

Mobile companion app for [MAT-AI-OS](https://github.com/panamera-network/mat-ai-os), built with Expo + React Native + TypeScript. Targets iOS 15+ and Android 10+, sharing the same dark theme as the desktop UI ([mat-ai-os-ui](https://github.com/panamera-network/mat-ai-os-ui)).

## Screens

- **Home** — online/offline status, active agent count, pending task count, quick actions
- **Chat** — talk to the Orchestrator (text, voice via device mic, photo/file attachments), session continuity via AsyncStorage
- **Agents** — list agents with live status, create a new one (pick domain + skills)
- **Goals** — active goals with progress bars, add/complete goals, daily briefing card on top
- **Settings** — configurable backend URL (for remote/LAN access), profile/identity, Work/Trading/Learning mode selector, push notification toggle

## Backend client

`src/api/MatOSClient.ts` is the only place that talks to the MAT-AI-OS backend — same shape as MAT-AI-MK1's `core/os-client.ts`. Every method returns a result object rather than throwing; the backend being unreachable is a normal, surfaced state, not an exception to catch everywhere.

## Push notifications

Uses `expo-notifications` + Expo's hosted push service. On first launch (and whenever notifications are re-enabled in Settings), the app registers its Expo push token with the backend (`POST /notifications/register-device`). The backend pushes the daily briefing (8 AM KL) and weekly review (Monday 9 AM KL) to every registered device automatically — see `core/briefing.py` and `core/push_notifications.py` in the backend repo.

## Getting started

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i`/`a` for a simulator/emulator. Set the backend URL in Settings to wherever your MAT-AI-OS instance is reachable (`http://localhost:8000` only works from a simulator on the same machine — use your computer's LAN IP for a physical device).

## Building

```bash
npx expo prebuild   # generates ios/ and android/ native projects
npx eas build        # or build locally with Xcode/Android Studio
```
