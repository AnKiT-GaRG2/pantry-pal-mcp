# Devpost submission text (draft)

Edit anything that doesn't match what you actually did or experienced before you submit.

## Tracks and mini challenges
- Primary track: **Alexa+**
- Mini challenges: **AWS Builder** (Amazon Bedrock Converse API). **Open Source** only if this repo counts as the
  "new, additional" open-source project. The rules suggest a separate contribution, such as a pull request, fork or
  second repo, so check before ticking it.

## Description

Pantry Pal is a voice-first kitchen assistant built as a self-hosted MCP server (Streamable HTTP, spec 2025-11-25)
for Alexa+. You tell it what you bought ("I bought six eggs that expire Sunday"), ask what to eat first, say what
you used, and ask for a dinner idea. It tracks quantity and expiry per household, estimates shelf life when you give
no date, throws out expired food, and keeps a waste score.

Households account for about 60% of food waste (UNEP Food Waste Index Report 2024). Pantry Pal targets the part of
that problem where you lose track of what you have and when it goes off.

How it works: the server exposes nine tools (add, use, expiring, discard, waste report, recipe, meal plan, shopping
list, summary), a `pantry://inventory` resource and a `use_it_up` prompt. Replies are short plain sentences made to be
spoken. `suggest_recipe` and `plan_meals` call Amazon Bedrock (Converse API) to rank what's about to expire, and fall
back to a local suggestion when no model is configured. State is stored per household with serialised writes.
A live dashboard shows the pantry, an "eat first" banner, the last action and reply, the cooking idea and where it
came from, the shopping list and the waste score.

I had no Alexa device, so the demo uses an on-screen Alexa+ simulator: a text and microphone box that turns a spoken
sentence into one of the server's MCP tool calls. The simulator's source code is in the repo (`src/intent.ts`,
`src/say.ts`, `src/dashboard.ts`). The tools, state and Bedrock call are the real server. The server is not
registered with a live Alexa+ account.

Tested with 300+ automated tests (every tool, the sentence parser, storage, auth and HTTP).

## Existing project?
No. The repository was created on 2026-10-23 for this hackathon and all of the code was written during the window.

## Product feedback (draft from this build, edit to match your experience)

**MCP TypeScript SDK (`@modelcontextprotocol/sdk`)** — Used to define tools, a resource and a prompt, and to serve
Streamable HTTP in stateless mode. Worked well: tool annotations (`readOnlyHint`, `destructiveHint`), zod input
schemas, and `InMemoryTransport` for testing the real server without a network. Needs work: nothing blocking.
Would build with it again: yes.

**Alexa+ MCP add-on documentation** — Read the authentication and account-linking pages to work out how users are
identified. Worked well: the two-tier model (service token, then user account linking) is clearly explained.
Needs work: the pages don't say which header or token claim carries the user's identity, and the account-linking
page defers to the authentication page, which defers back. I had to build on an assumption and then correct it.
I did not register the server with Alexa+, so I can't comment on the developer console.

**Amazon Bedrock (Converse API) and AWS SDK/CLI** — Used for recipe and meal-plan suggestions. Worked well: the
Converse API is one call with a system prompt and token limit, and listing inference profiles from the CLI is easy.
Needs work: a new account's Bedrock calls were refused with "Your account is currently being verified", so I could
not verify the live path before submitting; the server logs the error and uses the local fallback. `aws login`
also failed in a non-interactive shell until a default region was set.
AWS services used: Amazon Bedrock (Converse API) via `@aws-sdk/client-bedrock-runtime`.

## Friction log (optional, up to a 10% bonus; keep only what you actually hit)

1. **Task:** identify the user in a self-hosted Alexa+ MCP server. **Steps:** read the MCP authentication page, then
   account linking. **Expected:** the header or claim that carries the user ID. **Actual:** the pages describe OAuth
   tokens but not how the server learns who the user is. **Severity:** medium. **Workaround:** an `x-household-id`
   header for testing, documented as a limitation. **Suggestion:** state the user identifier explicitly, with a sample token.
2. **Task:** support per-user data. **Steps:** read the account-linking requirements. **Expected:** a lightweight
   path for a hackathon. **Actual:** it needs a full OAuth 2.1 authorization server with PKCE, static client
   registration and refresh tokens. **Severity:** medium. **Workaround:** none; documented as the next step.
   **Suggestion:** a reference authorization server or a test mode for hackathons.
3. **Task:** call Bedrock from a new account. **Expected:** a model response. **Actual:** "Your account is currently
   being verified." **Severity:** high for time-boxed events. **Workaround:** local fallback. **Suggestion:** surface
   verification status in the console and in the hackathon instructions.
4. **Task:** `aws login` from a non-interactive shell. **Expected:** a browser sign-in. **Actual:** it stopped asking
   for a default region. **Severity:** low. **Workaround:** `aws configure set region` first.
5. **Task:** test without an Alexa device. **Actual:** I had none, so I built a simulator. **Severity:** low.
   **Suggestion:** a documented way to exercise an MCP add-on without a device.

## Feature requests (optional)
- A reference OAuth authorization server for account linking (important).
- Documented user identity for self-hosted MCP add-ons (critical for per-user data).
- Bedrock verification status visible before first use (nice-to-have).
