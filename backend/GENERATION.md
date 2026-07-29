# Server-Side Generation Pipeline (chunked, per-file)

## Why this exists — measured, not guessed

Two registered tests on 2026-07-29 (protocols and results in the project owner's
E-NL2B series records):

| Test | Design | First-attempt success | After repair loop |
|---|---|---|---|
| E-NL2B-1 | Shipped: client-side, ONE 4096-token JSON response for a whole project | **0/7** (every failure: `stop_reason=max_tokens` at exactly 4096) | n/a (no repair loop existed) |
| E-NL2B-2 | Chunked per-file generation + repair loop (this module's design) | **6/8** | **8/8** |

The shipped defect was structural: an entire Android project cannot fit in one
4096-token JSON response, so Layer 2 output was always truncated and never
parsed. This module makes the output budget **per file** and adds a bounded
compile-repair loop.

Moving generation server-side also removes the client-side BYO-API-key
requirement — the key lives in the backend environment, which is what a
sellable product needs anyway.

## Architecture

```
POST /api/generate { description }
  └─ queue-of-1 (Gradle builds must not overlap on small hosts; measured daemon OOM at 4GB)
      1. MANIFEST call      description -> JSON array of file paths (validated)
      2. PER-FILE calls     one API call per path -> raw file content (8192-token budget per file)
      3. buildService       existing verified path: gradle assembleRelease + bundleRelease
                            + apksigner sign AND verify (fail-closed: no keystore -> hard failure)
      4. On compile failure: repair round (max NL2B_MAX_REPAIRS, default 2)
         — only files named in the gradle error are regenerated; the orchestrator
           never edits code, it only transports content.
```

Poll `GET /api/build/:buildJobId/status` as before; the same job-status model is
used end to end.

## Prompt constants (frozen from the E-NL2B-2 findings)

- **Toolchain pins**: AGP 8.2.0, Kotlin 1.9.20, compileSdk 34, Compose BOM
  2023.10.01, compiler ext 1.5.5, Java 17, google()+mavenCentral() only.
  These match the build image; generation deviating from them fails the build.
- **Guard a**: experimental Material3 APIs must carry
  `@OptIn(ExperimentalMaterial3Api::class)` — this was 100% of E-NL2B-2's
  first-attempt compile failures.
- **Guard b**: `material-icons-extended` is banned — it caused the only
  build-daemon OOM observed at 4GB.

If you change a pin here, change the build image with it (and vice versa).

## Environment variables

| Var | Required | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes (for /api/generate) | Server-side model key. The /api/build path works without it. |
| `NL2B_MODEL` | no | Pin a model id. Default: newest sonnet-class model the key lists via `/v1/models`, resolved once per process. |
| `NL2B_MAX_REPAIRS` | no | Repair rounds per job (default 2). |
| `KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` | yes (for signing) | Fail-closed: builds refuse to return unsigned artifacts. |
| `ANDROID_SDK_ROOT`/`ANDROID_HOME`, `JAVA_HOME` | yes | Build toolchain (platform 34, build-tools 34.0.0, JDK 17). |

## Running tests

```
npm test
```

16 unit tests, mocked API via injected fetch (no test-framework dependency,
node's built-in runner). Covers: manifest validation (required members, Kotlin
source presence), per-file call fan-out and per-call budgets, fence-stripping
as a logged format deviation, `stop_reason=max_tokens` logged as a design-limit
event, API error surfacing (including credit exhaustion), error-file targeting
for repairs, and repair immutability guarantees (only error-named files change).

## Known limits (honest ledger)

- **Not yet validated on the live API wire path.** The 6/8 → 8/8 numbers come
  from a Sonnet-class generator substitution (declared deviation). The live-API
  run (E-NL2B-2b) is registered with frozen prompts and thresholds and costs
  ~$5–10 in API credits to execute.
- Compile+sign only — no emulator/runtime testing of generated apps.
- In-memory job status: a server restart loses in-flight jobs.
- Queue-of-1 is process-local; multiple server processes would defeat it.
