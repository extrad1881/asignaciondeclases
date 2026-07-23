type PageError = {
  message: string;
};

type PageResult<Row> = {
  data: Row[] | null;
  error: PageError | null;
};

type FetchAllRowsOptions = {
  label?: string;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 500;
const MAX_PAGES = 10_000;

/**
 * Loads a complete PostgREST result without depending on the server's max_rows value.
 * The query supplied by the caller must use a deterministic order ending in a unique column.
 */
export async function fetchAllRows<Row>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<Row>>,
  options: FetchAllRowsOptions = {}
): Promise<Row[]> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("El tamaño de página debe ser un entero mayor que cero.");
  }

  const rows: Row[] = [];
  let from = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) {
      const prefix = options.label ? `${options.label}: ` : "";
      throw new Error(`${prefix}${error.message}`);
    }

    const pageRows = data ?? [];
    if (pageRows.length === 0) return rows;

    rows.push(...pageRows);
    from += pageRows.length;
  }

  throw new Error(
    `${options.label ? `${options.label}: ` : ""}se excedió el límite de páginas al consultar los datos.`
  );
}
