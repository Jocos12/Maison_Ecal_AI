import { SITE_LINKS } from '../../config/site.js';

/**
 * Official Maison ECAL logo (the image used on the website), linking to the website.
 * The tagline is optional (hidden on very small screens unless `alwaysShowTagline` is set);
 * `compact` gives the smaller version used in the narrow sidebar rail; `width` overrides the logo width in pixels.
 */
export default function HeaderLogo({ tagline, compact = false, width, alwaysShowTagline = false, className = '' }) {
  const logoWidth = width ?? (compact ? 62 : 104);

  return (
    <a
      href={SITE_LINKS.home}
      target="_blank"
      rel="noreferrer"
      className={`group flex min-w-0 items-center gap-2.5 ${className}`}
      title="Maison ECAL, site officiel"
    >
      <img
        src="/brand/ecal-logo.png"
        alt="Maison ECAL"
        width={logoWidth}
        style={{ width: logoWidth, height: 'auto' }}
        className="flex-none select-none dark:brightness-0 dark:invert"
        draggable={false}
      />
      {tagline ? (
        <span
          className={`max-w-[132px] text-[9.5px] font-semibold uppercase leading-[1.35] tracking-[0.06em] text-slate-500 dark:text-slate-400 ${
            alwaysShowTagline ? 'block' : 'hidden sm:block'
          }`}
        >
          {tagline}
        </span>
      ) : null}
    </a>
  );
}
