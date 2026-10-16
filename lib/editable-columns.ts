// ─────────────────────────────────────────────────────────────────────────────
// Bewerkbare kolommen — de "veilige set"
// ─────────────────────────────────────────────────────────────────────────────
//
// Deze lijst bepaalt exact welke velden van een `locations`-record via de
// /beheer-UI bewerkt en ingevoerd mogen worden. Alle inhoudelijke /
// beschrijvende velden staan erin.
//
// BEWUST NIET bewerkbaar (door het systeem/pipeline beheerd, dus niet in het
// formulier en niet mee-gestuurd bij insert/update):
//   id, fis_id, isrs_code, btb_code      → identificatie
//   lat, lon                             → coördinaten
//   aangemaakt_op, bijgewerkt_op         → tijdstempels
//   primaire_bron, gewijzigd_door_bron   → provenance
//
// De dropdown-opties/labels sluiten aan op lib/location-filters.ts en
// components/locations-table.tsx, zodat de hele viewer consistent blijft.

import { TYPE_KADE_LABEL } from "@/lib/location-filters";
import type { Location } from "@/components/locations-table";

export type EditableFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "date";

export type SelectOption = { value: string; label: string };

export type EditableField = {
  /** Kolomnaam in de `locations`-tabel (en key op het `Location`-type). */
  key: EditableColumn;
  /** Nederlands label in het formulier. */
  label: string;
  type: EditableFieldType;
  /** Groepskop waaronder het veld in het formulier valt. */
  group: FieldGroup;
  /** Altijd verplicht (client-side gemarkeerd + gevalideerd). */
  required?: boolean;
  /**
   * Alleen verplicht bij BEWERKEN. Bij een nieuw record mag het leeg blijven
   * (bv. verificatiestatus: de DB-trigger vult dan een default). De kolom is
   * wel NOT NULL in de database.
   */
  requiredOnEdit?: boolean;
  /** Eenheid die achter een getalveld wordt getoond (bv. "m", "m²", "%"). */
  unit?: string;
  /** Alleen gehele getallen toestaan. */
  integer?: boolean;
  /** Ondergrens voor getallen (standaard 0 waar logisch). */
  min?: number;
  /** Bovengrens voor getallen (bv. 100 voor percentage). */
  max?: number;
  /** Opties voor een select-veld. */
  options?: SelectOption[];
  /** Korte toelichting onder het veld. */
  help?: string;
};

export type FieldGroup =
  | "Algemeen"
  | "Ligging"
  | "Afmetingen & capaciteit"
  | "Overslag & goederen"
  | "Voorzieningen"
  | "Milieu & vergunning"
  | "Verificatie & notities";

// ─── Dropdown-opties (gedeeld met tabel/filters) ──────────────────────────────

export const TYPE_KADE_OPTIONS: SelectOption[] = Object.entries(TYPE_KADE_LABEL).map(
  ([value, label]) => ({ value, label })
);

// Waarden gelijk aan de DB-CHECK-constraint op verificatiestatus.
export const VERIFICATIESTATUS_OPTIONS: SelectOption[] = [
  { value: "automatisch", label: "Automatisch" },
  { value: "expert", label: "Expert" },
  { value: "schipper", label: "Schipper" },
];

// Waarden gelijk aan de DB-CHECK-constraint op cemt_klasse (geen VII).
export const CEMT_KLASSE_OPTIONS: SelectOption[] = [
  "0", "I", "II", "III", "IV", "Va", "Vb", "VIa", "VIb", "VIc",
].map((v) => ({ value: v, label: v }));

// ─── De veldlijst in formulier-volgorde ───────────────────────────────────────

