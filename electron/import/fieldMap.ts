import { FIELDS, PHOTO_FIELDS } from '../../schema/canonical';

/** Build a normalized lookup: legacyAlias (lowercase, trimmed) -> canonicalKey */
function buildAliasMap(): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of FIELDS) {
    m.set(normalize(f.key), f.key);
    m.set(normalize(f.label), f.key);
    for (const a of f.legacyAliases) m.set(normalize(a), f.key);
  }
  return m;
}

function buildPhotoAliasMap(): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of PHOTO_FIELDS) {
    m.set(normalize(p.role), p.role);
    m.set(normalize(p.label), p.role);
    for (const a of p.legacyAliases) m.set(normalize(a), p.role);
  }
  return m;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

const ALIAS = buildAliasMap();
const PHOTO_ALIAS = buildPhotoAliasMap();

/** Resolve a source column name to a canonical text-field key, or null if it's not a known text field. */
export function resolveFieldKey(srcName: string): string | null {
  return ALIAS.get(normalize(srcName)) ?? null;
}

/** Resolve a source column name to a photo role, or null if it's not a known photo field. */
export function resolvePhotoRole(srcName: string): string | null {
  return PHOTO_ALIAS.get(normalize(srcName)) ?? null;
}

/** Split a single "Name" string (legacy 2017) into first/last. */
export function splitName(full: string): { first_name: string; last_name: string } {
  const trimmed = (full ?? '').trim();
  if (!trimmed) return { first_name: '', last_name: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0]!, last_name: '' };
  return { first_name: parts[0]!, last_name: parts.slice(1).join(' ') };
}
