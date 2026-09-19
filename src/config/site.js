/** Site public officiel Maison ECAL */
export const MECAL_SITE = 'https://www.maison-ecal-divers.com';

export const SITE_LINKS = {
  home: `${MECAL_SITE}/index.html`,
  about: `${MECAL_SITE}/team.html`,
  projects: `${MECAL_SITE}/projects.html`,
  event: `${MECAL_SITE}/event.html`,
  contact: `${MECAL_SITE}/contact.html`,
  services: [
    { key: 'procurement', href: `${MECAL_SITE}/services/procurement.html` },
    { key: 'inventory', href: `${MECAL_SITE}/services/inventory-management.html` },
    { key: 'orders', href: `${MECAL_SITE}/services/order-management.html` },
    { key: 'consultancy', href: `${MECAL_SITE}/services/logistics-consultancy.html` },
    { key: 'support', href: `${MECAL_SITE}/services/logistics-support.html` },
    { key: 'fleet', href: `${MECAL_SITE}/services/fleet-management.html` }
  ]
};
