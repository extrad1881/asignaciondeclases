"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DataTableAdvancedRow = {
  id: string;
  cells: React.ReactNode[];
  searchText?: string;
  filters?: Record<string, string | number | null | undefined>;
};

export type DataTableAdvancedFilter = {
  key: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
};

export function DataTableAdvanced({
  headers,
  rows,
  filters = [],
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 25,
  emptyLabel = "Sin registros.",
  emptyDescription = "Ajusta los filtros o registra información para ver resultados.",
  loading = false
}: {
  headers: string[];
  rows: DataTableAdvancedRow[];
  filters?: DataTableAdvancedFilter[];
  pageSizeOptions?: number[];
  initialPageSize?: number;
  emptyLabel?: string;
  emptyDescription?: string;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const filterOptions = useMemo(() => {
    return filters.map((filter) => {
      if (filter.options) return filter;
      const values = new Map<string, string>();
      rows.forEach((row) => {
        const rawValue = row.filters?.[filter.key];
        if (rawValue != null && String(rawValue).length > 0) {
          values.set(String(rawValue), String(rawValue));
        }
      });
      return {
        ...filter,
        options: Array.from(values, ([value, label]) => ({ value, label })).sort((a, b) =>
          a.label.localeCompare(b.label)
        )
      };
    });
  }, [filters, rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        normalizedQuery.length === 0 || (row.searchText ?? "").toLowerCase().includes(normalizedQuery);
      const matchesFilters = Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true;
        return String(row.filters?.[key] ?? "") === value;
      });
      return matchesQuery && matchesFilters;
    });
  }, [activeFilters, query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="rounded-md border border-line bg-card text-card-foreground shadow-subtle">
      <div className="grid gap-3 border-b border-line p-3 lg:grid-cols-[minmax(240px,1fr)_auto]">
        <Input
          aria-label="Buscar"
          onChange={(event) => {
            setQuery(event.target.value);
            resetPage();
          }}
          placeholder="Buscar por nombre, carrera, grupo o estado..."
          value={query}
        />
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => (
            <Select
              aria-label={filter.label}
              className="min-w-40"
              key={filter.key}
              onChange={(event) => {
                setActiveFilters((current) => ({ ...current, [filter.key]: event.target.value }));
                resetPage();
              }}
              value={activeFilters[filter.key] ?? ""}
            >
              <option value="">{filter.label}</option>
              {(filter.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ))}
          <Select
            aria-label="Tamaño de página"
            className="w-32"
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              resetPage();
            }}
            value={pageSize}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} filas
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-b border-line bg-panel px-4 py-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>{filteredRows.length} resultado(s) encontrados</span>
        <span>Usa búsqueda y filtros para acotar la información.</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-panel text-xs uppercase tracking-wide text-muted">
            <tr>
              {headers.map((header) => (
                <th className="px-4 py-3 font-semibold" key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={headers.length}>
                  Cargando información...
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan={headers.length}>
                  <EmptyState description={emptyDescription} title={emptyLabel} />
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr className={cn("border-t border-line hover:bg-brandSoft/40")} key={row.id}>
                  {row.cells.map((cell, cellIndex) => (
                    <td className="px-4 py-3 align-top" key={`${row.id}-${cellIndex}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-3 py-3 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <span>
          {filteredRows.length === 0
            ? "0 registros"
            : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filteredRows.length)} de ${filteredRows.length}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="focus-ring rounded-md border border-line bg-background px-3 py-1 font-medium text-ink disabled:opacity-50"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Anterior
          </button>
          <span>
            Página {safePage} de {totalPages}
          </span>
          <button
            className="focus-ring rounded-md border border-line bg-background px-3 py-1 font-medium text-ink disabled:opacity-50"
            disabled={safePage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
