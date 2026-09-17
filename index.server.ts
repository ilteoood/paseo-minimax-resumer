import type { PluginServerContext } from "@getpaseo/plugin/server";
import { latestOutputText } from "./server/inspect.ts";
import { fetchMinimaxResetMs } from "./server/minimax-quota.ts";
import { msUntilReset, pendingAgents } from "./server/scheduler.ts";

const MINIMAX_ERROR_CODE = /\(2056\)/;

export default function contribute(server: PluginServerContext) {
	server.on("agent.turn_ended", async (event, context) => {
		if (event.outcome.kind === "canceled") return;

		const text = latestOutputText(event.timeline);
		if (!MINIMAX_ERROR_CODE.test(text)) return;

		const agentId = event.agent.id;

		if (pendingAgents.has(agentId)) {
			console.log(
				`[paseo-resumer] Agent ${agentId} already has a pending "continue" message. Skipping.`,
			);
			return;
		}

		const apiResetMs = await fetchMinimaxResetMs();
		const delayMs = apiResetMs ?? msUntilReset("5h", 5);
		const resetAt = new Date(Date.now() + delayMs).toISOString();
		console.log(
			`[paseo-resumer] Rate limit hit on agent ${agentId}. Resuming at ${resetAt}.`,
		);

		const timer = setTimeout(async () => {
			try {
				await context.paseo.agents.ref(agentId).send("continue");
				console.log(`[paseo-resumer] Sent "continue" to agent ${agentId}.`);
			} catch (err) {
				console.error(
					`[paseo-resumer] Failed to send "continue" to agent ${agentId}:`,
					err,
				);
			} finally {
				pendingAgents.delete(agentId);
			}
		}, delayMs);

		pendingAgents.set(agentId, timer);
	});

	return () => {
		for (const timer of pendingAgents.values()) clearTimeout(timer);
		pendingAgents.clear();
	};
}
