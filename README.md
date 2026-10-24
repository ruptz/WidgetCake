# WidgetCake — the launcher for the Layer apps

[![Support on Ko-fi](https://img.shields.io/badge/Ko--fi-support%20this%20project-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/ruptz)

One window for every Layer overlay: [ChatterLayer](https://github.com/ruptz/Chatterlayer)
(live Discord voice captions) and [JammyLayer](https://github.com/ruptz/JammyLayer)
(a Spotify now-playing card), plus whatever *Layer app comes next. WidgetCake
installs them, keeps them up to date, starts and stops them, and hands you the
URL to paste into OBS.

<https://widgetcake.com>

Every app still works on its own. WidgetCake is the easy way to have all of
them, not the only way.

---

## Install

Download the installer for your machine from the
[latest release](https://github.com/ruptz/WidgetCake/releases/latest):

| System | File |
|---|---|
| Windows | `WidgetCake_<version>_x64-setup.exe` |
| macOS, Apple Silicon | `WidgetCake_<version>_aarch64.dmg` |
| macOS, Intel | `WidgetCake_<version>_x64.dmg` |
| Linux | `WidgetCake_<version>_amd64.AppImage` or `.deb` (also `aarch64` / `arm64`) |

**The builds aren't code-signed.** Signing costs money every year, and
WidgetCake is free. So expect a warning the first time:

- **Windows:** SmartScreen shows a blue box. Click **More info**, then **Run
  anyway**.
- **macOS:** right-click the app, choose **Open**, then **Open** again.
- **Linux:** make the AppImage executable first: `chmod +x WidgetCake_*.AppImage`.

Windows is where WidgetCake is tested. The macOS and Linux builds come from the
same code, but nobody here runs them. If something breaks, please
[open an issue](https://github.com/ruptz/WidgetCake/issues/new/choose).

## Using it

Each overlay gets a card. A card shows what's installed, and its buttons follow
from that: **Install**, then **Launch**, **Open** (brings a running app to the
front, even from its tray), **Stop**, and **Update** when there's a newer
version. The **OBS** line on a running app is the browser-source URL. Copy it
into OBS and you're done.

Closing WidgetCake with overlays still running asks first. They can keep
running without it, or stop with it.

## What goes online, and when

Nothing, until you click. WidgetCake talks to GitHub only when you press
**Check for updates** or **Install** / **Update**, and only to read an app's
latest release and download it. No accounts, no telemetry, nothing sent
anywhere else.

## Where things live

- **Installed apps:** one folder per app under WidgetCake's local data folder
  (`%LOCALAPPDATA%\com.widgetcake.app\apps` on Windows). Each holds a
  `widgetcake.json` saying which version WidgetCake put there.
- **App settings** stay where each app keeps them, so uninstalling an app from
  WidgetCake leaves its settings, models and tokens alone.

An update downloads into a folder beside the installed copy and swaps in only
once it's complete, so a failed or cancelled download never leaves an app
half-installed.

## How an app joins

Every Layer app publishes, on each release, a zip of the app on its own per
platform: `<App>-<version>-win.zip`, `-macos-arm64.zip`, `-macos-x64.zip`,
`-linux-x64.zip`, `-linux-arm64.zip`. WidgetCake picks the one for this
computer. Its entry in [`src-tauri/apps.json`](src-tauri/apps.json) says which
repo to read, which program to start, where its OBS overlay lives and which
colour its badge is. The badge logo goes in `src/logos/<app>.png`.

## Build from source

Needs Node 22 and stable Rust, plus Tauri's
[system dependencies](https://tauri.app/start/prerequisites/).

```bash
npm install
npm run dev        # run it
npm run build      # installers into src-tauri/target/release/bundle
cd src-tauri && cargo test
```

While developing, WidgetCake expects the apps beside it (`../ChatterLayer`,
`../JammyLayer`) and runs their debug builds from there instead of installed
copies. Two environment variables, read by debug builds only, change that:

- `WIDGETCAKE_INSTALLED=1` behaves like a user's copy and runs installed apps.
- `WIDGETCAKE_GITHUB_API=<url>` points release lookups at a stand-in for
  GitHub, for testing installs and updates.

## The website

[widgetcake.com](https://widgetcake.com) lives in [`site/`](site/): Next.js,
exported as static files, deployed on Vercel. See its own README.

## Releasing

Push a tag that matches the version in `package.json`,
`src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`:

```bash
git tag v0.0.1
git push origin v0.0.1
```

GitHub Actions builds every platform and opens a **draft** release. Check
what's attached, then publish it.

## Support

WidgetCake and the Layer apps are free and stay that way. If they're useful to
you, [Ko-fi](https://ko-fi.com/ruptz) keeps them going.

## License

[MIT](LICENSE).
