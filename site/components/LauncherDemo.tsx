'use client';

import { useEffect, useState } from 'react';
import { apps, chatter, demo, nowPlaying, type App, type Caption } from '@/lib/content';

/**
 * The launcher, working, in the middle of the page. Launch and Stop do what
 * they do in the app, minus the app: the plate comes alive, the tag says
 * Running, the OBS line appears and the on-air count goes up. Nothing is
 * downloaded and nothing leaves the page.
 */
export function LauncherDemo() {
  const [live, setLive] = useState<Record<string, boolean>>({});
  const running = apps.filter((app) => live[app.id]).length;
  const toggle = (id: string) => setLive((was) => ({ ...was, [id]: !was[id] }));

  return (
    <div className="window">
      <div className="window-bar">
        <div className="window-brand">
          <img src="/widgetcake.png" alt="" width={24} height={24} className="rounded-[6px]" />
          <span className="wordmark text-[0.9375rem]">WIDGETCAKE</span>
        </div>
        <div className="hidden items-stretch gap-1 px-3 md:flex" aria-hidden="true">
          {apps.map((app) => (
            <span
              key={app.id}
              className="switch-item"
              data-live={Boolean(live[app.id])}
              style={{ '--app': app.colour } as React.CSSProperties}
            >
              <span className="mark h-6 w-6">
                <img src={app.logo} alt="" width={24} height={24} />
              </span>
              {app.own}Layer
            </span>
          ))}
        </div>
        <div className="window-controls" aria-hidden="true">
          <span>
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor"><path d="M0 5.5h10" /></svg>
          </span>
          <span>
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor"><rect x="0.5" y="0.5" width="9" height="9" /></svg>
          </span>
          <span>
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor"><path d="M0 0l10 10M10 0L0 10" /></svg>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-[18px] pb-4">
        <h3 className="text-[1.3125rem] font-[650] tracking-[-0.01em]">Your overlays</h3>
        <p className="onair mono-caps ml-auto flex items-center gap-2.5 text-(--text-3)" data-live={running > 0}>
          <span className="lamp" />
          {running === 0 ? 'Nothing on air' : `${running} on air`}
        </p>
      </div>

      <ul className="cells mx-4 mb-4 grid-cols-1 lg:grid-cols-3">
        {apps.map((app) => (
          <AppCell key={app.id} app={app} live={Boolean(live[app.id])} onToggle={() => toggle(app.id)} />
        ))}
        <li className="soon-cell flex flex-col">
          <div className="strip mono-caps text-(--text-3)">
            <span>Next</span>
          </div>
          <div className="flex flex-1 flex-col p-[18px] pb-5">
            <div className="flex items-center gap-3.5">
              <span className="soon-mark h-[50px] w-[50px]">+</span>
              <div className="min-w-0">
                <h4 className="name text-[1.6875rem] text-(--text-3)">{demo.soon.name}</h4>
                <p className="mt-1 text-(--text-3)">{demo.soon.tagline}</p>
              </div>
            </div>
            <div className="plate mt-[18px]" />
          </div>
        </li>
      </ul>
    </div>
  );
}

function AppCell({ app, live, onToggle }: { app: App; live: boolean; onToggle: () => void }) {
  const url = `http://127.0.0.1:${app.port}${app.path}`;
  return (
    <li className="app-cell flex flex-col" data-live={live}>
      <div className="strip mono-caps">
        <span>Installed</span>
        <span className="tag">{live ? 'Running' : 'Off'}</span>
      </div>
      <div className="flex flex-1 flex-col p-[18px] pb-5">
        <div className="flex items-center gap-3.5">
          <span className="mark h-[50px] w-[50px]">
            <img src={app.logo} alt="" width={50} height={50} />
          </span>
          <div className="min-w-0">
            <h4 className="name text-[1.6875rem]">
              {app.own}
              <span>Layer</span>
            </h4>
            <p className="mt-1 text-[0.9375rem] text-(--text-2)">{app.tagline}</p>
          </div>
        </div>

        <div className="plate mt-[18px]" aria-hidden="true">
          {app.id === 'chatterlayer' ? <ChatterPlate live={live} /> : <JammyPlate />}
        </div>

        <p className={`mono-caps mt-3.5 flex min-w-0 items-center gap-3 text-(--text-3) ${live ? '' : 'invisible'}`}>
          <span>OBS</span>
          <code className="min-w-0 truncate font-mono text-[0.78rem] tracking-normal text-(--text-2) normal-case">{url}</code>
        </p>

        <div className="mt-auto flex items-center gap-2 pt-5">
          <a href={app.website ?? app.github} className="link mono-caps mr-auto" target="_blank" rel="noopener">
            {app.website ? 'Website ↗' : 'GitHub ↗'}
          </a>
          {live ? (
            <button type="button" className="pill" onClick={onToggle}>
              Stop
            </button>
          ) : (
            <button type="button" className="pill pill-primary" onClick={onToggle}>
              Launch
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function CaptionLine({ line, arriving }: { line: Caption; arriving?: boolean }) {
  return (
    <div className={`caption${arriving ? ' arriving' : ''}`} style={{ '--ch': line.colour } as React.CSSProperties}>
      <b>{line.who}</b>
      {line.said}
    </div>
  );
}

/** While it runs, new lines keep arriving at the bottom, as on stream. */
function ChatterPlate({ live }: { live: boolean }) {
  const [shown, setShown] = useState<{ n: number; line: Caption }[]>([
    { n: 0, line: chatter[0] },
    { n: 1, line: chatter[1] },
  ]);

  useEffect(() => {
    if (!live || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      setShown((was) => {
        const n = was[was.length - 1].n + 1;
        return [...was, { n, line: chatter[n % chatter.length] }].slice(-3);
      });
    }, 2600);
    return () => clearInterval(timer);
  }, [live]);

  return (
    <div className="captions">
      {shown.map(({ n, line }) => (
        <CaptionLine key={n} line={line} arriving={n > 1} />
      ))}
    </div>
  );
}

function JammyPlate() {
  return (
    <div className="track">
      <span className="art" />
      <div className="min-w-0 flex-1">
        <div className="text-[0.84rem] leading-tight font-bold">{nowPlaying.title}</div>
        <div className="text-[0.72rem] text-[#8a9299]">{nowPlaying.artist}</div>
        <div className="progress">
          <i />
        </div>
      </div>
    </div>
  );
}
