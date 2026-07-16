import type { Team } from "@/lib/types";

export function TeamBadge({ team, size = 40 }: { team: Team; size?: number }) {
  return (
    <div
      className="relative grid place-items-center overflow-hidden rounded-xl border-2 font-bold text-white"
      style={{
        width: size,
        height: size,
        background: team.primaryColor,
        borderColor: team.secondaryColor,
        fontSize: size * 0.28,
      }}
      title={team.name}
    >
      {team.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logoUrl} alt={team.shortName} className="h-[86%] w-[86%] object-contain" />
      ) : (
        team.shortName
      )}
    </div>
  );
}
