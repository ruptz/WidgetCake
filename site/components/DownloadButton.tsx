'use client';

import { useEffect, useState } from 'react';
import { downloads, site, type Download } from '@/lib/content';

type Asset = { url: string; name: string; size: number };
type Release = { tag: string; page: string; assets: Record<string, Asset> };
type Visitor = 'windows' | 'mac-arm' | 'mac-intel' | 'linux' | 'handheld';

const PRIMARY: Record<Exclude<Visitor, 'handheld'>, string> = {
  windows: 'win',
  'mac-arm': 'mac-arm',
  'mac-intel': 'mac-intel',
  linux: 'appimage',
};

const CACHE_KEY = 'widgetcake:latest-release';

/* The header and the hero share one request. */
let pending: Promise<Release | null> | null = null;

export function latestRelease(): Promise<Release | null> {
  pending ??= (async () => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached) as Release;
    } catch {
      // Storage blocked. Ask GitHub instead.
    }

    try {
      const response = await fetch(site.latestReleaseApi, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!response.ok) return null;
      const body = (await response.json()) as {
        tag_name: string;
        html_url: string;
        assets: { name: string; size: number; browser_download_url: string }[];
      };

      const assets: Record<string, Asset> = {};
      for (const download of downloads) {
        const asset = body.assets.find((a) => download.match.test(a.name));
        if (asset) assets[download.key] = { url: asset.browser_download_url, name: asset.name, size: asset.size };
      }
      const release = { tag: body.tag_name, page: body.html_url, assets };

      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(release));
      } catch {
        // Only costs a second request on the next page load.
      }
      return release;
    } catch {
      // Offline, or GitHub's unauthenticated rate limit. The buttons keep
      // pointing at the release page.
      return null;
    }
  })();
  return pending;
}

type UAData = { getHighEntropyValues(hints: string[]): Promise<{ architecture?: string }> };

async function detectVisitor(): Promise<Visitor> {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPod/.test(ua)) return 'handheld';
  if (/Macintosh/.test(ua)) {
    // iPadOS asks for the desktop site and says it's a Mac. Touch gives it away.
    if (navigator.maxTouchPoints > 1) return 'handheld';
    // Only Chromium says which chip. Everyone else gets Apple Silicon, which
    // is every Mac sold since 2020, with Intel one link away.
    const uaData = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
    try {
      const { architecture } = (await uaData?.getHighEntropyValues(['architecture'])) ?? {};
      if (architecture === 'x86') return 'mac-intel';
    } catch {
      // Refused. Fall through to the default.
    }
    return 'mac-arm';
  }
  if (/Linux|X11|CrOS/.test(ua)) return 'linux';
  return 'windows';
}

const megabytes = (bytes: number) => `${Math.max(1, Math.round(bytes / 1048576))} MB`;

/**
 * The one filled button, pointed at the file that suits the machine reading
 * the page. Without JavaScript, before the first release, or if GitHub
 * doesn't answer, every link goes to the release page instead.
 *
 * The server render assumes Windows, where most streaming PCs are, so the
 * common case never changes label after load.
 */
export function DownloadButton() {
  const [visitor, setVisitor] = useState<Visitor>('windows');
  const [release, setRelease] = useState<Release | null>(null);
  const [started, setStarted] = useState<{ download: Download; asset: Asset } | null>(null);

  useEffect(() => {
    let live = true;
    detectVisitor().then((v) => live && setVisitor(v));
    latestRelease().then((r) => live && setRelease(r));
    return () => {
      live = false;
    };
  }, []);

  const hrefFor = (download: Download) => release?.assets[download.key]?.url ?? site.releasesUrl;
  const onPick = (download: Download) => () => {
    const asset = release?.assets[download.key];
    if (asset) setStarted({ download, asset });
  };

  if (visitor === 'handheld') {
    return (
      <div>
        <a href={site.releasesUrl} className="pill pill-primary pill-lg">
          Windows, macOS and Linux
        </a>
        <p className="mt-4 max-w-[34rem] text-[0.9375rem] text-(--text-2)">
          WidgetCake runs on your streaming PC, not your phone. Open this page there and the
          button picks the right file.
        </p>
      </div>
    );
  }

  const primary = downloads.find((d) => d.key === PRIMARY[visitor]) ?? downloads[0];
  const others = [
    ...downloads.filter((d) => d.platform === primary.platform && d !== primary),
    ...downloads.filter((d) => d.platform !== primary.platform),
  ];
  const primaryAsset = release?.assets[primary.key];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <a href={hrefFor(primary)} onClick={onPick(primary)} className="pill pill-primary pill-lg">
          <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M3 13.5h10" />
          </svg>
          {primary.button}
        </a>
        <p className="mono-caps flex flex-wrap gap-x-4 text-(--text-3)">
          <span>{primary.label}</span>
          {release ? <span>{release.tag}</span> : null}
          {primaryAsset ? <span>{megabytes(primaryAsset.size)}</span> : null}
          <span>Free</span>
        </p>
      </div>

      <p className="mt-5 text-[0.9375rem] text-(--text-2)">
        Also for{' '}
        {others.map((download, i) => (
          <span key={download.key}>
            <a
              href={hrefFor(download)}
              onClick={onPick(download)}
              className="font-semibold whitespace-nowrap text-(--text) underline decoration-(--text-3) underline-offset-4 hover:decoration-(--text)"
            >
              {download.label}
            </a>
            {i < others.length - 1 ? ', ' : ''}
          </span>
        ))}
        , or see{' '}
        <a href={release?.page ?? site.releasesUrl} className="font-semibold text-(--text) underline decoration-(--text-3) underline-offset-4 hover:decoration-(--text)">
          every release
        </a>
        .
      </p>

      <div aria-live="polite">
        {started ? (
          <div className="mt-8 max-w-[38rem] border border-(--line) bg-(--raised)">
            <p className="strip mono-caps">
              <span>Your download has started</span>
            </p>
            <p className="border-b border-(--line) px-[18px] py-3 font-mono text-[0.8125rem] break-all text-(--text-2)">
              {started.asset.name}
            </p>
            <ol>
              {started.download.after.map((step, index) => (
                <li
                  key={step.text}
                  className={`grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 px-[18px] py-3.5 ${index > 0 ? 'border-t border-(--line)' : ''}`}
                >
                  <span className="font-semibold text-(--text-3) tabular-nums">{index + 1}</span>
                  <div className="text-[0.9375rem] text-(--text-2)">
                    {step.text}
                    {step.code ? <code className="code mt-2.5 text-(--text)">{step.code.replace('{file}', started.asset.name)}</code> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
}
