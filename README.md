# Pantry Pal: an Alexa+ MCP server

A voice-first kitchen assistant built as a self-hosted [MCP](https://modelcontextprotocol.io) server
(Streamable HTTP, spec 2025-11-25+) for Alexa+. Tell Alexa what you bought, ask what's about to
expire, and get a dinner idea built from what you already have.

Built for the Build, Ship, Shape: Amazon Developer Hackathon (Alexa+ track, AWS Builder mini challenge).

## Why it matters

Most food waste happens at home. UNEP's Food Waste Index Report 2024 estimates 1.05 billion tonnes of food
was wasted in 2022, and households were responsible for 60% of it, about 79 kg per person per year
([UNEP](https://www.unep.org/resources/publication/unep-food-waste-index-report-2024)). USDA puts US food waste at
30 to 40 percent of the food supply, using 2010 data ([USDA](https://www.usda.gov/foodwaste)).

Pantry Pal targets one part of that: losing track of what you have and when it goes off. Voice suits it because
that information is needed in the kitchen, often with your hands full. A plain shopping list records what to buy,
not what you own or when it expires. Pantry Pal tracks quantity and expiry by voice, tells you what to eat first,
turns it into a dinner idea, and keeps a waste score so the habit has feedback.

It is aimed at households who cook at home and want to waste less without maintaining a spreadsheet.

## Tools

| Tool | Example utterance |
|---|---|
| `add_pantry_item` | "I bought six eggs that expire Friday" (understands "tomorrow", "in 3 days", "next week"; estimates shelf life when no date is given) |
| `use_pantry_item` | "I used two eggs" (adds to the shopping list when something runs out) |
| `check_expiring` | "What should I eat first?" |
| `discard_expired` | "Throw out what's expired" |
| `waste_report` | "How much food have I wasted?" |
| `suggest_recipe` | "What vegetarian dinner can I make?" |
| `plan_meals` | "Plan dinners for the next three days" |
| `manage_shopping_list` | "Add milk to my shopping list" |
| `pantry_summary` | "What's in my pantry?" |

It also exposes the `pantry://inventory` resource (full state as JSON) and a `use_it_up` prompt.
Each household is isolated by the `x-household-id` request header, and writes are serialised per household.

Every response is short, plain spoken text with no markdown, so it reads well through a voice assistant.

Food names are normalised ("Eggs", "an egg" and "egg" are one item) and spoken back with correct plurals.
Read-only and destructive tools carry MCP tool annotations.

## Try it without an Alexa

The dashboard has an **Alexa+ simulator**: a text box and a microphone button (Chrome or Edge) where you type or say
a sentence such as "I bought six eggs that expire Sunday". `src/intent.ts` turns it into one of the tool calls, and
`src/say.ts` runs it on the real MCP server, so the pantry, the replies and the Bedrock call are all the real
server. It is a stand-in for Alexa's language understanding and it is not a real Alexa. Replies can be read aloud.

`npm run demo` plays a 12-sentence demo conversation against a running server. `docs/DEMO.md` is the recording
guide, and `docs/SUBMISSION.md` has the Devpost text.

## Live dashboard

Open `http://localhost:3000/?household=default` to watch the pantry, shopping list and waste score update every
two seconds while you issue voice or tool commands. If `MCP_AUTH_TOKEN` is set, append `&token=<token>`.

## AWS integration

`suggest_recipe` and `plan_meals` call Amazon Bedrock (Converse API) when `BEDROCK_MODEL_ID` is set, ranking pantry
items by expiry so the model prioritizes food that is about to go off. Without it, the tools fall back to a local
suggestion, so the server runs with no AWS account. The dashboard labels each result "Amazon Bedrock" or
"Local fallback" so you can see which path ran.

### Bedrock setup

1. In the AWS console, open Amazon Bedrock in your region and request access to a text model.
2. Give the credentials the server runs with permission to call it. A minimal IAM policy:
   ```json
   { "Version": "2012-10-17", "Statement": [{ "Effect": "Allow", "Action": ["bedrock:InvokeModel"], "Resource": "*" }] }
   ```
3. Make credentials available to the process (`aws configure`, `aws login`, or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`).
4. Find a model or inference profile ID your account can use and export it:
   ```bash
   aws bedrock list-inference-profiles --region us-east-1 --query 'inferenceProfileSummaries[].inferenceProfileId'
   export BEDROCK_MODEL_ID=<id from the list>
   export AWS_REGION=us-east-1
   npm run dev
   ```
5. Ask for a recipe and check the "Cooking idea" card on the dashboard says "Amazon Bedrock". If the call fails
   (access not granted, wrong region, bad ID) the error is logged to the server console and the local fallback is used.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000/mcp
npm test               # 310+ tests: names, dates, sentence parser, store, recipes, every MCP tool, HTTP + auth
npm run smoke          # with the server running: end-to-end MCP client checks
npm run demo           # with the server running: plays the demo conversation
```

Environment variables:

| Variable | Purpose |
|---|---|
| `PORT` | Listen port (default 3000) |
| `MCP_AUTH_TOKEN` | If set, requests must send `Authorization: Bearer <token>` |
| `BEDROCK_MODEL_ID` | Bedrock model or inference profile ID, enables AI recipes |
| `AWS_REGION` | Bedrock region (default `us-east-1`) |
| `PANTRY_DIR` | Directory for per-household JSON state (default `data/`) |

To connect Alexa+, expose the server over HTTPS (for example `ngrok http 3000`) and register
`https://<host>/mcp` as your MCP endpoint.

## Authentication and identity

- `MCP_AUTH_TOKEN` protects `/mcp` with `Authorization: Bearer <token>`. The token is accepted only in the header, never in the URL.
  The dashboard's `/api/state` also accepts `?token=` because a browser page can't set headers.
- Households are selected by the `x-household-id` header. This suits MCP clients you control, such as the smoke test,
  MCP Inspector and the demo. **Alexa+ does not send this header.** Amazon's Alexa+ add-on docs describe OAuth 2.1
  account linking (authorization code with PKCE), where Alexa sends an access token that identifies the customer
  ([Alexa+ MCP authentication](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-authentication)).
  This project does not implement an OAuth authorization server, so behind a real Alexa+ link every caller shares the
  `default` household. Adding account linking is the next step for multi-user use.

## Layout

- `src/server.ts`: Express app exposing the stateless Streamable HTTP endpoint
- `src/mcp.ts`: tool definitions
- `src/recipes.ts`: Bedrock call with local fallback
- `src/store.ts`: per-household JSON persistence with write serialisation
- `src/dashboard.ts`: single-page live dashboard and simulator served at `/`
- `src/intent.ts`, `src/say.ts`: sentence-to-tool parser and the `/api/say` simulator endpoint
- `src/activity.ts`: per-household log of recent tool calls and the last recipe, shown on the dashboard
- `src/names.ts`: food-name normalisation and plurals
- `src/dates.ts`: natural-language expiry parsing and shelf-life estimates
- `src/smoke-test.ts`: end-to-end client test
- `Dockerfile`: `docker build -t pantry-pal . && docker run -p 3000:3000 -v pantry:/data pantry-pal`

## License

MIT
