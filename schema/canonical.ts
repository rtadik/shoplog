// Single source of truth for the client schema.
// Drives DB DDL, form rendering, CSV export, and field mapping on import.

export type FieldGroup =
  | 'Order'
  | 'Contact'
  | 'Body'
  | 'Garment'
  | 'Trouser'
  | 'Photos'
  | 'Legacy';

export type FieldType = 'text' | 'date' | 'number' | 'photo';

export interface FieldDef {
  key: string;
  label: string;
  group: FieldGroup;
  type: FieldType;
  legacyAliases: string[];
  /** If true, hidden in the regular form (only visible when Legacy section is expanded). */
  legacy?: boolean;
}

export const FIELDS: FieldDef[] = [
  // --- Order ---
  { key: 'date', label: 'Date', group: 'Order', type: 'text', legacyAliases: ['Date'] },
  { key: 'order_no', label: 'Order No', group: 'Order', type: 'text', legacyAliases: ['order no', 'Order No'] },
  { key: 'code', label: 'Code', group: 'Order', type: 'text', legacyAliases: ['Code'] },
  { key: 'total_amount', label: 'Total Amount', group: 'Order', type: 'text', legacyAliases: ['total Ammount', 'total amount'] },
  { key: 'clothes_details', label: 'Clothes Details', group: 'Order', type: 'text', legacyAliases: ['Clothes Details', 'cloth detail'] },
  { key: 'fabric_name', label: 'Fabric Name', group: 'Order', type: 'text', legacyAliases: ['Fabric Name'] },

  // --- Contact ---
  { key: 'first_name', label: 'First Name', group: 'Contact', type: 'text', legacyAliases: ['First Name'] },
  { key: 'last_name', label: 'Last Name', group: 'Contact', type: 'text', legacyAliases: ['Last Name'] },
  { key: 'address', label: 'Address', group: 'Contact', type: 'text', legacyAliases: ['Address'] },
  { key: 'country', label: 'Country', group: 'Contact', type: 'text', legacyAliases: ['Country'] },
  { key: 'email', label: 'Email', group: 'Contact', type: 'text', legacyAliases: ['Email', 'E-mail'] },
  { key: 'phone', label: 'Phone', group: 'Contact', type: 'text', legacyAliases: ['Phone', 'Telephone'] },

  // --- Body ---
  { key: 'chest', label: 'Chest', group: 'Body', type: 'text', legacyAliases: ['Chest', 'chest'] },
  { key: 'waist', label: 'Waist', group: 'Body', type: 'text', legacyAliases: ['Waist', 'waist'] },
  { key: 'shoulder', label: 'Shoulder', group: 'Body', type: 'text', legacyAliases: ['Shoulder', 'shoulder'] },
  { key: 'hips', label: 'Hips', group: 'Body', type: 'text', legacyAliases: ['Hips', 'hips'] },
  { key: 'sleeve', label: 'Sleeve', group: 'Body', type: 'text', legacyAliases: ['Sleeve', 'sleeve'] },
  { key: 'front', label: 'Front', group: 'Body', type: 'text', legacyAliases: ['Front', 'front'] },
  { key: 'back', label: 'Back', group: 'Body', type: 'text', legacyAliases: ['Back', 'back'] },
  { key: 'shoulder_to_waist', label: 'Shoulder to Waist', group: 'Body', type: 'text', legacyAliases: ['Shoulder to Waist', 's to waist'] },
  { key: 'shoulder_to_bust', label: 'Shoulder to Bust', group: 'Body', type: 'text', legacyAliases: ['Shoulder to Bust', 's to bust'] },
  { key: 'bust_to_bust', label: 'Bust to Bust', group: 'Body', type: 'text', legacyAliases: ['Bust to Bust', 'bust to bust'] },
  { key: 'deep', label: 'Deep', group: 'Body', type: 'text', legacyAliases: ['Deep', 'deep'] },
  { key: 'back_1_or_2_cut', label: 'Back 1 or 2 cut', group: 'Body', type: 'text', legacyAliases: ['Back 1 or 2 cut', 'bac1back 1or2 cut'] },
  { key: 'neck', label: 'Neck', group: 'Body', type: 'text', legacyAliases: ['Neck'] },

  // --- Garment ---
  { key: 'jacket_l', label: 'Jacket L', group: 'Garment', type: 'text', legacyAliases: ['Jacket L'] },
  { key: 'shirt_l', label: 'Shirt L', group: 'Garment', type: 'text', legacyAliases: ['Shirt L', 'shirt L'] },
  { key: 'skirt_l_waist', label: 'Skirt L + Waist', group: 'Garment', type: 'text', legacyAliases: ['Skirt L + Waist', 'skirt L+waist+hips'] },
  { key: 'blouse_l', label: 'Blouse L', group: 'Garment', type: 'text', legacyAliases: ['Blouse L', 'blouse L'] },
  { key: 'top_l', label: 'Top L', group: 'Garment', type: 'text', legacyAliases: ['Top L', 'top L'] },
  { key: 'dress_l', label: 'Dress L', group: 'Garment', type: 'text', legacyAliases: ['Dress L', 'dress L'] },

  // --- Trouser ---
  { key: 'trouser_waist', label: 'Trouser Waist', group: 'Trouser', type: 'text', legacyAliases: ['Trouser Waist', 'pant waist'] },
  { key: 'belly', label: 'Belly', group: 'Trouser', type: 'text', legacyAliases: ['Belly', 'belly'] },
  { key: 't_hips', label: 'T Hips', group: 'Trouser', type: 'text', legacyAliases: ['T Hips', 'Hips:'] },
  { key: 'crotch', label: 'Crotch', group: 'Trouser', type: 'text', legacyAliases: ['Crotch', 'crotch'] },
  { key: 't_length', label: 'T Length', group: 'Trouser', type: 'text', legacyAliases: ['T Length', 'Length'] },
  { key: 'thigh', label: 'Thigh', group: 'Trouser', type: 'text', legacyAliases: ['Thigh', 'thigh'] },
  { key: 'knee', label: 'Knee', group: 'Trouser', type: 'text', legacyAliases: ['Knee', 'knee'] },
  { key: 'cuff', label: 'Cuff', group: 'Trouser', type: 'text', legacyAliases: ['Cuff', 'cuff'] },

  // --- Legacy (kept for lossless 2017 import) ---
  { key: 'mobile', label: 'Mobile', group: 'Legacy', type: 'text', legacyAliases: ['Mobile'], legacy: true },
  { key: 'fax', label: 'Fax', group: 'Legacy', type: 'text', legacyAliases: ['Fax'], legacy: true },
  { key: 'how_happy', label: 'How Happy?', group: 'Legacy', type: 'text', legacyAliases: ['howhappy?'], legacy: true },
  { key: 'image_object', label: 'Image Object', group: 'Legacy', type: 'text', legacyAliases: ['image object'], legacy: true },
  { key: 'legacy_id', label: 'Legacy ID', group: 'Legacy', type: 'text', legacyAliases: [], legacy: true },
];

export const PHOTO_FIELDS: { role: string; label: string; legacyAliases: string[] }[] = [
  { role: 'image', label: 'Customer / Garment Photo', legacyAliases: ['Image', 'smile photo'] },
  { role: 'fabric_photo', label: 'Fabric Photo', legacyAliases: ['Fabric Photo'] },
];

export const GROUP_ORDER: FieldGroup[] = [
  'Order',
  'Contact',
  'Body',
  'Garment',
  'Trouser',
  'Photos',
  'Legacy',
];

/** All non-photo column keys, for SQL DDL and CSV. */
export function columnKeys(): string[] {
  return FIELDS.map((f) => f.key);
}

/** Fields that count as "real" data when checking if an imported row is empty. */
export const SIGNAL_KEYS = [
  'first_name',
  'last_name',
  'order_no',
  'phone',
  'email',
  'chest',
  'waist',
  'shoulder',
  'hips',
  'sleeve',
];

/** Build a label-by-key lookup. */
export const FIELD_LABEL: Record<string, string> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f.label]),
);
