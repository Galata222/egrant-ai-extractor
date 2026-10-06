"use client";

import { CANONICAL_FIELDS, EXAMPLE_MAPPING, LINE_FIELDS, readFormExport, type StoredMapping } from "@/lib/form-export";
import { useCopy } from "@/lib/locale";

type MappingPanelProps = {
  value: StoredMapping;
  onChange: (value: StoredMapping) => void;
};

export function MappingPanel({ value, onChange }: MappingPanelProps) {
  const copy = useCopy();
  const parsed = readFormExport(value.formText);
  const fields = parsed.ok ? parsed.fields : [];
  const scalars = fields.filter((field) => !field.tableTag);
  const columns = fields.filter((field) => field.tableTag);
  const ready =
    parsed.ok &&
    (Object.values(value.fields).some(Boolean) || Object.values(value.lines).some(Boolean));

  return (
    <section className="rounded-xl border border-[#d6d3d1] bg-white p-4">
      <h2 className="text-lg font-semibold">{copy.mappingTitle}</h2>
      <p className="mt-1 text-[#44403c]">{copy.mappingHint}</p>
      <label className="mt-4 block font-medium" htmlFor="form-export">
        JSON
      </label>
      <textarea
        id="form-export"
        value={value.formText}
        onChange={(event) => onChange({ ...value, formText: event.target.value })}
        rows={6}
        className="mt-1 w-full rounded-md border border-[#d6d3d1] px-3 py-2 font-mono text-sm"
      />
      {value.formText.trim() && !parsed.ok ? (
        <p role="alert" className="mt-2 text-sm text-[#7f1d1d]">
          {copy.mappingInvalid}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="inline-flex h-11 cursor-pointer items-center rounded-md border border-[#0f5132] px-4 font-semibold text-[#0f5132] hover:bg-[#f3faf6]">
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void file.text().then((formText) => onChange({ ...value, formText }));
            }}
          />
          {copy.mappingUpload}
        </label>
        <button
          type="button"
          onClick={() => onChange(EXAMPLE_MAPPING)}
          className="h-11 rounded-md border border-[#0f5132] px-4 font-semibold text-[#0f5132] hover:bg-[#f3faf6]"
        >
          {copy.mappingExample}
        </button>
        <button
          type="button"
          onClick={() => onChange({ formText: "", fields: {}, lines: {} })}
          className="h-11 rounded-md border border-[#d6d3d1] px-4 font-semibold hover:bg-[#f5f5f4]"
        >
          {copy.mappingClear}
        </button>
      </div>
      {parsed.ok && fields.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CANONICAL_FIELDS.map((key) => (
            <label key={key} className="block text-sm font-medium">
              {copy.canonical[key]}
              <select
                value={value.fields[key] ?? ""}
                onChange={(event) =>
                  onChange({ ...value, fields: { ...value.fields, [key]: event.target.value } })
                }
                className="mt-1 h-11 w-full rounded-md border border-[#d6d3d1] bg-white px-2 text-base"
              >
                <option value="">{copy.mappingNone}</option>
                {scalars.map((field) => (
                  <option key={field.tag} value={field.tag}>
                    {field.sectionName} / {field.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
      {columns.length > 0 ? (
        <div className="mt-4">
          <h3 className="font-semibold">{copy.mappingLines}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {LINE_FIELDS.map((key) => (
              <label key={key} className="block text-sm font-medium">
                {copy.lineFields[key]}
                <select
                  value={value.lines[key] ?? ""}
                  onChange={(event) =>
                    onChange({ ...value, lines: { ...value.lines, [key]: event.target.value } })
                  }
                  className="mt-1 h-11 w-full rounded-md border border-[#d6d3d1] bg-white px-2 text-base"
                >
                  <option value="">{copy.mappingNone}</option>
                  {columns.map((field) => (
                    <option key={`${field.tableTag}-${field.tag}`} value={field.tag}>
                      {field.tableName} / {field.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {ready ? <p className="mt-4 text-sm text-[#0f5132]">{copy.mappingReady}</p> : null}
    </section>
  );
}
