import { HttpAgent } from "@ag-ui/client";

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const eventsEl = document.getElementById("events");

function renderMessages(messages) {
  chatEl.innerHTML = "";
  for (const m of messages) {
    const div = document.createElement("div");
    div.className = m.role;
    div.textContent = `${m.role}: ${typeof m.content === "string" ? m.content : ""}`;
    chatEl.appendChild(div);
  }
}

function logEvent(event) {
  if (event && typeof event === "object") {
    eventsEl.textContent += JSON.stringify(event.event) + "\n\n";
  }
}

/**
 * Conversation memory (what we send back each run)
 * AG-UI expects the client to pass messages explicitly
 */
let messages = [];

/**
 * Create the HTTP agent
 * Matches POST /agent on the backend
 */
const agent = new HttpAgent({
  url: "http://localhost:3000/agent",
  agentId: "unique-agent-id",
  threadId: "my example thread",
});

// Here we define the events we want to listen to from the agent.
const subscriber = {
  onTextMessageContentEvent: (event) => {
    logEvent(event);
  },
};

const subscription = agent.subscribe(subscriber);

/**
 * Run the agent once per user input
 */
async function runAgentWithUserMessage(text) {
  await agent.runAgent(
    {
      forwardedProps: {
        q: text,
      },
    },
  );
}

sendBtn.onclick = () => {
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = "";
  runAgentWithUserMessage(text);
};
