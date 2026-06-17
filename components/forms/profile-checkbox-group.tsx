import { Badge } from "@/components/ui/badge";

type ProfileOption = {
  code: string;
  name?: string | null;
};

export function ProfileCheckboxGroup({
  profiles,
  selected = [],
  name = "profile_codes",
  maxHeight = "max-h-28"
}: {
  profiles: ProfileOption[];
  selected?: string[];
  name?: string;
  maxHeight?: string;
}) {
  const selectedSet = new Set(selected);

  if (profiles.length === 0) {
    return (
      <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
        Sin perfiles disponibles
      </div>
    );
  }

  return (
    <div className={`${maxHeight} overflow-y-auto rounded-md border border-line bg-card p-2 shadow-subtle`}>
      <div className="grid gap-2 sm:grid-cols-2">
        {profiles.map((profile) => (
          <label
            className="flex min-h-8 items-center gap-2 rounded-md px-2 py-1 text-sm text-ink hover:bg-panel"
            key={profile.code}
            title={profile.name ?? profile.code}
          >
            <input
              className="h-4 w-4 accent-brand"
              defaultChecked={selectedSet.has(profile.code)}
              name={name}
              type="checkbox"
              value={profile.code}
            />
            <Badge tone="info">{profile.code}</Badge>
          </label>
        ))}
      </div>
    </div>
  );
}
