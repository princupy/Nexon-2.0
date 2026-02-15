import type {
  AnySelectMenuInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import type { NexonClient } from "../core/nexon-client";

type ComponentIdMatcher = string | RegExp;

interface BaseComponentHandler<InteractionType> {
  id: ComponentIdMatcher;
  execute: (interaction: InteractionType, client: NexonClient) => Promise<void>;
}

export type ButtonComponentHandler = BaseComponentHandler<ButtonInteraction>;
export type SelectMenuComponentHandler =
  BaseComponentHandler<AnySelectMenuInteraction>;
export type ModalComponentHandler = BaseComponentHandler<ModalSubmitInteraction>;

export function matchesComponentId(
  matcher: ComponentIdMatcher,
  customId: string,
): boolean {
  if (typeof matcher === "string") {
    return matcher === customId;
  }

  matcher.lastIndex = 0;
  return matcher.test(customId);
}