export const EDITABLE_FIELDS: EditableField[] = [
  // Algemeen
  { key: "naam", label: "Naam", type: "text", group: "Algemeen", required: true },
  { key: "alternatieve_naam", label: "Alternatieve naam", type: "text", group: "Algemeen" },
  { key: "type_kade", label: "Type kade", type: "select", group: "Algemeen", options: TYPE_KADE_OPTIONS },

  // Ligging
  { key: "plaatsnaam", label: "Plaatsnaam", type: "text", group: "Ligging" },
  { key: "gemeente", label: "Gemeente", type: "text", group: "Ligging" },
  { key: "vaarweg", label: "Vaarweg", type: "text", group: "Ligging" },
  { key: "kilometerraai", label: "Kilometerraai", type: "number", group: "Ligging", min: 0 },
  { key: "cemt_klasse", label: "CEMT-klasse", type: "select", group: "Ligging", options: CEMT_KLASSE_OPTIONS },
  { key: "openbaar_toegankelijk", label: "Openbaar toegankelijk", type: "boolean", group: "Ligging" },
  { key: "toegankelijk_voor_zeevaart", label: "Toegankelijk voor zeevaart", type: "boolean", group: "Ligging" },

  // Afmetingen & capaciteit
  { key: "kadelengte_m", label: "Kadelengte", type: "number", group: "Afmetingen & capaciteit", unit: "m", min: 0 },
  { key: "kadebreedte_m", label: "Kadebreedte", type: "number", group: "Afmetingen & capaciteit", unit: "m", min: 0 },
  { key: "kadevlak_m2", label: "Kadevlak", type: "number", group: "Afmetingen & capaciteit", unit: "m²", min: 0 },
  { key: "perc_verhard_oppervlak", label: "Verhard oppervlak", type: "number", group: "Afmetingen & capaciteit", unit: "%", min: 0, max: 100 },
  { key: "max_scheepslengte_m", label: "Max. scheepslengte", type: "number", group: "Afmetingen & capaciteit", unit: "m", min: 0 },
  { key: "max_scheepsbreedte_m", label: "Max. scheepsbreedte", type: "number", group: "Afmetingen & capaciteit", unit: "m", min: 0 },
  { key: "max_diepgang_m", label: "Max. diepgang", type: "number", group: "Afmetingen & capaciteit", unit: "m", min: 0 },
  { key: "max_doorvaarthoogte_m", label: "Max. doorvaarthoogte", type: "number", group: "Afmetingen & capaciteit", unit: "m", min: 0 },
  { key: "max_duwvaartlengte_m", label: "Max. duwvaartlengte", type: "number", group: "Afmetingen & capaciteit", unit: "m", min: 0 },
  { key: "max_duwvaartbreedte_m", label: "Max. duwvaartbreedte", type: "number", group: "Afmetingen & capaciteit", unit: "m", min: 0 },
  { key: "afmeren_mogelijk", label: "Afmeren mogelijk", type: "boolean", group: "Afmetingen & capaciteit" },
  { key: "aantal_bolders", label: "Aantal bolders", type: "number", group: "Afmetingen & capaciteit", integer: true, min: 0 },
  { key: "meerpalen_aanwezig", label: "Meerpalen aanwezig", type: "boolean", group: "Afmetingen & capaciteit" },

  // Overslag & goederen
  { key: "heeft_overslag", label: "Heeft overslag", type: "boolean", group: "Overslag & goederen" },
  { key: "droge_bulk", label: "Droge bulk", type: "boolean", group: "Overslag & goederen" },
  { key: "natte_bulk", label: "Natte bulk", type: "boolean", group: "Overslag & goederen" },
  { key: "break_bulk", label: "Break bulk", type: "boolean", group: "Overslag & goederen" },
  { key: "containers", label: "Containers", type: "boolean", group: "Overslag & goederen" },
  { key: "container_lagen", label: "Containerlagen", type: "number", group: "Overslag & goederen", integer: true, min: 0 },
  { key: "container_lagen_opmerking", label: "Toelichting containerlagen", type: "textarea", group: "Overslag & goederen" },
  { key: "passagiers", label: "Passagiers", type: "boolean", group: "Overslag & goederen" },
  { key: "overig_goederen", label: "Overige goederen", type: "boolean", group: "Overslag & goederen" },
  { key: "adn_klasse", label: "ADN-klasse", type: "text", group: "Overslag & goederen" },

  // Voorzieningen
  { key: "vaste_kraan", label: "Vaste kraan", type: "boolean", group: "Voorzieningen" },
  { key: "mobiele_kraan", label: "Mobiele kraan", type: "boolean", group: "Voorzieningen" },
  { key: "transportband", label: "Transportband", type: "boolean", group: "Voorzieningen" },
  { key: "buisleiding", label: "Buisleiding", type: "boolean", group: "Voorzieningen" },
  { key: "trechter", label: "Trechter", type: "boolean", group: "Voorzieningen" },
  { key: "kiepsteiger", label: "Kiepsteiger", type: "boolean", group: "Voorzieningen" },
  { key: "silo", label: "Silo", type: "boolean", group: "Voorzieningen" },
  { key: "tankopslag", label: "Tankopslag", type: "boolean", group: "Voorzieningen" },
  { key: "open_opslag", label: "Open opslag", type: "boolean", group: "Voorzieningen" },
  { key: "gesloten_opslag", label: "Gesloten opslag", type: "boolean", group: "Voorzieningen" },
  { key: "brandstoflevering", label: "Brandstoflevering", type: "boolean", group: "Voorzieningen" },
  { key: "pomp", label: "Pomp", type: "boolean", group: "Voorzieningen" },

  // Milieu & vergunning
  { key: "milieuklasse", label: "Milieuklasse", type: "text", group: "Milieu & vergunning" },
  { key: "vergunningsinformatie", label: "Vergunningsinformatie", type: "textarea", group: "Milieu & vergunning" },

  // Verificatie & notities
  { key: "verificatiestatus", label: "Verificatiestatus", type: "select", group: "Verificatie & notities", options: VERIFICATIESTATUS_OPTIONS, requiredOnEdit: true, help: "Verplicht bij bewerken. Laat bij een nieuw record leeg om de database een standaardwaarde te laten zetten." },
  { key: "verificatiedatum", label: "Verificatiedatum", type: "date", group: "Verificatie & notities" },
  { key: "mapillary_link", label: "Mapillary-link", type: "text", group: "Verificatie & notities", help: "URL naar een straatbeeld/foto." },
  { key: "opmerking", label: "Opmerking", type: "textarea", group: "Verificatie & notities" },
];

