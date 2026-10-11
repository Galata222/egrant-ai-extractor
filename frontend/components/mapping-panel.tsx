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
    <section className="rounded-[24px] border border-line bg-card p-5">
      <h2 className="display text-2xl">{copy.mappingTitle}</h2>
      <p className="mt-1 text-muted">{copy.mappingHint}</p>
      <label className="mt-4 block font-medium" htmlFor="form-export">
        JSON
      </label>
      <textarea
        id="form-export"
        value={value.formText}
        onChange={(event) => onChange({ ...value, formText: event.target.value })}
        rows={6}
        className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm"
      />
      {value.formText.trim() && !parsed.ok ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {copy.mappingInvalid}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-medium transition duration-200 hover:bg-soft">
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
          className="h-10 rounded-full bg-ink px-4 text-sm font-medium text-canvas transition duration-200 hover:opacity-85"
        >
          {copy.mappingExample}
        </button>
        <button
          type="button"
          onClick={() => onChange({ formText: "", fields: {}, lines: {} })}
          className="h-10 rounded-full border border-line px-4 text-sm font-medium transition duration-200 hover:bg-soft"
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
                className="mt-1 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-base"
              >
                <option value="">{copy.mappingNone}</option>
                {scalars.map((field) => (
                  <option key={field.path} value={field.path}>
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
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-base"
                >
                  <option value="">{copy.mappingNone}</option>
                  {columns.map((field) => (
                    <option key={field.path} value={field.path}>
                      {field.tableName} / {field.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {ready ? <p className="mt-4 text-sm font-medium">{copy.mappingReady}</p> : null}
    </section>
  );
}
