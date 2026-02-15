import type { ClientEvents } from "discord.js";
import type { NexonClient } from "../core/nexon-client";

export interface NexonEvent<
  EventName extends keyof ClientEvents = keyof ClientEvents,
> {
  name: EventName;
  once?: boolean;
  execute: (
    client: NexonClient,
    ...args: ClientEvents[EventName]
  ) => Promise<void> | void;
}
