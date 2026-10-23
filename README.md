# Pantry Pal: an Alexa+ MCP server

A voice-first kitchen assistant built as a self-hosted [MCP](https://modelcontextprotocol.io) server
(Streamable HTTP, spec 2025-11-25+) for Alexa+. Tell Alexa what you bought, ask what's about to
expire, and get a dinner idea built from what you already have.

Built for the Build, Ship, Shape: Amazon Developer Hackathon (Alexa+ track, AWS Builder mini challenge).

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

## AWS integration

`suggest_recipe` calls Amazon Bedrock (Converse API) when `BEDROCK_MODEL_ID` is set, ranking pantry items
by expiry so the model prioritizes food that is about to go off. Without it, the tool falls back to a local
suggestion, so the server runs with no AWS account.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000/mcp
npm test               # unit tests (date parsing)
npm run smoke          # with the server running: end-to-end MCP client checks
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

## Layout

- `src/server.ts`: Express app exposing the stateless Streamable HTTP endpoint
- `src/mcp.ts`: tool definitions
- `src/recipes.ts`: Bedrock call with local fallback
- `src/store.ts`: per-household JSON persistence with write serialisation
- `src/dates.ts`: natural-language expiry parsing and shelf-life estimates
- `src/smoke-test.ts`: end-to-end client test
- `Dockerfile`: `docker build -t pantry-pal . && docker run -p 3000:3000 -v pantry:/data pantry-pal`

## License

MIT
