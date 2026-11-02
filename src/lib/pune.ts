// Static mirror of the Pune reference data seeded in
// supabase/migrations/20261101000000_pune_mvp.sql (the database is the source
// of truth; tests/unit/pune.test.ts fails if the two drift apart).

export const CITY = "Pune" as const;

export const ZONES = [
  { code: "hinjawadi", name: "Hinjawadi (Phase 1, 2, 3)" },
  { code: "kharadi_magarpatta", name: "Magarpatta City & Kharadi (EON IT Park)" },
  { code: "viman_kalyani", name: "Viman Nagar & Kalyani Nagar" },
  { code: "baner_aundh", name: "Baner, Balewadi & Aundh" },
  { code: "yerwada_sb_road", name: "Yerwada & Senapati Bapat Road" },
  { code: "pcmc_talegaon", name: "Talegaon Dabhade & Pimpri-Chinchwad" },
] as const;

export type ZoneCode = (typeof ZONES)[number]["code"];

export const HUBS = [
  { code: "hinjawadi_ph1", zone: "hinjawadi", name: "Hinjawadi Phase 1" },
  { code: "hinjawadi_ph2", zone: "hinjawadi", name: "Hinjawadi Phase 2" },
  { code: "hinjawadi_ph3", zone: "hinjawadi", name: "Hinjawadi Phase 3" },
  { code: "magarpatta", zone: "kharadi_magarpatta", name: "Magarpatta City" },
  { code: "kharadi_eon", zone: "kharadi_magarpatta", name: "Kharadi — EON IT Park" },
  { code: "kharadi_wtc", zone: "kharadi_magarpatta", name: "Kharadi — World Trade Center" },
  { code: "viman_nagar", zone: "viman_kalyani", name: "Viman Nagar" },
  { code: "kalyani_nagar", zone: "viman_kalyani", name: "Kalyani Nagar" },
  { code: "baner", zone: "baner_aundh", name: "Baner" },
  { code: "balewadi", zone: "baner_aundh", name: "Balewadi High Street" },
  { code: "aundh", zone: "baner_aundh", name: "Aundh" },
  { code: "yerwada", zone: "yerwada_sb_road", name: "Yerwada (Commerzone / Panchshil)" },
  { code: "sb_road", zone: "yerwada_sb_road", name: "Senapati Bapat Road" },
  { code: "pimpri_chinchwad", zone: "pcmc_talegaon", name: "Pimpri-Chinchwad (PCMC)" },
  { code: "talegaon", zone: "pcmc_talegaon", name: "Talegaon Dabhade" },
] as const satisfies readonly { code: string; zone: ZoneCode; name: string }[];

export type HubCode = (typeof HUBS)[number]["code"];

export const PICKUP_POINTS = [
  { code: "hjw_ph1_circle", zone: "hinjawadi", name: "Hinjawadi Phase 1 Circle" },
  { code: "hjw_ph1_gate", zone: "hinjawadi", name: "Rajiv Gandhi Infotech Park Ph 1 Gate" },
  { code: "hjw_ph2_wipro", zone: "hinjawadi", name: "Hinjawadi Phase 2 — Wipro Circle" },
  { code: "hjw_ph3_megapolis", zone: "hinjawadi", name: "Hinjawadi Phase 3 — Megapolis Circle" },
  { code: "eon_gate1", zone: "kharadi_magarpatta", name: "EON Kharadi Gate 1" },
  { code: "eon_free_zone", zone: "kharadi_magarpatta", name: "EON Free Zone Lobby" },
  { code: "magarpatta_t7", zone: "kharadi_magarpatta", name: "Magarpatta Tower 7" },
  { code: "seasons_mall", zone: "kharadi_magarpatta", name: "Seasons Mall Entrance" },
  { code: "viman_metro", zone: "viman_kalyani", name: "Viman Nagar Metro Station" },
  { code: "phoenix_mall", zone: "viman_kalyani", name: "Phoenix Marketcity Gate 2" },
  { code: "kalyani_starbucks", zone: "viman_kalyani", name: "Kalyani Nagar Central Avenue" },
  { code: "balewadi_high_st", zone: "baner_aundh", name: "Balewadi High Street" },
  { code: "baner_d_mart", zone: "baner_aundh", name: "Baner D-Mart" },
  { code: "aundh_westend", zone: "baner_aundh", name: "Westend Mall Aundh" },
  { code: "commerzone_gate", zone: "yerwada_sb_road", name: "Commerzone Yerwada Main Gate" },
  { code: "sb_road_icc", zone: "yerwada_sb_road", name: "ICC Trade Tower, SB Road" },
  { code: "pimpri_metro", zone: "pcmc_talegaon", name: "PCMC Metro Station" },
  { code: "talegaon_station", zone: "pcmc_talegaon", name: "Talegaon Railway Station" },
] as const satisfies readonly { code: string; zone: ZoneCode; name: string }[];

export type PickupCode = (typeof PICKUP_POINTS)[number]["code"];

export const CATEGORIES = [
  { code: "laptops", name: "Laptops" },
  { code: "phones", name: "Phones" },
  { code: "tablets", name: "Tablets" },
  { code: "monitors", name: "Monitors" },
  { code: "audio", name: "Audio" },
  { code: "wearables", name: "Wearables" },
  { code: "cameras", name: "Cameras" },
  { code: "gaming", name: "Gaming" },
  { code: "accessories", name: "Accessories" },
  { code: "other", name: "Other" },
] as const;

export const CONDITIONS = [
  { code: "new", name: "New (sealed)" },
  { code: "like_new", name: "Like new" },
  { code: "good", name: "Good" },
  { code: "fair", name: "Fair" },
] as const;

const byCode = <T extends { code: string; name: string }>(list: readonly T[]) =>
  Object.fromEntries(list.map((x) => [x.code, x.name])) as Record<string, string>;

export const zoneName = (c: string) => byCode(ZONES)[c] ?? c;
export const hubName = (c: string) => byCode(HUBS)[c] ?? c;
export const pickupName = (c: string) => byCode(PICKUP_POINTS)[c] ?? c;
export const categoryName = (c: string) => byCode(CATEGORIES)[c] ?? c;
export const conditionName = (c: string) => byCode(CONDITIONS)[c] ?? c;

export const codes = <T extends { code: string }>(list: readonly T[]) =>
  list.map((x) => x.code) as [T["code"], ...T["code"][]];
