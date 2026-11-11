# Zoya ☀️

<div align="center">
<img width="160" src="public/logo.png" />
</div>

Zoya shows the battery level, load, solar input and grid hours of inverters that work with the
[WatchPower](https://play.google.com/store/apps/details?id=wifiapp.volfw.watchpower) app.

This is the React + Tailwind + TypeScript rewrite of the original Expo / React Native app, packaged
for Android with [Capacitor](https://capacitorjs.com).

## Features

- Energy flow card: battery, solar and grid status with the current load.
- **Day card.** For today or any earlier day (‹ › or tap the date to pick one):
  - a strip showing when the grid was on, with the list of on-periods and total grid hours, plus
    how long the grid has been on or off right now
  - battery % for every reading (about every 5 minutes) on a fixed 0–100% scale
  - usage as 15-minute average watts, with solar drawn over it on days that had any
  - totals: energy drawn from and charged into the battery, lowest battery % and peak load
  - all charts share one time axis; drag across them to read the exact values at any moment
  - pinch to zoom into part of the day (down to one hour) and drag with two fingers to move
    around; zoomed in to 8 hours or less, usage switches to 5-minute bars
- **Grid hours, last 7 days.** Tap a day to open it in the day card. Finished days are cached on
  the phone (for 14 days), so each is downloaded once and stays viewable offline.
- **Multiple accounts.** Log in with several WatchPower accounts. Saved accounts are listed on the
  login screen, so switching back is one tap. The sidebar lists the devices of every saved account,
  grouped by username. Logout returns to the login screen and keeps saved accounts. Use ✕ on the
  login screen to remove one.
- **Rename devices.** Long-press a device in the sidebar or tap the pencil in the header. Names are
  kept only on this phone.
- Pull down to refresh; data also refreshes when the app returns to the foreground.

Not in this version yet: the battery live notification.

While the grid is on, many setups power the house straight from the grid, so the inverter reports
almost no load; usage then mostly shows what was drawn from the battery.

## Development

Requirements: Node 22+, pnpm, Android Studio (its bundled JDK 21 is used for Gradle builds).

```sh
pnpm install
pnpm dev        # http://localhost:5173 (API requests go through the Vite proxy)
pnpm lint
pnpm typecheck
```

## Android

```sh
pnpm android    # build, sync and run on a connected device or emulator
pnpm apk        # build a debug APK at android/app/build/outputs/apk/debug/app-debug.apk
```

Both scripts use `$JAVA_HOME`, falling back to Android Studio's JDK at
`/Applications/Android Studio.app/Contents/jbr/Contents/Home`.

Debug builds are signed with `android/app/debug.keystore`, the same key as the Expo build, so the
APK installs over a debug build of the old app.

## How it works

- `src/lib/watchpower.ts`: WatchPower API client (request signing, response parsing).
- `src/lib/http.ts`: GET requests. Native builds use `CapacitorHttp`, because the API is plain HTTP
  without CORS; requests time out after 15s (connect) and 30s (read).
- `src/lib/storage.ts`: everything persisted goes through
  [`@aparajita/capacitor-secure-storage`](https://github.com/aparajita/capacitor-secure-storage).
  On Android each value is encrypted with AES-GCM using a key held in the Android Keystore.
  Capacitor's own logging is turned off (`loggingBehavior: "none"`), so decrypted values and session
  tokens never reach logcat.
- `src/contexts/accounts.tsx`: saved accounts, sessions (renewed automatically when they expire),
  and the signed-in state.
- `src/contexts/devices.tsx`: device lists for all accounts, cached for a fast start.
- `src/contexts/deviceNames.tsx`: local device names.
- `src/lib/daySeries.ts`, `src/lib/statistics.ts`: one day of readings in a compact form, and the
  grid periods, averages and totals computed from it.
- `src/lib/dayCache.ts`, `src/hooks/useDayHistory.ts`: past days, cache first, then the API.
- `src/components/day/`: the day card and its hand-drawn SVG charts.

## Credits

- [davidsmfreire/watchpower-api](https://github.com/davidsmfreire/watchpower-api) for reverse
  engineering the WatchPower API.
- Named after Zoya, a lovely street cat.
