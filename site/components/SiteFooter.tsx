import { site } from '@/lib/content';

/** The launcher's status line, at the foot of the page. */
export function SiteFooter() {
  return (
    <footer className="border-t border-(--line)">
      <div className="frame mono-caps flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 text-(--text-3) sm:px-5">
        <span>Made by {site.author}, free and MIT licensed</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Elsewhere">
          <a href={site.repoUrl} className="link">GitHub ↗</a>
          <a href={site.issuesUrl} className="link">Report a problem ↗</a>
          <a href={site.kofiUrl} className="link">Ko-fi ↗</a>
        </nav>
      </div>
    </footer>
  );
}
