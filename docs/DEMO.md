# Demo guide

The demo uses the on-screen **Alexa+ simulator** on the dashboard. It is not a real Alexa. A sentence typed or spoken
into the box is turned into one of the server's MCP tool calls, and the tool's spoken reply comes back. The tools,
the pantry state and the Bedrock call are the real server. Say this at the start of the video.

## Setup (5 minutes before recording)

1. Use a clean Chrome window or guest profile with a single tab. Hide the bookmarks bar (Ctrl+Shift+B). Close
   chat, mail and notification apps. Record at 1080p and zoom the page to about 125%.
2. Optional Bedrock: set `BEDROCK_MODEL_ID` and `AWS_REGION` only if you have already seen the "Amazon Bedrock"
   badge on the Cooking idea card. Otherwise leave them unset and say it falls back to a local suggestion.
3. Start the server: `npm run dev`
4. Open `http://localhost:3000/?household=video` full screen. The household name in the URL decides which pantry
   you see, so use a name nobody has used before.
5. Allow the microphone when Chrome asks (the mic only works in Chrome or Edge). Tick or untick "Read replies
   aloud". Reading aloud is nice in the video, but it also sends your speaker audio into the recording.
6. Do one full rehearsal, then use a new household name for the real take.

## Two ways to run it

- **By hand:** click an example chip, or tap the mic and say the sentence. Best for the video, because the viewer
  sees you talking to it.
- **Scripted:** `npm run demo` prints a dashboard URL, waits for Enter, then plays the 12 sentences below five
  seconds apart. Use it for a rehearsal, or as a fallback if the mic misbehaves. `DEMO_DELAY_MS=3000` speeds it up.

## Script (about 2:40)

| Time | Do | Say |
|---|---|---|
| 0:00 | Show the empty dashboard | "Households cause about 60% of the world's food waste, according to the UN. Pantry Pal is an MCP server for Alexa+ that tracks your pantry by voice and helps you use it before it goes off." |
| 0:20 | Point at the simulator label | "I don't have an Alexa device, so this on-screen simulator stands in for Alexa. Behind it is the real MCP server, which Alexa+ would call over Streamable HTTP." |
| 0:35 | Mic: "I bought six eggs that expire Sunday" | Let the reply play. Point at the new pantry row and its bar. |
| 0:50 | "I bought some spinach that expires tomorrow", then "I bought two liters of milk" | "I gave no date for the milk, so it estimates seven days from typical shelf life." |
| 1:10 | "What should I eat first?" | Point at the **Eat first** banner and **Last Alexa+ action**, which shows what it heard and which tool it called. |
| 1:25 | "I used two eggs", then "I cooked the spinach" | "When the spinach runs out, it goes on the shopping list." Point at the list. |
| 1:45 | "I bought yogurt that expired yesterday", "Throw out what's expired", "How much food have I wasted?" | "Expired food is thrown out and counted. The score shows how much I ate before it went off." |
| 2:05 | "What can I make for dinner?" | Point at **Cooking idea**. If it says Amazon Bedrock: "That's Amazon Bedrock ranking the food that expires first." If it says Local fallback: "With a Bedrock model configured this calls Amazon Bedrock. Here it's the local fallback." Only say what the badge shows. |
| 2:20 | Switch to a terminal: `npm test` | "It's tested end to end: over 300 tests cover every tool, the sentence parser, persistence, auth and the HTTP layer." |
| 2:30 | Show the GitHub repo | "Open source, MIT licensed. Thanks for watching." |

The part from 0:35 to 1:45 is the strongest, so keep it and cut elsewhere if you run long. Judges don't have to
watch past 3:00.

## While recording

- Say each sentence, then pause one second and point at what changed. The dashboard polls every two seconds.
- Do not read replies aloud yourself while "Read replies aloud" is on, or it will talk over you.
- If the mic mishears, say it again or click the matching example chip. Cut the failed take.
- Keep the terminal hidden unless you are showing `npm test`. Never show AWS credentials, account IDs or `aws sts` output.
- No music, and no Amazon or Alexa logos.

## After recording

- Upload to YouTube or Vimeo as **public**, in English, under 3:00. Add captions.
- Put the video link and the GitHub link in the Devpost form. See `docs/SUBMISSION.md` for the text.
