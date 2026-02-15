import { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import {
  createGreetEditorButtonId,
  createGreetEditorSelectId,
  type GreetEditorButtonAction,
} from "../../constants/component-ids";
import {
  buildBotContainerResponse,
  type V2ActionRowComponentBuilder,
} from "../../ui/component-v2/container-response";
import type { GreetContainerStyle } from "../supabase/repositories/greet-config.repository";
import { getGreetPlaceholderGuide } from "./greet-message.service";

export const GREET_TEMPLATE_VERSION = 1;

export const GREET_EDITOR_FIELDS = [
  "message_content",
  "title",
  "description",
  "color",
  "footer_text",
  "author_name",
  "author_icon",
  "thumbnail",
  "image",
] as const;

export type GreetEditorField = (typeof GREET_EDITOR_FIELDS)[number];

export interface GreetTemplateDraft {
  message_content: string;
  title: string;
  description: string;
  color: string;
  footer_text: string;
  author_name: string;
  author_icon: string;
  thumbnail: string;
  image: string;
}

export interface SerializedGreetTemplate {
  version: number;
  type: "container";
  draft: GreetTemplateDraft;
}

export interface GreetEditorSession {
  guildId: string;
  userId: string;
  channelId: string;
  panelMessageId: string;
  style: GreetContainerStyle;
  draft: GreetTemplateDraft;
  selectedField: GreetEditorField;
  awaitingField: GreetEditorField | null;
}

const FIELD_LABELS: Record<GreetEditorField, string> = {
  message_content: "Message Content",
  title: "Title",
  description: "Description",
  color: "Color",
  footer_text: "Footer Text",
  author_name: "Author Name",
  author_icon: "Author Icon",
  thumbnail: "Thumbnail",
  image: "Image",
};

function clipPreview(value: string, max = 600): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}...`;
}

export function isGreetEditorField(value: string): value is GreetEditorField {
  return GREET_EDITOR_FIELDS.includes(value as GreetEditorField);
}

export function getGreetFieldLabel(field: GreetEditorField): string {
  return FIELD_LABELS[field];
}

export function createDefaultGreetDraft(): GreetTemplateDraft {
  return {
    message_content: "",
    title: "Welcome",
    description: "",
    color: "",
    footer_text: "",
    author_name: "",
    author_icon: "",
    thumbnail: "",
    image: "",
  };
}

export function createGreetEditorSessionKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

export function setDraftField(
  draft: GreetTemplateDraft,
  field: GreetEditorField,
  value: string,
): GreetTemplateDraft {
  return {
    ...draft,
    [field]: value,
  };
}

export function serializeGreetTemplateDraft(draft: GreetTemplateDraft): string {
  const payload: SerializedGreetTemplate = {
    version: GREET_TEMPLATE_VERSION,
    type: "container",
    draft,
  };

  return JSON.stringify(payload);
}

export function parseStoredGreetTemplate(
  template: string | null,
): GreetTemplateDraft | null {
  if (!template) {
    return null;
  }

  try {
    const parsed = JSON.parse(template) as Partial<SerializedGreetTemplate>;
    if (parsed.type !== "container" || typeof parsed.draft !== "object") {
      return null;
    }

    const defaults = createDefaultGreetDraft();
    return {
      ...defaults,
      ...parsed.draft,
    };
  } catch {
    return null;
  }
}

function buildPreviewText(draft: GreetTemplateDraft): string {
  const sections = [
    `Title: ${draft.title || "(empty)"}`,
    `Message: ${draft.message_content || "(empty)"}`,
    `Description: ${draft.description || "(empty)"}`,
    `Color: ${draft.color || "(empty)"}`,
    `Footer Text: ${draft.footer_text || "(empty)"}`,
    `Author Name: ${draft.author_name || "(empty)"}`,
    `Author Icon: ${draft.author_icon || "(empty)"}`,
    `Thumbnail: ${draft.thumbnail || "(empty)"}`,
    `Image: ${draft.image || "(empty)"}`,
  ];

  return clipPreview(sections.join("\n"));
}

export function buildGreetEditorPanel(input: {
  avatarUrl: string;
  prefix: string;
  session: GreetEditorSession;
  note?: string;
}) {
  const selectedLabel = getGreetFieldLabel(input.session.selectedField);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      createGreetEditorSelectId(input.session.guildId, input.session.userId),
    )
    .setPlaceholder("Choose an option to edit the welcome message")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      GREET_EDITOR_FIELDS.map((field) => ({
        label: getGreetFieldLabel(field),
        value: field,
        description: `Edit ${getGreetFieldLabel(field)}.`,
        default: field === input.session.selectedField,
      })),
    );

  const controls: V2ActionRowComponentBuilder[] = [
    new ButtonBuilder()
      .setCustomId(
        createGreetEditorButtonId(
          "submit",
          input.session.guildId,
          input.session.userId,
        ),
      )
      .setLabel("Submit")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(
        createGreetEditorButtonId(
          "variables",
          input.session.guildId,
          input.session.userId,
        ),
      )
      .setLabel("Variables")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(
        createGreetEditorButtonId(
          "cancel",
          input.session.guildId,
          input.session.userId,
        ),
      )
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger),
  ];

  const instruction = input.session.awaitingField
    ? `Enter value for **${getGreetFieldLabel(input.session.awaitingField)}** in this channel.`
    : "Choose a field from the dropdown to edit.";

  return buildBotContainerResponse({
    avatarUrl: input.avatarUrl,
    title: `Welcome Editor: ${selectedLabel}`,
    body: [
      "```",
      buildPreviewText(input.session.draft),
      "```",
      instruction,
      input.note ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
    addSeparator: true,
    footerText: `Flow: Select field -> Send value in chat -> Submit. You can also run \`${input.prefix}greet config\`.`,
    actionRows: [[selectMenu], controls],
  });
}

export function buildGreetEditorPrompt(field: GreetEditorField): string {
  return `Enter the value for **${getGreetFieldLabel(field)}** in this channel.`;
}

export function buildGreetEditorVariablesPanel(input: { avatarUrl: string }) {
  return buildBotContainerResponse({
    avatarUrl: input.avatarUrl,
    title: "Available Placeholders",
    body: getGreetPlaceholderGuide(),
    ephemeral: true,
  });
}

export function parseGreetEditorButtonAction(
  action: string,
): GreetEditorButtonAction | null {
  if (action === "submit" || action === "variables" || action === "cancel") {
    return action;
  }

  return null;
}
