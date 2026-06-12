"use client";

import { useMemo, useState } from "react";
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
  loading = false
}: {
  headers: string[];
  rows: DataTableAdvancedRow[];
  filters?: DataTableAdvancedFilter[];
  pageSizeOptions?: number[];
  initialPageSize?: number;
  emptyLabel?: string;
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
    <div className="rounded-md border border-line bg-white shadow-subtle">
      <div className="grid gap-3 border-b border-line p-3 lg:grid-cols-[1fr_auto]">
        <Input
          aria-label="Buscar"
          onChange={(event) => {
            setQuery(event.target.value);
            resetPage();
          }}
          placeholder="Buscar..."
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
            aria-label="Tamano de pagina"
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              {headers.map((header) => (
                <th className="px-4 py-3 font-semibold" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={headers.length}>
                  Cargando...
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={headers.length}>
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <tr className={cn("border-t border-line", rowIndex % 2 === 1 && "bg-slate-50/60")} key={row.id}>
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

      <div className="flex flex-col gap-2 border-t border-line px-3 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <span>
          {filteredRows.length === 0
            ? "0 registros"
            : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filteredRows.length)} de ${filteredRows.length}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-line px-3 py-1 disabled:opacity-50"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Anterior
          </button>
          <span>
            Pagina {safePage} de {totalPages}
          </span>
          <button
            className="rounded-md border border-line px-3 py-1 disabled:opacity-50"
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
