import { ArrowUpRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import { SITE_LINKS } from '../../config/site.js';
import HeaderLogo from './HeaderLogo.jsx';

const PAGES = [
  { key: 'home', href: SITE_LINKS.home },
  { key: 'about', href: SITE_LINKS.about },
  { key: 'projects', href: SITE_LINKS.projects },
  { key: 'event', href: SITE_LINKS.event },
  { key: 'contact', href: SITE_LINKS.contact }
];

/** Look of the panel that holds this content (the floating dock draws the box). */
export const SITE_MENU_SURFACE =
  'rounded-[1.75rem] border border-[#bfdccf] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900';

/** One line of the "form": a tinted label cell and a white cell holding the arrow. */
function Row({ href, index, label }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group grid grid-cols-[minmax(0,1fr)_2.5rem] overflow-hidden rounded-lg border border-[#bfdccf] bg-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b7f5c] dark:border-slate-600 dark:bg-slate-800"
      >
        <span className="flex items-center gap-2 bg-[#e1f1ea] px-3 py-2 text-[13px] font-semibold leading-snug text-[#0e1c33] transition group-hover:bg-[#1b7f5c] group-hover:text-white dark:bg-slate-700 dark:text-slate-100 dark:group-hover:bg-[#1b7f5c]">
          {index ? (
            <span className="font-mono text-[10px] font-bold text-[#1b7f5c] transition group-hover:text-white/80 dark:text-emerald-300">
              {index}
            </span>
          ) : null}
          {label}
        </span>
        <span className="flex items-center justify-center border-l border-[#bfdccf] text-[#1b7f5c] transition group-hover:bg-[#1b7f5c]/10 dark:border-slate-600 dark:text-emerald-300">
          <ArrowUpRight
            className="h-4 w-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </a>
    </li>
  );
}

function Section({ title, count, children }) {
  return (
    <section>
      <h3 className="flex items-center justify-between rounded-lg bg-[#1b7f5c] px-3 py-1.5 text-[13px] font-bold text-white">
        {title}
        <span className="rounded-md bg-white/20 px-1.5 font-mono text-[10px]">{count}</span>
      </h3>
      <ul className="mt-2 space-y-1.5">{children}</ul>
    </section>
  );
}

/**
 * The menus of the public Maison ECAL website (Accueil, A propos, Projets, Evenement, Contact and the six
 * services); every link opens the website. Laid out like a printed form: logo and title on top, tinted
 * section tabs, label and field rows.
 */
export default function SiteMenuPanel() {
  const { t } = useI18n();

  return (
    <>
      <header className="flex flex-none items-center justify-between gap-4 border-b-[3px] border-[#1b7f5c] px-5 py-4">
        <HeaderLogo width={124} />
        <div className="text-right">
          <p className="text-base font-extrabold uppercase leading-none tracking-wide text-[#1b7f5c] dark:text-emerald-300">
            {t('siteMenu.eyebrow')}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">maison-ecal-divers.com</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto bg-[#f2f9f5] p-4 sm:grid-cols-2 dark:bg-slate-900">
        <Section title={t('siteMenu.pages')} count={String(PAGES.length).padStart(2, '0')}>
          {PAGES.map(({ key, href }, i) => (
            <Row key={key} href={href} index={String(i + 1).padStart(2, '0')} label={t(`nav.${key}`)} />
          ))}
        </Section>
        <Section title={t('nav.services')} count={String(SITE_LINKS.services.length).padStart(2, '0')}>
          {SITE_LINKS.services.map((service) => (
            <Row key={service.key} href={service.href} label={t(`nav.serviceItems.${service.key}`)} />
          ))}
        </Section>
      </div>

      <footer className="flex-none border-t border-[#bfdccf] bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <a
          href={SITE_LINKS.home}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1c3a72] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24478a]/50"
        >
          {t('siteMenu.visit')}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </footer>
    </>
  );
}
