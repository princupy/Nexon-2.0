export const ANTINUKE_FEATURE_DEFINITIONS = [
  {
    key: "channel_delete",
    label: "Channel Delete Guard",
    description: "Punishes unauthorized channel deletion.",
    nightmodeOnly: false,
  },
  {
    key: "role_delete",
    label: "Role Delete Guard",
    description: "Punishes unauthorized role deletion.",
    nightmodeOnly: false,
  },
  {
    key: "member_ban",
    label: "Member Ban Guard",
    description: "Punishes suspicious member bans.",
    nightmodeOnly: false,
  },
  {
    key: "member_kick",
    label: "Member Kick Guard",
    description: "Punishes suspicious member kicks.",
    nightmodeOnly: false,
  },
  {
    key: "emoji_delete",
    label: "Emoji Delete Guard",
    description: "Punishes unauthorized emoji deletion.",
    nightmodeOnly: false,
  },
  {
    key: "webhook_create",
    label: "Webhook Create Guard",
    description: "Punishes unauthorized webhook creation.",
    nightmodeOnly: false,
  },
  {
    key: "webhook_delete",
    label: "Webhook Delete Guard",
    description: "Punishes unauthorized webhook deletion.",
    nightmodeOnly: false,
  },
  {
    key: "unverified_bot_add",
    label: "Unverified Bot Add Guard",
    description: "Punishes unverified bot additions.",
    nightmodeOnly: false,
  },
  {
    key: "nightmode_channel_create",
    label: "Nightmode Channel Create Guard",
    description: "Punishes channel creation while nightmode is active.",
    nightmodeOnly: true,
  },
  {
    key: "nightmode_role_create",
    label: "Nightmode Role Create Guard",
    description: "Punishes role creation while nightmode is active.",
    nightmodeOnly: true,
  },
] as const;

export type AntinukeFeatureDefinition = (typeof ANTINUKE_FEATURE_DEFINITIONS)[number];
export type AntinukeFeatureKey = AntinukeFeatureDefinition["key"];

const ANTINUKE_FEATURE_KEYS = new Set<string>(
  ANTINUKE_FEATURE_DEFINITIONS.map((feature) => feature.key),
);

const ANTINUKE_FEATURE_LABELS = new Map<string, string>(
  ANTINUKE_FEATURE_DEFINITIONS.map((feature) => [feature.key, feature.label]),
);

export function isAntinukeFeatureKey(value: string): value is AntinukeFeatureKey {
  return ANTINUKE_FEATURE_KEYS.has(value);
}

export function normalizeAntinukeFeatureKeys(
  rawFeatures: readonly string[] | null | undefined,
): AntinukeFeatureKey[] {
  if (!rawFeatures?.length) {
    return [];
  }

  const normalized = new Set<AntinukeFeatureKey>();

  for (const rawFeature of rawFeatures) {
    const feature = rawFeature.trim().toLowerCase();
    if (isAntinukeFeatureKey(feature)) {
      normalized.add(feature);
    }
  }

  return [...normalized];
}

export function resolveAntinukeFeatureLabel(featureKey: string): string {
  return ANTINUKE_FEATURE_LABELS.get(featureKey) ?? featureKey;
}
