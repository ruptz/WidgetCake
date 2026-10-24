/**
 * Every word on the site lives here.
 *
 * Facts come from the launcher's own README and source (one level up) and
 * from each app's repo. If the launcher changes, change them here.
 *
 * House style: short sentences, contractions, plain verbs, second person.
 * Say what things do, never sell them.
 */

export const site = {
  name: 'WidgetCake',

  /**
   * Canonical origin, for metadataBase, the canonical link, robots, the
   * sitemap and the absolute Open Graph image URL. NEXT_PUBLIC_SITE_URL
   * overrides it, so a preview deploy needn't call itself canonical.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://widgetcake.com',

  tagline: 'The launcher for every Layer overlay.',
  description:
    'WidgetCake installs ChatterLayer, JammyLayer and every Layer overlay to come, keeps them up to date, starts and stops them, and hands you the URL for OBS. Free, open source, and offline until you click.',
  author: 'ruptz',

  repoUrl: 'https://github.com/ruptz/WidgetCake',
  releasesUrl: 'https://github.com/ruptz/WidgetCake/releases',
  /** Drafts and pre-releases never show up here, so the button can't hand out an unreviewed build. */
  latestReleaseApi: 'https://api.github.com/repos/ruptz/WidgetCake/releases/latest',
  issuesUrl: 'https://github.com/ruptz/WidgetCake/issues/new/choose',
  licenseUrl: 'https://github.com/ruptz/WidgetCake/blob/master/LICENSE',
  kofiUrl: 'https://ko-fi.com/ruptz',
} as const;

export const nav = [
  { label: 'Overlays', href: '#overlays' },
  { label: 'How it works', href: '#how' },
  { label: 'Questions', href: '#questions' },
] as const;

export const hero = {
  title: 'Every Layer overlay, in one place.',
  lede: 'WidgetCake installs the Layer apps for your stream, keeps them up to date, and hands you the URL to paste into OBS. Free, open source, and offline until you click.',
};

/* -------------------------------------------------------------------------- */
/*  The overlays. Same facts as Launcher/src-tauri/apps.json.                  */
/* -------------------------------------------------------------------------- */

export type Caption = { who: string; colour: string; said: string };

export type App = {
  id: 'chatterlayer' | 'jammylayer';
  /** The app's own word; "Layer" is added after it, set back. */
  own: string;
  tagline: string;
  /** One paragraph under the demo, for people who want more than a tagline. */
  about: string;
  colour: string;
  logo: string;
  port: number;
  path: string;
  website: string | null;
  github: string;
};

export const apps: App[] = [
  {
    id: 'chatterlayer',
    own: 'Chatter',
    tagline: 'Live Discord voice captions, colour-coded by speaker.',
    about:
      'A bot joins your Discord call and captions the people you switch on, each in their own colour. Speech is turned into text on your own PC; nothing is sent anywhere. It can caption your own mic too.',
    colour: '#4ECDC4',
    logo: '/logos/chatterlayer.png',
    port: 8777,
    path: '/',
    website: 'https://chatterlayer.com',
    github: 'https://github.com/ruptz/Chatterlayer',
  },
  {
    id: 'jammylayer',
    own: 'Jammy',
    tagline: "The song you're playing on Spotify, as a now-playing card.",
    about:
      'Signs in to your own Spotify account and shows the track you’re playing as a card, its accent colour taken from the album art. It only serves your own PC.',
    colour: '#E9B04F',
    logo: '/logos/jammylayer.png',
    port: 8888,
    path: '/overlay',
    website: null,
    github: 'https://github.com/ruptz/JammyLayer',
  },
];

/** ChatterLayer's plate: a conversation, in its speaker colours. */
export const chatter: Caption[] = [
  { who: 'Ana', colour: '#FF6B6B', said: "okay, who's pulling the next pack?" },
  { who: 'Ben', colour: '#4ECDC4', said: 'me, give me ten seconds' },
  { who: 'Kai', colour: '#FFD93D', said: "healer's out of mana" },
  { who: 'Ana', colour: '#FF6B6B', said: 'drinking, go go go' },
  { who: 'Ben', colour: '#4ECDC4', said: 'pulled, stay behind me' },
  { who: 'Kai', colour: '#FFD93D', said: 'that went clean, nice' },
];

export const nowPlaying = { title: 'Nightcall', artist: 'Kavinsky' };

export const demo = {
  intro:
    'This is WidgetCake. Press Launch on an overlay to see what it puts on your stream.',
  soon: {
    name: 'More overlays',
    tagline: 'New Layer apps show up here when they’re released.',
  },
};

/* -------------------------------------------------------------------------- */
/*  How it works: a real sequence, hence the numbers.                          */
/* -------------------------------------------------------------------------- */

export const steps = [
  {
    title: 'Install WidgetCake',
    body: 'One installer for Windows, macOS or Linux. It opens on your overlays, with none of them installed yet.',
  },
  {
    title: 'Install the overlays you want',
    body: 'Each one downloads from its own GitHub release. Updates come the same way, when you press Check for updates.',
  },
  {
    title: 'Copy the URL into OBS',
    body: 'Launch an overlay and its card shows the address for an OBS Browser source. Paste it in and you’re live.',
  },
];

