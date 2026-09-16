import { z } from "zod";

const MINIMAX_GLOBAL_BASE_URL = "https://api.minimax.io";

const ModelRemainSchema = z.object({
	end_time: z.number().optional(),
	weekly_end_time: z.number().optional(),
});

const QuotaResponseSchema = z.object({
	model_remains: z.array(ModelRemainSchema).optional(),
});

// Returns ms until the earliest future reset across all models and windows, or null.
export async function fetchMinimaxResetMs(): Promise<number | null> {
	const token = process.env.MINIMAX_API_KEY;
	if (!token) return null;

	const baseUrl = process.env.MINIMAX_BASE_URL ?? MINIMAX_GLOBAL_BASE_URL;

	let res: Response;
	try {
		res = await fetch(`${baseUrl}/v1/token_plan/remains`, {
			headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
		});
	} catch {
		return null;
	}

	if (!res.ok) return null;

	let json: unknown;
	try {
		json = await res.json();
	} catch {
		return null;
	}

	const parsed = QuotaResponseSchema.safeParse(json);
	if (!parsed.success) return null;

	const now = Date.now();
	let earliest: number | null = null;

	for (const model of parsed.data.model_remains ?? []) {
		for (const ts of [model.end_time, model.weekly_end_time]) {
			if (
				typeof ts === "number" &&
				ts > now &&
				(earliest === null || ts < earliest)
			)
				earliest = ts;
		}
	}

	return earliest === null ? null : earliest - now;
}
