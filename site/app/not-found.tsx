import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="frame px-4 py-24 sm:px-8 sm:py-32">
        <h1 className="name text-[clamp(2.75rem,7vw,5.5rem)] font-extrabold">Nothing here.</h1>
        <p className="mt-6 max-w-[34rem] text-[1.1875rem] text-(--text-2)">
          WidgetCake is a single page, so whatever you were after is on it.
        </p>
        <p className="mt-10">
          <a href="/" className="pill pill-primary pill-lg">
            Back to the start
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
