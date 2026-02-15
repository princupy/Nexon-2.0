import {
  GREET_SETUP_ID_REGEX,
  parseGreetSetupId,
} from "../../constants/component-ids";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";
import {
  buildGreetEditorPanel,
  createDefaultGreetDraft,
  createGreetEditorSessionKey,
  parseStoredGreetTemplate,
} from "../../services/welcome/greet-editor.service";
import type { ButtonComponentHandler } from "../../types/component";

const greetSetupButtonHandler: ButtonComponentHandler = {
  id: GREET_SETUP_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseGreetSetupId(interaction.customId);
    if (!parsed) {
      return;
    }

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Setup",
          body: "This setup action belongs to a different server.",
          ephemeral: true,
        }),
      );
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Setup",
          body: "Only the user who started this setup can use these buttons.",
          ephemeral: true,
        }),
      );
      return;
    }

    const prefix = await client.prefixService.getGuildPrefix(parsed.guildId);
    const sessionKey = createGreetEditorSessionKey(parsed.guildId, parsed.userId);

    if (parsed.action === "cancel") {
      client.greetEditorSessions.delete(sessionKey);
      await interaction.update(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Setup",
          body: "Setup has been cancelled. Run the setup command again anytime.",
          footerText: `Command: ${prefix}greet setup`,
          addSeparator: true,
        }),
      );
      return;
    }

    const style = parsed.action === "colored" ? "colored" : "normal";
    const currentConfig = await client.repositories.greetConfig.getByGuildId(parsed.guildId);
    const parsedTemplate = parseStoredGreetTemplate(currentConfig?.message_template ?? null);
    const initialDraft = parsedTemplate ?? createDefaultGreetDraft();

    if (!parsedTemplate && currentConfig?.message_template) {
      initialDraft.message_content = currentConfig.message_template;
    }

    client.greetEditorSessions.set(sessionKey, {
      guildId: parsed.guildId,
      userId: parsed.userId,
      channelId: interaction.channelId,
      panelMessageId: interaction.message.id,
      style,
      draft: initialDraft,
      selectedField: "message_content",
      awaitingField: null,
    });

    const session = client.greetEditorSessions.get(sessionKey);
    if (!session) {
      return;
    }

    await interaction.update(
      buildGreetEditorPanel({
        avatarUrl: getClientAvatarUrl(client),
        prefix,
        session,
        note: `Style selected: **${style}**`,
      }),
    );
  },
};

export default greetSetupButtonHandler;
