# Supabase adapters

The Supabase adapters of the ports of `../ports.ts` (backend tasks B3.1–B3.4, see
`ai-assistance-prompts-reports/backend/`). `runtime/` and `studio/` never import them: they
are composed in `../createSupabaseServices.ts` and injected through `ServicesProvider`.

| Composition            | Used by                                        | Repository   | Participation               | Assets                     | Analytics                    |
| ---------------------- | ---------------------------------------------- | ------------ | --------------------------- | -------------------------- | ---------------------------- |
| `createStudioServices` | Studio and sandbox, on a real campaign         | Supabase     | **demo** (never real stock) | Supabase Storage           | console (development)        |
| `createPublicServices` | Public player page `/play/:slug`               | read-only    | **live** (`select-prize`)   | resolve only (Storage URL) | `record_campaign_impression` |
| `createLocalServices`  | Standalone Studio (demo campaign), `/xp-frame` | localStorage | demo / scripted             | data URLs (+ Storage URLs) | console (development)        |

Rules that stay true:

- **Prize selection happens in `select-prize` only.** The client never draws, scores or writes
  a participation (CLAUDE.md, rule 1). The live gateway has no fallback of any kind.
- **The public route only accepts the `live` gateway** (`allowedGatewayModes: ["live"]`). A
  `demo` or `scripted` gateway injected there by mistake shows an error screen.
- **The design is stored in its own table**, `campaign_experiences` (one row per campaign),
  never in `campaigns.player_screen_config`, which the Wizard rewrites on every save.
- Adapters receive the Supabase client as a parameter and are tested with
  `__tests__/fakeSupabaseClient.ts` (no network).

## Adapters

| Port                   | Adapter                        | Backend                                                         | Notes                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ExperienceRepository` | `supabaseExperienceRepository` | table `campaign_experiences`, function `save_experience_config` | `load` repairs like the local repository and **throws** on a server error (the Studio must never save its defaults over a real design); `save` maps `CONFLICT`, `TOO_LARGE` → `STORAGE_FULL`, the rest → `STORAGE_UNAVAILABLE` |
| `ParticipationGateway` | `supabaseParticipationGateway` | Edge Functions `select-prize` and `confirm-coupon`              | `mode: "live"`; mapping in `selectPrizeMapping.ts`; `checkAvailability` answers from `get_public_experience`; 15 s timeout                                                                                                     |
| `AssetStorage`         | `supabaseAssetStorage`         | bucket `campaign-media`, `<org>/experience/<campaign>/…`        | Same compression as the local storage (`../imageCompression.ts`); `resolveUrl` via `../storageUrl.ts`                                                                                                                          |
| `AnalyticsTracker`     | `supabaseAnalyticsTracker`     | function `record_campaign_impression`                           | `experience_viewed` and `form_submitted` only; fire-and-forget; never personal data                                                                                                                                            |
| `HumanVerification`    | — (`noopHumanVerification`)    | —                                                               | After the MVP: Turnstile, token checked in `select-prize` (`metadata.human_token` is already sent)                                                                                                                             |

## `DrawRequest` → `select-prize` body (`toSelectPrizeBody`)

| `DrawRequest`                                                        | `select-prize` body                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `campaignId`                                                         | `campaign_id`                                                   |
| `participant.phone` (normalized with `normalizeDzPhone`)             | `phone_number`                                                  |
| `participant.fullName` / `participant.email` (when filled)           | `participant_name` / `participant_email`                        |
| `gamePayload` quiz / boxes / hitIt / none                            | `game_payload.answers` / `.selected_box_index` / `.hits` / `{}` |
| `context.sessionId`, `context.dwellTimeSeconds`, `context.userAgent` | `session_id`, `dwell_time_seconds`, `user_agent`                |
| `clientRequestId`, `consent`, `context.source`, `participant.wilaya` | `metadata.{ client_request_id, consent, source, wilaya }`       |
| `humanToken` (when not null)                                         | `metadata.human_token` (neither checked nor stored yet)         |

## `select-prize` answer → `DrawResult` (`toDrawResult`)

| `select-prize` answer                                              | `DrawResult`                                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `200 { ok: true, entry, prize, coupon }` (also `replayed: true`)   | `{ ok: true, entryId: entry.id, outcome: { isWinner: !!prize, prize, couponCode: coupon?.code ?? null } }` |
| `code: ALREADY_PARTICIPATED` / `CAMPAIGN_CLOSED` / `INVALID_INPUT` | the same code                                                                                              |
| `code: CONSENT_REQUIRED`                                           | `INVALID_INPUT`                                                                                            |
| `code: DRAW_FAILED` / `SERVER_ERROR`, any `5xx`                    | `NETWORK` (retryable)                                                                                      |
| no answer (network failure, timeout)                               | `NETWORK`                                                                                                  |
| messages of a `select-prize` deployed before B2.1 (no code)        | recognized by their wording, each pinned by a test                                                         |
| anything else                                                      | `UNKNOWN` (retryable)                                                                                      |

## Server gaps found while writing the demo gateway

All fixed by the backend tasks:

- Hit It and quiz: no draw after a failed game (B1.3);
- consent required and stored, idempotent retries, period checked, error codes (B2.1);
- quiz answers never public: `get_public_experience` (B1.2), and the direct anonymous reads of
  `campaigns`, `prizes` and `quiz_questions` removed with the legacy player page (B6.2);
- two simultaneous winners never share a coupon code (`claim_campaign_prize_coupon`, fixed
  during the local acceptance, B6.1).

Known remaining behavior, noted for after the MVP:

- auto-pace mode is not simulated by the demo draw engine (demo odds differ for such campaigns);
- `draw_and_claim_campaign_prize` may give a loss to a player drawing at the very same moment as
  another one (`FOR UPDATE SKIP LOCKED`);
- the Hit It hit count is declared by the browser; the server only applies the threshold.
