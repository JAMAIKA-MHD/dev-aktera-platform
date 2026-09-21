# Supabase adapters (after the MVP)

The MVP runs on the local adapters of `../local/`, composed by `createLocalServices()`.
After the MVP, this folder will hold the Supabase adapters of the same ports
(`../ports.ts`), composed by a `createSupabaseServices()` for the public route `/play/:slug`.
Nothing in `runtime/` or `studio/` will change: they only know the ports.

Rules that stay true:

- **Prize selection happens in `select-prize` only.** The client never draws (N1).
- **The public route only accepts the `live` gateway** (`allowedGatewayModes: ["live"]`,
  plan §7.4). A `demo` or `scripted` gateway injected there by mistake shows an error screen.
- **No change to the database schema is needed** for the configuration: it goes into the
  existing `campaigns.player_screen_config` JSONB column, under `experience`.

## Adapters to write

| Port                   | Adapter                        | Backend                                                             | Notes                                                                                                                                                                             |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExperienceRepository` | `supabaseExperienceRepository` | `campaigns.player_screen_config.experience`                         | `load` → `parseExperienceConfig`; `save` with optimistic concurrency on `updatedAt` (compare, then update in one statement or an RPC), keep `uiProject`                           |
| `ParticipationGateway` | `supabaseParticipationGateway` | Edge Functions `select-prize` and `confirm-coupon`                  | `mode: "live"`; mapping below; `checkAvailability` from the campaign status and stock                                                                                             |
| `AssetStorage`         | `supabaseAssetStorage`         | Supabase Storage bucket                                             | Upload returns `{ kind: "storage", bucket, path }`; `resolveUrl` builds `<SUPABASE_URL>/storage/v1/object/public/<bucket>/<path>` (see `resolveStorage` in `dataUrlAssetStorage`) |
| `AnalyticsTracker`     | `supabaseAnalyticsTracker`     | `record_campaign_impression` RPC, then an events table              | Fire-and-forget, batched; never personal data                                                                                                                                     |
| `HumanVerification`    | `turnstileHumanVerification`   | Cloudflare Turnstile (or hCaptcha), token checked in `select-prize` | Replaces `noopHumanVerification`                                                                                                                                                  |

## `DrawRequest` → `select-prize` body

| `DrawRequest`                                                        | `select-prize` body                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `campaignId`                                                         | `campaign_id`                                                                        |
| `participant.phone` (normalized with `normalizeDzPhone`)             | `phone_number`                                                                       |
| `participant.fullName`                                               | `participant_name`                                                                   |
| `participant.email`                                                  | `participant_email`                                                                  |
| `gamePayload` quiz / boxes / hitIt                                   | `game_payload.answers` / `game_payload.selected_box_index` / `game_payload.hits`     |
| `context.sessionId`, `context.dwellTimeSeconds`, `context.userAgent` | `session_id`, `dwell_time_seconds`, `user_agent`                                     |
| `clientRequestId`, `consent`, `participant.wilaya`, `context.source` | `metadata.{ client_request_id, consent, wilaya, source }` (existing free-form field) |

## `select-prize` response → `DrawResult`

| `select-prize` response                                     | `DrawResult`                                                                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ ok: true, entry, prize, coupon }`                        | `{ ok: true, entryId: entry.id, outcome: { isWinner: !!prize, prize: { id, name, winMessage: win_message }, couponCode: coupon?.code ?? null } }` |
| `{ ok: false, code: "ALREADY_PARTICIPATED" }`               | `ALREADY_PARTICIPATED`                                                                                                                            |
| `{ ok: false, code: "CAMPAIGN_CLOSED" }`                    | `CAMPAIGN_CLOSED`                                                                                                                                 |
| `{ ok: false, error: "Campaign not found." }` (no code)     | `CAMPAIGN_CLOSED`                                                                                                                                 |
| `{ ok: false, error: "Campaign is not active." }` (no code) | `CAMPAIGN_CLOSED`                                                                                                                                 |
| Duplicate insert, Postgres `23505` (race between two tabs)  | `ALREADY_PARTICIPATED`                                                                                                                            |
| `400` invalid phone or missing fields (no code)             | `INVALID_INPUT`                                                                                                                                   |
| Network failure, timeout, `5xx`                             | `NETWORK`                                                                                                                                         |
| Anything else                                               | `UNKNOWN`                                                                                                                                         |

Several server errors have no `code`: the adapter must map them from the HTTP status and
the message, and a test must pin each message, so that a change of wording on the server
is noticed.

## Server gaps found while writing the demo gateway

The demo gateway (`../local/demoParticipationGateway.ts`) follows the intended rules. The
server does not, yet; `supabase/` must be fixed separately:

1. **Hit It threshold not enforced.** `draw_and_claim_campaign_prize` only honours a failed
   skill game when the campaign has `require_quiz = true`, and `campaignService` sets it for
   quizzes only. A Hit It player below `win_threshold` can therefore win. Fix: in
   `resolve_game_outcome`, do not draw when `v_passed` is false, for every skill game.
2. **Consent not checked.** `select-prize` accepts a participation without any consent.
   Law 18-07 requires it: refuse the request without `metadata.consent.accepted`, and store
   the `ConsentRecord` (time, policy version, locale) with the entry.
3. **Correct quiz answers are public.** `/play/:slug` loads `quiz_questions.correct_option_index`
   in the browser (`PlayerFlowPage.tsx`). The public read must exclude it; the score is
   computed by `resolve_game_outcome` anyway.
4. **Auto-pace mode** ignores the win probability and paces prizes per day. The demo engine
   does not simulate it: for such campaigns, demo odds differ from production.
