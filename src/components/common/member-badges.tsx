import { Award, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const EARLY_MEMBER_LIMIT = 500;

/** Ambassador / early-member badges shown next to a member's name. */
export function MemberBadges({ isAmbassador, memberNumber }: { isAmbassador?: boolean | null; memberNumber?: number | null }) {
  const early = memberNumber != null && memberNumber <= EARLY_MEMBER_LIMIT;
  if (!isAmbassador && !early) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {isAmbassador ? <Badge><Award /> Ambassador</Badge> : null}
      {early ? <Badge variant="warning" title={`Member #${memberNumber}`}><Sparkles /> Early member</Badge> : null}
    </span>
  );
}
