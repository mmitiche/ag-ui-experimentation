import express from "express";
import cors from "cors";
import agcore from "@ag-ui/core";

const { EventType } = agcore;

const app = express();
app.use(cors());
app.use(express.json());

function sseWrite(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function id(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * This endpoint matches what HttpAgent does by default:
 * - POST JSON (RunAgentInput)
 * - Accept: text/event-stream
 * - Stream BaseEvent objects
 *
 * RunAgentInput shape is documented here. :contentReference[oaicite:4]{index=4}
 */
app.post("/follow-up", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-answer-id", id("answer"));

  const input = req.body ?? {};
  const threadId = input.threadId || id("thread");
  const runId = id("run");

  const question = input.q;

  sseWrite(res, {
    type: EventType.RUN_STARTED,
    threadId,
    runId,
    timestamp: Date.now(),
  });

  // STATE_SNAPSHOT To Explore later
  // sseWrite(res, {
  //   type: EventType.STATE_SNAPSHOT,
  //   threadId,
  //   runId,
  //   timestamp: Date.now(),
  //   state: {
  //     status: "thinking",
  //   },
  // });

  const messageId = id("msg");

  const agentReply = `
  You asked about "${question}", which is an interesting topic!
  A query pipeline is a set of rules or model associations that modify queries performed in Coveo-powered search interfaces. It allows for the management of different search experiences by applying specific rules or models tailored to distinct user groups or purposes. Query pipelines can be managed through the Coveo Administration Console and can include features like A/B testing to evaluate changes on user subsets.`;

  sseWrite(res, {
    type: EventType.TEXT_MESSAGE_START,
    threadId,
    runId,
    timestamp: Date.now(),
    messageId: messageId,
  });

  // simulate chunked streaming
  const chunks = agentReply.match(/.{1,12}/g) ?? [];
  for (const chunk of chunks) {
    await new Promise((r) => setTimeout(r, 60));
    sseWrite(res, {
      type: EventType.TEXT_MESSAGE_CONTENT,
      threadId,
      runId,
      timestamp: Date.now(),
      messageId: messageId,
      delta: chunk,
    });
  }

  sseWrite(res, {
    type: EventType.TEXT_MESSAGE_END,
    threadId,
    runId,
    timestamp: Date.now(),
    messageId: messageId,
  });

  sseWrite(res, {
    type: EventType.RUN_FINISHED,
    threadId,
    runId,
    timestamp: Date.now(),
  });

  res.end();
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
  console.log(
    "POST http://localhost:3000/follow-up (Accept: text/event-stream)",
  );
});
