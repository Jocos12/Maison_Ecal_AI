export const PRIMARY_SKIP_KEYS = ['not_mecal_service', 'non_logistics', 'job_posting', 'hors_rdc', 'not_a_tender'];

export function isGenericKeywordJustification(text) {
  return /^Score de secours/i.test(String(text || '').trim());
}
