import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { fetchMinimaxResetMs } from "./minimax-quota.ts";

const NOW = 1_757_000_000_000;
const FUTURE_NEAR = NOW + 3_600_000;
const FUTURE_FAR = NOW + 18_000_000;
const PAST = NOW - 3_600_000;

function stubFetch(ok: boolean, body: unknown, jsonThrows = false): void {
	mock.method(globalThis, "fetch", async () => ({
		ok,
		json: jsonThrows
			? (): never => {
					throw new Error("bad json");
				}
			: async () => body,
	}));
}

describe("fetchMinimaxResetMs", () => {
	let savedApiKey: string | undefined;
	let savedBaseUrl: string | undefined;

	beforeEach(() => {
		savedApiKey = process.env.MINIMAX_API_KEY;
		savedBaseUrl = process.env.MINIMAX_BASE_URL;
		delete process.env.MINIMAX_API_KEY;
		delete process.env.MINIMAX_BASE_URL;
		mock.method(Date, "now", () => NOW);
	});

	afterEach(() => {
		if (savedApiKey !== undefined) process.env.MINIMAX_API_KEY = savedApiKey;
		else delete process.env.MINIMAX_API_KEY;
		if (savedBaseUrl !== undefined) process.env.MINIMAX_BASE_URL = savedBaseUrl;
		else delete process.env.MINIMAX_BASE_URL;
		mock.restoreAll();
	});

	describe("without the MINIMAX_API_KEY", () => {
		test("returns null when MINIMAX_API_KEY is absent", async () => {
			assert.strictEqual(await fetchMinimaxResetMs(), null);
		});
	});

	describe("with the MINIMAX_API_KEY", () => {
		beforeEach(() => {
			process.env.MINIMAX_API_KEY = "tok";
		});

		test("returns null when fetch throws a network error", async () => {
			mock.method(globalThis, "fetch", (): never => {
				throw new Error("network");
			});
			assert.strictEqual(await fetchMinimaxResetMs(), null);
		});

		test("returns null when response is not ok", async () => {
			stubFetch(false, null);
			assert.strictEqual(await fetchMinimaxResetMs(), null);
		});

		test("returns null when res.json() throws", async () => {
			stubFetch(true, null, true);
			assert.strictEqual(await fetchMinimaxResetMs(), null);
		});

		test("returns null when body does not match schema", async () => {
			stubFetch(true, { model_remains: "not-an-array" });
			assert.strictEqual(await fetchMinimaxResetMs(), null);
		});

		test("returns null when model_remains is absent", async () => {
			stubFetch(true, {});
			assert.strictEqual(await fetchMinimaxResetMs(), null);
		});

		test("returns null when model_remains is empty", async () => {
			stubFetch(true, { model_remains: [] });
			assert.strictEqual(await fetchMinimaxResetMs(), null);
		});

		test("returns null when all timestamps are in the past", async () => {
			stubFetch(true, {
				model_remains: [{ end_time: PAST, weekly_end_time: PAST }],
			});
			assert.strictEqual(await fetchMinimaxResetMs(), null);
		});

		test("returns ms until a future end_time", async () => {
			stubFetch(true, { model_remains: [{ end_time: FUTURE_NEAR }] });
			assert.strictEqual(await fetchMinimaxResetMs(), FUTURE_NEAR - NOW);
		});

		test("returns ms until weekly_end_time when end_time is in the past", async () => {
			stubFetch(true, {
				model_remains: [{ end_time: PAST, weekly_end_time: FUTURE_FAR }],
			});
			assert.strictEqual(await fetchMinimaxResetMs(), FUTURE_FAR - NOW);
		});

		test("returns the earliest of multiple future timestamps across models", async () => {
			// first model has far end_time and near weekly; second model has a mid end_time → near wins
			stubFetch(true, {
				model_remains: [
					{ end_time: FUTURE_FAR, weekly_end_time: FUTURE_NEAR },
					{ end_time: FUTURE_NEAR + 1000 },
				],
			});
			assert.strictEqual(await fetchMinimaxResetMs(), FUTURE_NEAR - NOW);
		});

		test("ignores models with no timestamp fields", async () => {
			// Model with no fields → both ts values are undefined, skipped; second model provides the reset
			stubFetch(true, { model_remains: [{}, { end_time: FUTURE_NEAR }] });
			assert.strictEqual(await fetchMinimaxResetMs(), FUTURE_NEAR - NOW);
		});

		test("uses MINIMAX_BASE_URL when set", async () => {
			process.env.MINIMAX_BASE_URL = "https://custom.example.com";
			let capturedUrl = "";
			mock.method(globalThis, "fetch", async (url: string) => {
				capturedUrl = url;
				return { ok: true, json: async () => ({ model_remains: [] }) };
			});
			await fetchMinimaxResetMs();
			assert.match(capturedUrl, /^https:\/\/custom\.example\.com/);
		});

		test("uses default base URL when MINIMAX_BASE_URL is absent", async () => {
			let capturedUrl = "";
			mock.method(globalThis, "fetch", async (url: string) => {
				capturedUrl = url;
				return { ok: true, json: async () => ({ model_remains: [] }) };
			});
			await fetchMinimaxResetMs();
			assert.match(capturedUrl, /^https:\/\/api\.minimax\.io/);
		});
	});
});
