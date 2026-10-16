"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/components/locations-table";
import {
  EDITABLE_FIELDS,
  FIELD_GROUPS,
  EDITABLE_COLUMNS,
  INSERT_ONLY_FIELDS,
  type FormField,
  type EditablePayload,
} from "@/lib/editable-columns";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Save } from "lucide-react";

// ─── Formulierwaarde-model ──────────────────────────────────────────────────
// Per veld: tekst/select/date/number → string (number als ruwe string);
// boolean → true | false | null (null = "onbekend").
type FieldValue = string | boolean | null;
type FormValues = Record<string, FieldValue>;

function emptyValues(): FormValues {
  const v: FormValues = {};
  for (const f of [...EDITABLE_FIELDS, ...INSERT_ONLY_FIELDS]) {
    v[f.key] = f.type === "boolean" ? null : "";
  }
  return v;
}

function valuesFromRecord(rec: Partial<Location>): FormValues {
  const v: FormValues = {};
  for (const f of EDITABLE_FIELDS) {
    const raw = (rec as Record<string, unknown>)[f.key];
    if (f.type === "boolean") {
      v[f.key] = raw === null || raw === undefined ? null : Boolean(raw);
    } else if (f.type === "date") {
      // Alleen het datumdeel (YYYY-MM-DD) in het date-input.
      v[f.key] = raw ? String(raw).slice(0, 10) : "";
    } else {
      v[f.key] = raw === null || raw === undefined ? "" : String(raw);
    }
  }
  return v;
}

// ─── Validatie & payload-opbouw ─────────────────────────────────────────────

function isRequired(f: FormField, isEdit: boolean): boolean {
  return Boolean(f.required || (isEdit && f.requiredOnEdit));
}

// Valideert één veld en levert de genormaliseerde waarde voor de payload.
function validateField(
  f: FormField,
  raw: FieldValue,
  isEdit: boolean
): { error?: string; value: unknown } {
  const req = isRequired(f, isEdit);

  if (f.type === "boolean") {
    return { value: raw }; // tri-state: null (onbekend) is toegestaan
  }

  if (f.type === "number") {
    const s = String(raw ?? "").trim();
    if (s === "") return req ? { error: "Dit veld is verplicht.", value: null } : { value: null };
    const n = Number(s.replace(",", "."));
    if (Number.isNaN(n)) return { error: "Vul een geldig getal in.", value: null };
    if (f.integer && !Number.isInteger(n)) return { error: "Vul een heel getal in.", value: null };
    if (f.min !== undefined && n < f.min) return { error: `Mag niet kleiner zijn dan ${f.min}.`, value: null };
    if (f.max !== undefined && n > f.max) return { error: `Mag niet groter zijn dan ${f.max}.`, value: null };
    return { value: n };
  }

  // text / textarea / select / date
  const s = String(raw ?? "").trim();
  if (req && s === "") return { error: "Dit veld is verplicht.", value: null };
  return { value: s === "" ? null : s };
}

// Bouwt de payload van de bewerkbare "veilige set". lat/lon horen hier NIET bij
// (die worden alleen bij insert apart toegevoegd — zie handleSubmit).
function validateAndBuild(
  values: FormValues,
  isEdit: boolean
): { errors: Record<string, string>; payload: EditablePayload } {
  const errors: Record<string, string> = {};
  const payload: Record<string, unknown> = {};

  for (const f of EDITABLE_FIELDS) {
    const r = validateField(f, values[f.key], isEdit);
    if (r.error) errors[f.key] = r.error;
    payload[f.key] = r.value;
  }

  // Alleen bewerkbare kolommen meenemen (dubbele veiligheid naast het model).
  const clean: Record<string, unknown> = {};
  for (const key of EDITABLE_COLUMNS) clean[key] = payload[key];

  return { errors, payload: clean as EditablePayload };
}

// ─── Veld-widgets ────────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 text-sm rounded-md border border-gray-light bg-white focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20";

function TriStateToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const opts: { label: string; v: boolean | null }[] = [
    { label: "Ja", v: true },
    { label: "Nee", v: false },
    { label: "Onbekend", v: null },
  ];
  return (
    <div className="inline-flex rounded-md border border-gray-light overflow-hidden">
      {opts.map((o, i) => {
        const active = value === o.v;
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              i > 0 && "border-l border-gray-light",
              active
                ? o.v === true
                  ? "bg-lime text-navy-deep"
                  : o.v === false
                    ? "bg-navy text-white"
                    : "bg-gray-light text-navy/60"
                : "bg-white text-navy/60 hover:bg-gray-light/40"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  field,
  value,
  error,
  isEdit,
  onChange,
}: {
  field: FormField;
  value: FieldValue;
  error?: string;
  isEdit: boolean;
  onChange: (v: FieldValue) => void;
}) {
  const id = `field-${field.key}`;
  const required = isRequired(field, isEdit);
  return (
    <div className={cn("flex flex-col gap-1.5", field.type === "textarea" && "sm:col-span-2")}>
      <label htmlFor={id} className="text-sm font-medium text-navy">
        {field.label}
        {required && <span className="text-red-500 ml-0.5" title="Verplicht">*</span>}
        {field.unit && <span className="text-navy/40 font-normal ml-1">({field.unit})</span>}
      </label>

      {field.type === "boolean" ? (
        <TriStateToggle value={value as boolean | null} onChange={onChange} />
      ) : field.type === "select" ? (
        <select
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="">— Kies —</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      ) : field.type === "number" ? (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={field.integer ? "1" : "any"}
          min={field.min}
          max={field.max}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      ) : field.type === "date" ? (
        <input
          id={id}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      )}

      {field.help && <p className="text-xs text-navy/40">{field.help}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Hoofdcomponent ──────────────────────────────────────────────────────────
export function LocationForm({ id }: { id?: string }) {
  const router = useRouter();
  const isEdit = Boolean(id);

  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recordNaam, setRecordNaam] = useState<string | null>(null);

  // Bestaand record laden in edit-modus.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setLoadError("Kon het record niet laden: " + (error?.message ?? "niet gevonden"));
      } else {
        setValues(valuesFromRecord(data as Location));
        setRecordNaam((data as Location).naam ?? null);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const groupedFields = useMemo(() => {
    return FIELD_GROUPS.map((group) => {
      const fields: FormField[] = EDITABLE_FIELDS.filter((f) => f.group === group);
      // lat/lon alleen tonen bij een nieuw record (insert-only).
      if (!isEdit) {
        fields.push(...INSERT_ONLY_FIELDS.filter((f) => f.group === group));
      }
      return { group, fields };
    });
  }, [isEdit]);

  function setField(key: string, v: FieldValue) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSuccess(null);

    const { errors: errs, payload } = validateAndBuild(values, isEdit);

    // Coördinaten alleen bij een nieuw record valideren en meesturen.
    // (De DB geeft bewust wél insert-, maar géén update-recht op lat/lon.)
    const coords: Record<string, unknown> = {};
    if (!isEdit) {
      for (const f of INSERT_ONLY_FIELDS) {
        const r = validateField(f, values[f.key], isEdit);
        if (r.error) errs[f.key] = r.error;
        else coords[f.key] = r.value;
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setSaveError("Er zijn nog velden met een fout. Controleer de gemarkeerde velden.");
      // Scroll naar bovenkant zodat de melding zichtbaar is.
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (isEdit) {
      const { error } = await supabase.from("locations").update(payload).eq("id", id!);
      setSaving(false);
      if (error) {
        setSaveError("Opslaan mislukt: " + error.message);
        return;
      }
      setSuccess("Wijzigingen opgeslagen.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    } else {
      const { data, error } = await supabase
        .from("locations")
        .insert({ ...payload, ...coords })
        .select("id")
        .single();
      setSaving(false);
      if (error) {
        setSaveError("Toevoegen mislukt: " + error.message);
        return;
      }
      // Na toevoegen door naar de bewerkpagina van het nieuwe record.
      const newId = (data as { id: string } | null)?.id;
      if (newId) {
        router.replace(`/beheer/${newId}`);
        router.refresh();
      } else {
        router.replace("/beheer");
        router.refresh();
      }
    }
  }

  if (loading) {
    return <p className="text-sm text-navy/40">Record laden…</p>;
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{loadError}</p>
        <Link href="/beheer" className="text-sm text-blue hover:text-navy inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Terug naar overzicht
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Kop */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/beheer" className="text-sm text-blue hover:text-navy inline-flex items-center gap-1.5 mb-1">
            <ArrowLeft className="w-4 h-4" /> Terug naar overzicht
          </Link>
          <h2 className="text-xl font-bold text-navy-deep">
            {isEdit ? (recordNaam ? `Bewerken: ${recordNaam}` : "Record bewerken") : "Nieuw record"}
          </h2>
        </div>
      </div>

      {success && (
        <p className="text-sm text-navy-deep bg-lime/20 border border-lime/40 rounded-md px-3 py-2 flex items-center gap-2">
          <Check className="w-4 h-4 text-lime-700" /> {success}
        </p>
      )}
      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{saveError}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {groupedFields.map(({ group, fields }) => (
          <fieldset key={group} className="bg-white rounded-lg border border-gray-light shadow-sm p-5">
            <legend className="text-sm font-semibold text-navy uppercase tracking-wide px-2">
              {group}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-2">
              {fields.map((f) => (
                <Field
                  key={f.key}
                  field={f}
                  value={values[f.key]}
                  error={errors[f.key]}
                  isEdit={isEdit}
                  onChange={(v) => setField(f.key, v)}
                />
              ))}
            </div>
          </fieldset>
        ))}

        {/* Opslaan-balk */}
        <div className="sticky bottom-0 bg-gray-light/80 backdrop-blur border-t border-gray-light -mx-6 px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-navy/40">
            Velden met <span className="text-red-500">*</span> zijn verplicht.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/beheer"
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-light bg-white text-navy hover:border-navy/30 transition-colors"
            >
              Annuleren
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md bg-navy text-white hover:bg-navy-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Bezig…" : isEdit ? "Wijzigingen opslaan" : "Record toevoegen"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
