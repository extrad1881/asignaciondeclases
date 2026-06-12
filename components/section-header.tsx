export function SectionHeader({
  eyebrow,
  title,
  children
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase text-brand">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-ink">{title}</h1>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}