// Een veld zoals het formulier het rendert — ruimer dan EditableField, zodat
// ook de insert-only coördinaten (lat/lon) via dezelfde widget kunnen.
export type FormField = Omit<EditableField, "key"> & { key: string };

// Coördinaten: alleen bij een NIEUW record getoond en meegestuurd.
// De DB geeft bewust wél insert-, maar géén update-recht op lat/lon; bij
// bewerken blijven ze dus buiten het formulier én buiten de payload.
// lat/lon zijn in de database NOT NULL zonder default.
export const INSERT_ONLY_FIELDS: FormField[] = [
  { key: "lat", label: "Latitude", type: "number", group: "Ligging", required: true, min: -90, max: 90, help: "Breedtegraad tussen -90 en 90 (bv. 51.92)." },
  { key: "lon", label: "Longitude", type: "number", group: "Ligging", required: true, min: -180, max: 180, help: "Lengtegraad tussen -180 en 180 (bv. 4.48)." },
];

// De groepen in weergavevolgorde.
export const FIELD_GROUPS: FieldGroup[] = [
  "Algemeen",
  "Ligging",
  "Afmetingen & capaciteit",
  "Overslag & goederen",
  "Voorzieningen",
  "Milieu & vergunning",
  "Verificatie & notities",
];

// ─── Afgeleide helpers ─────────────────────────────────────────────────────────

/** Alle keys die het `Location`-type heeft en die bewerkbaar zijn. */
export type EditableColumn =
  | "naam"
  | "alternatieve_naam"
  | "type_kade"
  | "plaatsnaam"
  | "gemeente"
  | "vaarweg"
  | "kilometerraai"
  | "cemt_klasse"
  | "openbaar_toegankelijk"
  | "toegankelijk_voor_zeevaart"
  | "kadelengte_m"
  | "kadebreedte_m"
  | "kadevlak_m2"
  | "perc_verhard_oppervlak"
  | "max_scheepslengte_m"
  | "max_scheepsbreedte_m"
  | "max_diepgang_m"
  | "max_doorvaarthoogte_m"
  | "max_duwvaartlengte_m"
  | "max_duwvaartbreedte_m"
  | "afmeren_mogelijk"
  | "aantal_bolders"
  | "meerpalen_aanwezig"
  | "heeft_overslag"
  | "droge_bulk"
  | "natte_bulk"
  | "break_bulk"
  | "containers"
  | "container_lagen"
  | "container_lagen_opmerking"
  | "passagiers"
  | "overig_goederen"
  | "adn_klasse"
  | "vaste_kraan"
  | "mobiele_kraan"
  | "transportband"
  | "buisleiding"
  | "trechter"
  | "kiepsteiger"
  | "silo"
  | "tankopslag"
  | "open_opslag"
  | "gesloten_opslag"
  | "brandstoflevering"
  | "pomp"
  | "milieuklasse"
  | "vergunningsinformatie"
  | "verificatiestatus"
  | "verificatiedatum"
  | "mapillary_link"
  | "opmerking";

/** De exacte set bewerkbare kolomnamen (handig voor select/payload-filtering). */
export const EDITABLE_COLUMNS: EditableColumn[] = EDITABLE_FIELDS.map((f) => f.key);

// Compile-time garantie dat elke editable key echt op het `Location`-type bestaat.
type _AssertKeysExist = EditableColumn extends keyof Location ? true : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assert: _AssertKeysExist = true;

/** Waarde van één record beperkt tot de bewerkbare kolommen. */
export type EditablePayload = Partial<Pick<Location, EditableColumn>>;

/**
 * Filtert een vrij object tot alleen de bewerkbare kolommen — zo kan er nooit
 * per ongeluk een systeemveld (id, lat/lon, provenance, …) mee-geschreven worden.
 */
export function pickEditable(input: Record<string, unknown>): EditablePayload {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE_COLUMNS) {
    if (key in input) out[key] = input[key];
  }
  return out as EditablePayload;
}
