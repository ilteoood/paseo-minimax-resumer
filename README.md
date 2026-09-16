# Paseo Minimax Resumer

A Paseo plugin that automatically handles Minimax API rate limiting by detecting rate limit errors and resuming agents after the quota resets.

## Overview

When using Paseo agents with the Minimax API, hitting rate limits can interrupt your workflow. **Paseo Minimax Resumer** solves this by:

- **Detecting rate limits** — Watches for Minimax error code 2056 (rate limit exceeded) in agent output
- **Calculating reset times** — Fetches actual quota reset times from Minimax or uses smart fallback scheduling
- **Auto-resuming agents** — Automatically sends a "continue" command when the quota window resets
- **Graceful handling** — Properly cleans up timers and handles errors transparently

## Features

- ⏱️ **Accurate quota tracking** — Queries Minimax API for real quota reset times
- 📅 **Smart fallback scheduling** — Supports 5-hour windows and weekly Monday resets
- 🔄 **Automatic resumption** — Resumes interrupted agents without manual intervention
- 🧹 **Clean shutdown** — Properly manages pending timers on plugin unload
- 📊 **100% test coverage** — Fully tested with comprehensive coverage requirements
- 🔧 **TypeScript support** — Native TypeScript with Node 22+ type stripping

## Installation

Install the plugin as a dev dependency:

```bash
paseo plugin add ilteoood/paseo-minimax-resumer
```

## Configuration

Set the following environment variables:

- `MINIMAX_API_KEY` — Your Minimax API key (required for accurate quota tracking)
- `MINIMAX_BASE_URL` — Custom Minimax API base URL (optional, defaults to https://api.minimax.io)

## How It Works

1. **Monitors agent turns** — Listens for `agent.turn_ended` events from Paseo
2. **Detects rate limits** — Checks if output contains the error pattern `(2056)`
3. **Fetches reset time** — Queries the Minimax quota API for the actual reset timestamp
4. **Schedules resume** — Sets a timer to send a "continue" command at the reset time
5. **Cleans up** — Manages all pending timers for proper shutdown

## Development

### Scripts

- `npm run typecheck` — Type check with TypeScript
- `npm run test` — Run tests with 100% coverage requirement
- `npm run lint` — Lint with Biome
- `npm run format` — Format code with Biome
- `npm run check` — Run Biome checks with auto-fix

### Project Structure

```
server/
  ├── minimax-quota.ts    # Minimax API quota fetching
  ├── scheduler.ts         # Reset time calculation and scheduling
  ├── inspect.ts           # Event output inspection
  └── *.test.ts            # Comprehensive test suite
index.server.ts             # Main plugin entry point
```

## Requirements

- Paseo ≥ 0.8.0
- Node.js 22+ (for native TypeScript support)
- Minimax API key for quota tracking

## License

MIT
