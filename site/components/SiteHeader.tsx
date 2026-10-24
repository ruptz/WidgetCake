import { nav, site } from '@/lib/content';

/** The launcher's title bar, as a page header: brand cell, then the ways in. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-(--line) bg-(--ground)/92 backdrop-blur-md">
      <div className="frame flex h-[60px] items-stretch">
        <a href="/" className="flex items-center gap-3 border-r border-(--line) pr-5 pl-4 sm:pl-5" aria-label={`${site.name} home`}>
          <img src="/widgetcake.png" alt="" width={30} height={30} className="rounded-[7px]" />
          <span className="wordmark text-[1.0625rem]">WIDGETCAKE</span>
        </a>
        <nav className="hidden items-stretch md:flex" aria-label="Sections">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="flex items-center px-4 text-[0.9375rem] font-semibold text-(--text-2) hover:bg-(--hover) hover:text-(--text)">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-5 pr-4 sm:pr-5">
          <a href={site.repoUrl} className="link mono-caps hidden sm:inline">
            GitHub ↗
          </a>
          <a href="#download" className="pill pill-primary h-9 px-[18px] text-[0.875rem]">
            Download
          </a>
        </div>
      </div>
    </header>
  );
}