export const promises = [
  { title: 'Free', body: 'No tiers, no trial, nothing locked. Ko-fi keeps it going if you want it to.' },
  { title: 'Open source', body: 'WidgetCake and every Layer app are MIT licensed and built in the open on GitHub.' },
  { title: 'Offline until you click', body: 'It talks to GitHub only when you check for updates or install something. No accounts, no telemetry.' },
];

/* -------------------------------------------------------------------------- */
/*  Questions                                                                  */
/* -------------------------------------------------------------------------- */

export const questions = [
  {
    q: 'Windows says it protected my PC. Is this safe?',
    a: 'That blue SmartScreen box appears for anything that isn’t code-signed. Click More info, then Run anyway. Signing costs money every year and WidgetCake is free, so the builds aren’t signed. The code that makes them is public, and GitHub builds every release from it.',
  },
  {
    q: 'macOS won’t open it.',
    a: 'Right-click the app, choose Open, then Open again. If it says the app is damaged, that’s the quarantine flag every unsigned download gets; running xattr -dr com.apple.quarantine /Applications/WidgetCake.app clears it once.',
  },
  {
    q: 'Does it work on Mac and Linux?',
    a: 'It’s built for both, from the same code. Windows is where it’s tested day to day, so if something breaks on yours, please open an issue on GitHub. That’s how it gets fixed.',
  },
  {
    q: 'Do I need WidgetCake to use the overlays?',
    a: 'No. Every Layer app has its own installer and works on its own. WidgetCake is the easy way to have all of them and keep them current.',
  },
  {
    q: 'Where do my settings go if I uninstall an overlay?',
    a: 'Nowhere. Uninstalling removes the app, but its settings, tokens and downloaded speech models stay where the app keeps them, ready if you install it again.',
  },
  {
    q: 'Can I suggest an overlay?',
    a: 'Yes, start a discussion on GitHub. New Layer apps join WidgetCake as they’re released.',
  },
];

/* -------------------------------------------------------------------------- */
/*  Downloads. Matched against the release's asset names, which are Tauri's     */
/*  own: WidgetCake_<version>_<arch>.<ext>.                                    */
/* -------------------------------------------------------------------------- */

export type Platform = 'windows' | 'mac' | 'linux';
export type AfterStep = { text: string; code?: string };

export type Download = {
  key: string;
  platform: Platform;
  /** In the list of other builds. */
  label: string;
  /** On the button, when this is the build that suits the visitor. */
  button: string;
  match: RegExp;
  after: AfterStep[];
};

const macAfter: AfterStep[] = [
  { text: 'Open the .dmg and drag WidgetCake into Applications.' },
  { text: 'The first time, right-click it and choose Open, then Open again. It isn’t signed, so a double-click gets refused.' },
  {
    text: 'If macOS says it’s damaged, it isn’t. Clear the quarantine flag once:',
    code: 'xattr -dr com.apple.quarantine /Applications/WidgetCake.app',
  },
];

const appImageAfter: AfterStep[] = [
  { text: 'Make it executable, in its Properties or with:', code: 'chmod +x {file}' },
  { text: 'Double-click it. There’s nothing to install.' },
];

const debAfter: AfterStep[] = [
  { text: 'Install it from the folder you saved it to:', code: 'sudo apt install ./{file}' },
  { text: 'WidgetCake shows up in your applications menu.' },
];

export const downloads: Download[] = [
  {
    key: 'win',
    platform: 'windows',
    label: 'Windows',
    button: 'Download for Windows',
    match: /_x64-setup\.exe$/i,
    after: [
      { text: 'Run it. SmartScreen puts up a blue box the first time: click More info, then Run anyway.' },
      { text: 'WidgetCake opens on your overlays. Press Install on the ones you want.' },
    ],
  },
  { key: 'mac-arm', platform: 'mac', label: 'macOS, Apple Silicon', button: 'Download for Mac', match: /_aarch64\.dmg$/i, after: macAfter },
  { key: 'mac-intel', platform: 'mac', label: 'macOS, Intel', button: 'Download for Mac', match: /_x64\.dmg$/i, after: macAfter },
  { key: 'appimage', platform: 'linux', label: 'Linux AppImage', button: 'Download for Linux', match: /_amd64\.AppImage$/i, after: appImageAfter },
  { key: 'appimage-arm', platform: 'linux', label: 'Linux AppImage, ARM64', button: 'Download for Linux', match: /_aarch64\.AppImage$/i, after: appImageAfter },
  { key: 'deb', platform: 'linux', label: 'Linux .deb', button: 'Download for Linux', match: /_amd64\.deb$/i, after: debAfter },
  { key: 'deb-arm', platform: 'linux', label: 'Linux .deb, ARM64', button: 'Download for Linux', match: /_arm64\.deb$/i, after: debAfter },
];
