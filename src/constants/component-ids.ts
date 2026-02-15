export const COMPONENT_IDS = {
  pingRefresh: "nexon:ping:refresh",
} as const;

export type HelpGroup = "main" | "extra";
export type HelpNavigationAction = "home" | "prev" | "next";
export type GreetSetupAction = "normal" | "colored" | "cancel";
export type GreetEditorButtonAction = "submit" | "variables" | "cancel";

const HELP_NAV_PREFIX = "nexon:help:nav";
const HELP_SELECT_PREFIX = "nexon:help:select";
const GREET_SETUP_PREFIX = "nexon:greet:setup";
const GREET_EDITOR_SELECT_PREFIX = "nexon:greet:editor:select";
const GREET_EDITOR_BUTTON_PREFIX = "nexon:greet:editor";

export const HELP_NAV_ID_REGEX =
  /^nexon:help:nav:(home|prev|next):(main|extra):([a-z0-9_-]+):(\d+):(\d+):(\d+)$/;

export const HELP_SELECT_ID_REGEX =
  /^nexon:help:select:(main|extra):(\d+):(\d+)$/;

export const GREET_SETUP_ID_REGEX =
  /^nexon:greet:setup:(normal|colored|cancel):(\d+):(\d+)$/;

export function createHelpNavId(
  action: HelpNavigationAction,
  group: HelpGroup,
  categoryKey: string,
  page: number,
  guildId: string,
  userId: string,
): string {
  return `${HELP_NAV_PREFIX}:${action}:${group}:${categoryKey}:${page}:${guildId}:${userId}`;
}

export function parseHelpNavId(customId: string): {
  action: HelpNavigationAction;
  group: HelpGroup;
  categoryKey: string;
  page: number;
  guildId: string;
  userId: string;
} | null {
  const match = HELP_NAV_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const action = match[1] as HelpNavigationAction;
  const group = match[2] as HelpGroup;
  const categoryKey = match[3];
  const page = Number.parseInt(match[4] ?? "", 10);
  const guildId = match[5];
  const userId = match[6];

  if (!action || !group || !categoryKey || Number.isNaN(page) || !guildId || !userId) {
    return null;
  }

  return {
    action,
    group,
    categoryKey,
    page,
    guildId,
    userId,
  };
}

export function createHelpSelectId(
  group: HelpGroup,
  guildId: string,
  userId: string,
): string {
  return `${HELP_SELECT_PREFIX}:${group}:${guildId}:${userId}`;
}

export function parseHelpSelectId(customId: string): {
  group: HelpGroup;
  guildId: string;
  userId: string;
} | null {
  const match = HELP_SELECT_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const group = match[1] as HelpGroup;
  const guildId = match[2];
  const userId = match[3];

  if (!group || !guildId || !userId) {
    return null;
  }

  return {
    group,
    guildId,
    userId,
  };
}

export function createGreetSetupId(
  action: GreetSetupAction,
  guildId: string,
  userId: string,
): string {
  return `${GREET_SETUP_PREFIX}:${action}:${guildId}:${userId}`;
}

export function parseGreetSetupId(customId: string): {
  action: GreetSetupAction;
  guildId: string;
  userId: string;
} | null {
  const match = GREET_SETUP_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const action = match[1] as GreetSetupAction;
  const guildId = match[2];
  const userId = match[3];

  if (!action || !guildId || !userId) {
    return null;
  }

  return {
    action,
    guildId,
    userId,
  };
}

export const GREET_EDITOR_SELECT_ID_REGEX =
  /^nexon:greet:editor:select:(\d+):(\d+)$/;

export const GREET_EDITOR_BUTTON_ID_REGEX =
  /^nexon:greet:editor:(submit|variables|cancel):(\d+):(\d+)$/;

export function createGreetEditorSelectId(
  guildId: string,
  userId: string,
): string {
  return `${GREET_EDITOR_SELECT_PREFIX}:${guildId}:${userId}`;
}

export function createGreetEditorButtonId(
  action: GreetEditorButtonAction,
  guildId: string,
  userId: string,
): string {
  return `${GREET_EDITOR_BUTTON_PREFIX}:${action}:${guildId}:${userId}`;
}

export function parseGreetEditorSelectId(customId: string): {
  guildId: string;
  userId: string;
} | null {
  const match = GREET_EDITOR_SELECT_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const guildId = match[1];
  const userId = match[2];
  if (!guildId || !userId) {
    return null;
  }

  return {
    guildId,
    userId,
  };
}

export function parseGreetEditorButtonId(customId: string): {
  action: GreetEditorButtonAction;
  guildId: string;
  userId: string;
} | null {
  const match = GREET_EDITOR_BUTTON_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const action = match[1] as GreetEditorButtonAction;
  const guildId = match[2];
  const userId = match[3];
  if (!action || !guildId || !userId) {
    return null;
  }

  return {
    action,
    guildId,
    userId,
  };
}
