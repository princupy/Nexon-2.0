import {
  GREET_EDITOR_SELECT_ID_REGEX,
  parseGreetEditorSelectId,
} from "../../constants/component-ids";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";
import {
  buildGreetEditorPanel,
  buildGreetEditorPrompt,
  createGreetEditorSessionKey,
  isGreetEditorField,
} from "../../services/welcome/greet-editor.service";
import type { SelectMenuComponentHandler } from "../../types/component";

const greetEditorSelectHandler: SelectMenuComponentHandler = {
  id: GREET_EDITOR_SELECT_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseGreetEditorSelectId(interaction.customId);
    if (!parsed) {
      return;
    }

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: "This editor session is for a different server.",
          ephemeral: true,
        }),
      );
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: "Only the user who started this editor can use this menu.",
          ephemeral: true,
        }),
      );
      return;
    }

    const selected = interaction.values[0];
    if (!selected || !isGreetEditorField(selected)) {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: "Please choose a valid field from the menu.",
          ephemeral: true,
        }),
      );
      return;
    }

    const sessionKey = createGreetEditorSessionKey(parsed.guildId, parsed.userId);
    const session = client.greetEditorSessions.get(sessionKey);
    if (!session) {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: "This setup session has expired. Run `greet setup` again.",
          ephemeral: true,
        }),
      );
      return;
    }

    session.selectedField = selected;
    session.awaitingField = selected;
    client.greetEditorSessions.set(sessionKey, session);

    const prefix = await client.prefixService.getGuildPrefix(parsed.guildId);
    await interaction.update(
      buildGreetEditorPanel({
        avatarUrl: getClientAvatarUrl(client),
        prefix,
        session,
        note: buildGreetEditorPrompt(selected),
      }),
    );
  },
};

export default greetEditorSelectHandler;
