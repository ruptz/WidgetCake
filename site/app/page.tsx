import { DownloadButton } from '@/components/DownloadButton';
import { LauncherDemo } from '@/components/LauncherDemo';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { apps, demo, hero, promises, questions, steps } from '@/lib/content';

/** A section's own heading row: the name large on the left, what it's for beside it. */
function SectionHead({ id, title, lede }: { id: string; title: string; lede?: string }) {
  return (
    <div className="grid gap-x-10 gap-y-3 border-b border-(--line) px-4 pt-16 pb-8 sm:px-8 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
      <h2 id={`${id}-title`} className="name text-[clamp(2.25rem,5vw,3.75rem)]">{title}</h2>
      {lede ? <p className="max-w-[34rem] text-[1.0625rem] text-(--text-2)">{lede}</p> : null}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="frame">
        {/* ------------------------------------------------------------ hero */}
        <section id="download" className="grid border-b border-(--line) md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="px-4 pt-12 pb-14 sm:px-8 sm:pt-20 sm:pb-20">
            <img src="/widgetcake.png" alt="" width={96} height={96} className="mb-8 rounded-[22%] md:hidden" />
            <h1 className="name max-w-[11ch] text-[clamp(3rem,8vw,6.75rem)] leading-[0.98] font-extrabold">{hero.title}</h1>
            <p className="mt-8 max-w-[36rem] text-[1.1875rem] leading-[1.55] text-(--text-2)">{hero.lede}</p>
            <div className="mt-10">
              <DownloadButton />
            </div>
          </div>
          <div className="hidden items-center border-l border-(--line) p-10 md:flex lg:p-14">
            <img src="/widgetcake.png" alt="WidgetCake's logo: an engraved slice of layer cake" width={360} height={360} className="w-[clamp(15rem,26vw,22.5rem)] rounded-[22%]" />
          </div>
        </section>

        {/* -------------------------------------------------------- overlays */}
        <section id="overlays" aria-labelledby="overlays-title">
          <SectionHead id="overlays" title="The overlays" lede={demo.intro} />
          <div className="border-b border-(--line) px-3 py-10 sm:px-8 sm:py-14">
            <LauncherDemo />
          </div>
          <ul className="cells -mt-px grid-cols-1 border-l-0 md:grid-cols-2">
            {apps.map((app) => (
              <li key={app.id} className="flex flex-col px-4 py-8 sm:px-8 md:last:border-r-0">
                <div className="flex items-center gap-4">
                  <span className="mark h-14 w-14">
                    <img src={app.logo} alt="" width={56} height={56} />
                  </span>
                  <h3 className="name text-[1.875rem]">
                    {app.own}
                    <span>Layer</span>
                  </h3>
                </div>
                <p className="mt-5 max-w-[36rem] text-(--text-2)">{app.about}</p>
                <p className="mt-6 flex gap-5">
                  {app.website ? (
                    <a href={app.website} className="link mono-caps">
                      {app.website.replace('https://', '')} ↗
                    </a>
                  ) : null}
                  <a href={app.github} className="link mono-caps">GitHub ↗</a>
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------- how it works */}
        <section id="how" aria-labelledby="how-title">
          <SectionHead id="how" title="How it works" lede="Three steps, and the first is the only download from this page." />
          <ol className="cells -mt-px grid-cols-1 border-l-0 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="flex flex-col md:last:border-r-0">
                <p className="strip mono-caps">
                  <span>Step {i + 1}</span>
                </p>
                <div className="px-4 py-7 sm:px-8">
                  <h3 className="name text-[1.5rem]">{step.title}</h3>
                  <p className="mt-3 text-(--text-2)">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <ul className="cells -mt-px grid-cols-1 border-l-0 md:grid-cols-3">
            {promises.map((promise) => (
              <li key={promise.title} className="px-4 py-7 sm:px-8 md:last:border-r-0">
                <h3 className="text-[1.125rem] font-bold">{promise.title}</h3>
                <p className="mt-2 text-[0.9375rem] text-(--text-2)">{promise.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------- questions */}
        <section id="questions" aria-labelledby="questions-title">
          <SectionHead id="questions" title="Questions" />
          <dl className="cells -mt-px grid-cols-1 border-l-0 md:grid-cols-2">
            {questions.map((item) => (
              <div key={item.q} className="px-4 py-7 sm:px-8 md:even:border-r-0">
                <dt className="text-[1.1875rem] font-bold">{item.q}</dt>
                <dd className="mt-2.5 max-w-[38rem] text-(--text-2)">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
