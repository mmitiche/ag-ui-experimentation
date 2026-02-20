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

app.post("/orgs/:orgId/agents/:agentId/follow-up", async (req, res) => {
  const { orgId, agentId } = req.params;
  console.log(
    `Received follow-up request for org ${orgId} and agent ${agentId}`,
  );
  const runId = id("run");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-answer-id", runId);

  const input = req.body ?? {};
  const question = input.q;
  const threadId = input.conversationId;
  const messageId = id("msg");
  const agentReply = `
  You are asking a follow up question about "${question}", which is an interesting topic for a follow up answer!
  ## Query Pipelines
  A query pipeline is a set of rules or model associations that modify queries performed in Coveo-powered search interfaces. It allows for the management of different search experiences by applying specific rules or models tailored to distinct user groups or purposes.
  Query pipelines can be managed through the Coveo Administration Console and can include features like A/B testing to evaluate changes on user subsets.
  `;

  /** Run starts */
  sseWrite(res, {
    type: EventType.RUN_STARTED,
    threadId,
    runId,
    timestamp: Date.now(),
  });

  /** Header event */
  sseWrite(res, {
    type: EventType.CUSTOM,
    name: "header",
    value: {
      contentFormat: "text/markdown",
    },
    threadId,
    runId,
    timestamp: Date.now(),
  });

  /** First Step starts: searching */
  sseWrite(res, {
    type: EventType.STEP_STARTED,
    stepName: "searching",
    timestamp: Date.now(),
  });

  await new Promise((r) => setTimeout(r, 1500));

  sseWrite(res, {
    type: EventType.STEP_FINISHED,
    stepName: "searching",
    timestamp: Date.now(),
  });

  /** First Step ends: searching */

  /** Second Step starts: thinking */
  sseWrite(res, {
    type: EventType.STEP_STARTED,
    stepName: "thinking",
    timestamp: Date.now(),
  });

  await new Promise((r) => setTimeout(r, 1500));

  /** Second Step ends: thinking */
  sseWrite(res, {
    type: EventType.STEP_FINISHED,
    stepName: "thinking",
    timestamp: Date.now(),
  });

  /** Message starts */
  sseWrite(res, {
    type: EventType.TEXT_MESSAGE_START,
    timestamp: Date.now(),
    messageId: messageId,
  });

  const chunks = agentReply.split(/(\n)/);
  for (const chunk of chunks) {
    await new Promise((r) => setTimeout(r, 50));
    if (!chunk) continue; // skip empty chunks
    sseWrite(res, {
      type: EventType.TEXT_MESSAGE_CONTENT,
      timestamp: Date.now(),
      messageId: messageId,
      delta: chunk,
    });
  }

  sseWrite(res, {
    type: EventType.TEXT_MESSAGE_END,
    timestamp: Date.now(),
    messageId: messageId,
  });
  /** Message ends */

  /** Citations starts */
  sseWrite(res, {
    type: EventType.CUSTOM,
    name: "citations",
    value: {
      citations: [
        {
          id: "NB4GO5LIOZNDOMSRGZT4HMLJM5US4NBWGU4TILTEMVTGC5LMOQ",
          title: "About Coveo In-Product Experience",
          uri: "https://docs.coveo.com/en/n47d1000/",
          clickUri: "https://docs.coveo.com/en/n47d1000/",
          permanentid:
            "954f9d44bee238a72b0abc2fcd52823a0cca3e16cb3ac35163764b25c79c",
          primaryId: "NB4GO5LIOZNDOMSRGZT4HMLJM5US4NBWGU4TILTEMVTGC5LMOQ",
          text: "# About Coveo In-Product Experience ...",
          source: "Coveo Docs",
          filetype: "html",
        },
        {
          id: "NNYWUR3FMM3WI5L2J4YXOVDENAXDINRVHE2C4ZDFMZQXK3DU",
          title:
            "Create and manage in-product experiences | Coveo In-Product Experience",
          uri: "https://docs.coveo.com/en/3160/",
          clickUri: "https://docs.coveo.com/en/3160/",
          permanentid:
            "e607f4ffe29a5bada0e7c02cb25e4cf6ffea892380f6ef67c2f633a3962b",
          primaryId: "NNYWUR3FMM3WI5L2J4YXOVDENAXDINRVHE2C4ZDFMZQXK3DU",
          text: "# Create and manage in-product experiences ...",
          source: "Coveo Docs",
          filetype: "html",
        },
      ],
    },
    timestamp: Date.now(),
  });
  /** Citations ends */

  sseWrite(res, {
    type: EventType.RUN_FINISHED,
    threadId,
    runId,
    timestamp: Date.now(),
    result: {
      answerGenerated: true,
    },
  });

  res.end();
});

