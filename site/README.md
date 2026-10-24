# widgetcake.com

The website, in the same repo as the launcher it describes.

Next.js 16, static export, deployed on Vercel with Root Directory `site`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build      # static export into out/
npm run serve      # serve the export
```

## Where the words are

Everything writable is in `lib/content.ts`. Components lay it out and own no
copy of their own. House style: short sentences, contractions, plain verbs,
second person. If a line reads like a brochure, it's wrong.

## The design

The launcher's own look, opened up into a page: cells that share one-pixel
borders, a strip of facts in small mono capitals, Archivo run wide for names,
rounded pills for anything you press. The fonts are the same files the app
bundles (`../src/fonts`), copied into `app/fonts`.

Colour belongs to the apps: each one's own on its badge and nowhere else. The
page's one loud thing is `components/LauncherDemo.tsx`, a working copy of the
launcher: Launch and Stop bring each overlay's plate to life as the app does.
The plates and their sample captions match `../src/main.js`; change both.

## Downloads

`components/DownloadButton.tsx` asks GitHub for the latest published release
of `ruptz/WidgetCake` and matches its files by the patterns in
`lib/content.ts` (Tauri's own names, `WidgetCake_<version>_<arch>.<ext>`).
Before the first release, offline, or rate-limited, every button points at the
releases page instead.

## Images

`public/widgetcake.png`, `app/icon.png` and `app/apple-icon.png` come from
`Brand/widgetcake.jpg` (the last two with 22% rounded corners, like the app
icon). `public/logos/*.png` are the launcher's own badges, `../src/logos`.
