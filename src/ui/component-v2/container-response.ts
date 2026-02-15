import {
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "@discordjs/builders";
import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonBuilder,
  type RoleSelectMenuBuilder,
  type StringSelectMenuBuilder,
  type UserSelectMenuBuilder,
  type Client,
} from "discord.js";

const DEFAULT_AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/0.png";

export type V2ActionRowComponentBuilder =
  | ButtonBuilder
  | StringSelectMenuBuilder
  | UserSelectMenuBuilder
  | RoleSelectMenuBuilder;

type V2SectionAccessory =
  | {
      type: "thumbnail";
      url: string;
    }
  | {
      type: "button";
      button: ButtonBuilder;
    };

export interface V2SectionInput {
  text: string[];
  accessory?: V2SectionAccessory;
}

interface BotContainerResponseInput {
  avatarUrl: string;
  body: string;
  title?: string;
  sections?: V2SectionInput[];
  footerText?: string;
  addSeparator?: boolean;
  actionRows?: V2ActionRowComponentBuilder[][];
  ephemeral?: boolean;
}

interface ModalTextInputField {
  customId: string;
  label: string;
  style?: TextInputStyle;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  value?: string;
}

interface TextInputModalInput {
  customId: string;
  title: string;
  fields: ModalTextInputField[];
}

export function getClientAvatarUrl(client: Pick<Client, "user">): string {
  return (
    client.user?.displayAvatarURL({
      extension: "png",
      size: 256,
    }) ?? DEFAULT_AVATAR_URL
  );
}

function buildTextDisplayList(lines: string[]): TextDisplayBuilder[] {
  return lines.map((line) => new TextDisplayBuilder().setContent(line));
}

export function buildV2Section(input: V2SectionInput): SectionBuilder {
  const section = new SectionBuilder().addTextDisplayComponents(
    ...buildTextDisplayList(input.text),
  );

  if (input.accessory?.type === "thumbnail") {
    section.setThumbnailAccessory(
      new ThumbnailBuilder().setURL(input.accessory.url),
    );
  }

  if (input.accessory?.type === "button") {
    section.setButtonAccessory(input.accessory.button);
  }

  return section;
}

export function buildV2Separator(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true);
}

export function buildV2ActionRow(
  ...components: V2ActionRowComponentBuilder[]
): ActionRowBuilder<V2ActionRowComponentBuilder> {
  return new ActionRowBuilder<V2ActionRowComponentBuilder>().addComponents(
    ...components,
  );
}

export function buildTextInputModal(input: TextInputModalInput): ModalBuilder {
  if (input.fields.length < 1 || input.fields.length > 5) {
    throw new Error("A modal must contain between 1 and 5 text input fields.");
  }

  const modal = new ModalBuilder()
    .setCustomId(input.customId)
    .setTitle(input.title);

  for (const field of input.fields) {
    const textInput = new TextInputBuilder()
      .setCustomId(field.customId)
      .setLabel(field.label)
      .setStyle(field.style ?? TextInputStyle.Short);

    if (field.placeholder) {
      textInput.setPlaceholder(field.placeholder);
    }

    if (field.required !== undefined) {
      textInput.setRequired(field.required);
    }

    if (field.minLength !== undefined) {
      textInput.setMinLength(field.minLength);
    }

    if (field.maxLength !== undefined) {
      textInput.setMaxLength(field.maxLength);
    }

    if (field.value) {
      textInput.setValue(field.value);
    }

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(textInput));
  }

  return modal;
}

export function buildBotContainerResponse(input: BotContainerResponseInput) {
  const baseSection = buildV2Section({
    text: [
      ...(input.title ? [`## ${input.title}`] : []),
      input.body,
    ],
    accessory: {
      type: "thumbnail",
      url: input.avatarUrl,
    },
  });

  const container = new ContainerBuilder().addSectionComponents(baseSection);

  if (input.sections?.length) {
    for (const section of input.sections) {
      container.addSectionComponents(
        buildV2Section({
          text: section.text,
          ...(section.accessory ? { accessory: section.accessory } : {}),
        }),
      );
    }
  }

  if (input.addSeparator) {
    container.addSeparatorComponents(buildV2Separator());
  }

  if (input.footerText) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(input.footerText),
    );
  }

  if (input.actionRows?.length) {
    for (const row of input.actionRows) {
      container.addActionRowComponents(buildV2ActionRow(...row).toJSON());
    }
  }

  const flags = input.ephemeral
    ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    : MessageFlags.IsComponentsV2;

  return {
    flags,
    components: [container],
  } as const;
}
