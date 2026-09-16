import type { PluginServerContext } from "@getpaseo/plugin/server";
import type { z } from "zod";
import { latestOutputText } from "./server/inspect.ts";
import { msUntilReset, pendingTimers } from "./server/scheduler.ts";
import { preferences } from "./shared/settings.ts";

// registerSettings returns a handle at runtime despite the void declaration in v0.8 types
interface SettingsHandle<TValues> {
  read(): Promise<
    | { status: "ready"; values: TValues; revision: string }
    | { status: "invalid"; error: string; revision: string }
  >;
}

type PrefsValues = z.output<typeof preferences.schema>;

const MINIMAX_429_PATTERN = /Token Plan usage limit reached/i;
const MINIMAX_ERROR_CODE = /\(2056\)/;

const DEFAULT_PREFS: PrefsValues = { resetStrategy: "5h", bufferMinutes: 5 };

export default function contribute(server: PluginServerContext) {
  // Cast: type declaration says void but daemon returns a handle per the docs
  const settings = server.registerSettings(preferences) as unknown as SettingsHandle<PrefsValues>;

  server.on("agent.turn_ended", async (event, context) => {
    if (event.outcome.kind === "canceled") return;

    const text = latestOutputText(event.timeline);
    if (!MINIMAX_429_PATTERN.test(text) || !MINIMAX_ERROR_CODE.test(text)) return;

    const state = await settings.read().catch(() => null);
    const { resetStrategy, bufferMinutes } =
      state?.status === "ready" ? state.values : DEFAULT_PREFS;

    const delayMs = msUntilReset(resetStrategy, bufferMinutes);
    const resetAt = new Date(Date.now() + delayMs).toISOString();
    console.log(`[paseo-resumer] Rate limit hit on agent ${event.agent.id}. Resuming at ${resetAt}.`);

    const timer = setTimeout(async () => {
      pendingTimers.delete(timer);
      try {
        await context.paseo.agents.ref(event.agent.id).send("continue");
        console.log(`[paseo-resumer] Sent "continue" to agent ${event.agent.id}.`);
      } catch (err) {
        console.error(`[paseo-resumer] Failed to send "continue" to agent ${event.agent.id}:`, err);
      }
    }, delayMs);

    pendingTimers.add(timer);
  });

  return () => {
    for (const timer of pendingTimers) clearTimeout(timer);
    pendingTimers.clear();
  };
}