app.post("/orgs/:orgId/agents/:agentId/answer", async (req, res) => {
  const { orgId, agentId } = req.params;
  console.log(`Received answer request for org ${orgId} and agent ${agentId}`);
  const runId = id("run");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-answer-id", runId);

  const input = req.body ?? {};
  const threadId = id("thread");
  const question = input.q;
  const messageId = id("msg");
  const agentReply = `
  You searched about "${question}", which is an interesting topic for a head answer!
  ## Query Pipelines
  A query pipeline is a set of rules or model associations that modify queries performed in Coveo-powered search interfaces. It allows for the management of different search experiences by applying specific rules or models tailored to distinct user groups or purposes.
  Query pipelines can be managed through the Coveo Administration Console and can include features like A/B testing to evaluate changes on user subsets.
  `;

  /** Run starts */
  sseWrite(res, {
    type: EventType.RUN_STARTED,
    threadId,
    runId,
    timestamp: Date.now(),
  });

  /** Header event */
  sseWrite(res, {
    type: EventType.CUSTOM,
    name: "header",
    value: {
      conversationId: threadId,
      contentFormat: "text/markdown",
      followUpEnabled: true,
    },
    timestamp: Date.now(),
  });

  /** First Step starts: searching */
  sseWrite(res, {
    type: EventType.STEP_STARTED,
    stepName: "searching",
    timestamp: Date.now(),
  });

  await new Promise((r) => setTimeout(r, 1500));

  sseWrite(res, {
    type: EventType.STEP_FINISHED,
    stepName: "searching",
    timestamp: Date.now(),
  });

  /** First Step ends: searching */

  /** Second Step starts: thinking */
  sseWrite(res, {
    type: EventType.STEP_STARTED,
    stepName: "thinking",
    timestamp: Date.now(),
  });

  await new Promise((r) => setTimeout(r, 1500));

  /** Second Step ends: thinking */
  sseWrite(res, {
    type: EventType.STEP_FINISHED,
    stepName: "thinking",
    timestamp: Date.now(),
  });

  const chunks = agentReply.split(/(\n)/);
  for (const chunk of chunks) {
    await new Promise((r) => setTimeout(r, 50));
    if (!chunk) continue; // skip empty chunks
    sseWrite(res, {
      type: EventType.TEXT_MESSAGE_CHUNK,
      timestamp: Date.now(),
      messageId: messageId,
      delta: chunk,
    });
  }

  /** Citations starts */
  sseWrite(res, {
    type: EventType.CUSTOM,
    name: "citations",
    value: {
      citations: [
        {
          id: "NB4GO5LIOZNDOMSRGZT4HMLJM5US4NBWGU4TILTEMVTGC5LMOQ",
          title: "About Coveo In-Product Experience",
          uri: "https://docs.coveo.com/en/n47d1000/",
          clickUri: "https://docs.coveo.com/en/n47d1000/",
          permanentid:
            "954f9d44bee238a72b0abc2fcd52823a0cca3e16cb3ac35163764b25c79c",
          primaryId: "NB4GO5LIOZNDOMSRGZT4HMLJM5US4NBWGU4TILTEMVTGC5LMOQ",
          text: "# About Coveo In-Product Experience ...",
          source: "Coveo Docs",
          filetype: "html",
        },
        {
          id: "NNYWUR3FMM3WI5L2J4YXOVDENAXDINRVHE2C4ZDFMZQXK3DU",
          title:
            "Create and manage in-product experiences | Coveo In-Product Experience",
          uri: "https://docs.coveo.com/en/3160/",
          clickUri: "https://docs.coveo.com/en/3160/",
          permanentid:
            "e607f4ffe29a5bada0e7c02cb25e4cf6ffea892380f6ef67c2f633a3962b",
          primaryId: "NNYWUR3FMM3WI5L2J4YXOVDENAXDINRVHE2C4ZDFMZQXK3DU",
          text: "# Create and manage in-product experiences ...",
          source: "Coveo Docs",
          filetype: "html",
        },
      ],
    },
    timestamp: Date.now(),
  });
  /** Citations ends */

  sseWrite(res, {
    type: EventType.RUN_FINISHED,
    threadId,
    runId,
    timestamp: Date.now(),
    result: {
      answerGenerated: true,
    },
  });

  res.end();
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
  console.log(
    "POST http://localhost:3000/follow-up (Accept: text/event-stream)",
  );
  console.log("POST http://localhost:3000/answer (Accept: text/event-stream)");
});
