import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const preferences = defineSettings({
  id: "preferences",
  scope: "host",
  version: 1,
  schema: z.object({
    resetStrategy: z.enum(["5h", "weekly"]).default("5h"),
    // Extra minutes to wait after estimated reset to absorb clock skew
    bufferMinutes: z.number().int().min(0).default(5),
  }),
});
