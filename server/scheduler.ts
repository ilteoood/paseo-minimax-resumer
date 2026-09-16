// Returns ms until the next Monday 00:00 UTC from the given timestamp.
function msUntilNextMondayUtc(now: number): number {
	const date = new Date(now);
	const day = date.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
	const daysUntilMonday = day === 0 ? 1 : 8 - day;
	const nextMonday = new Date(now);
	nextMonday.setUTCDate(date.getUTCDate() + daysUntilMonday);
	nextMonday.setUTCHours(0, 0, 0, 0);
	return nextMonday.getTime() - now;
}

export function msUntilReset(
	strategy: "5h" | "weekly",
	bufferMinutes: number,
): number {
	const buffer = bufferMinutes * 60 * 1000;
	if (strategy === "weekly") {
		return msUntilNextMondayUtc(Date.now()) + buffer;
	}
	return 5 * 60 * 60 * 1000 + buffer;
}

export const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
