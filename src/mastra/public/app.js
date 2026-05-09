const chatBody = document.getElementById("chatBody");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const clearChat = document.getElementById("clearChat");
const promptButtons = document.querySelectorAll(".prompt");

const sessionId = crypto.randomUUID();
const messages = [];
const agentId = "citizen-assistant-agent";
const chatEndpoints = [`http://localhost:4111/chat/${agentId}`, `/api/chat/${agentId}`, `/chat/${agentId}`];

const appendMessage = (role, text) => {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = text;
  chatBody.appendChild(message);
  chatBody.scrollTop = chatBody.scrollHeight;
  return message;
};

const appendAssistantPlaceholder = () => {
  const message = document.createElement("div");
  message.className = "message assistant";
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = "Assistant";
  message.appendChild(label);
  const content = document.createElement("span");
  content.className = "content";
  message.appendChild(content);
  chatBody.appendChild(message);
  chatBody.scrollTop = chatBody.scrollHeight;
  return content;
};

const setInputHeight = () => {
  userInput.style.height = "auto";
  userInput.style.height = `${Math.min(userInput.scrollHeight, 160)}px`;
};

const parseStreamLines = (buffer, onPart) => {
  const lines = buffer.split("\n");
  const remaining = lines.pop() || "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "data: [DONE]") {
      continue;
    }

    const jsonText = trimmed.startsWith("data:")
      ? trimmed.slice(5).trim()
      : trimmed;
    try {
      const part = JSON.parse(jsonText);
      onPart(part);
    } catch (error) {
      console.warn("Failed to parse stream chunk", error);
    }
  }

  return remaining;
};

const postChat = async () => {
  let lastError = null;

  for (const endpoint of chatEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          memory: {
            thread: sessionId,
            resource: sessionId,
          },
        }),
      });

      if (response.ok && response.body) {
        return response;
      }
      lastError = new Error(`Request failed for ${endpoint}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to reach the assistant.");
};

const streamChat = async (content, assistantTarget) => {
  const response = await postChat();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    buffer = parseStreamLines(buffer, (part) => {
      const textDelta =
        part.text ||
        part.delta ||
        (part.payload && part.payload.text) ||
        (part.value && part.value.text) ||
        "";

      if (part.type === "text-delta" || part.type === "text" || textDelta) {
        assistantTarget.textContent += textDelta;
        chatBody.scrollTop = chatBody.scrollHeight;
      }
    });
  }
};

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = userInput.value.trim();
  if (!content) return;

  messages.push({ role: "user", content });
  appendMessage("user", content);
  userInput.value = "";
  setInputHeight();

  const assistantTarget = appendAssistantPlaceholder();

  try {
    await streamChat(content, assistantTarget);
    const assistantText = assistantTarget.textContent || "";
    messages.push({ role: "assistant", content: assistantText });
  } catch (error) {
    assistantTarget.textContent =
      "Sorry, the assistant is unavailable right now.";
    console.error(error);
  }
});

userInput.addEventListener("input", setInputHeight);

clearChat.addEventListener("click", () => {
  messages.length = 0;
  chatBody.innerHTML = "";
});

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    userInput.value = button.dataset.prompt || "";
    setInputHeight();
    userInput.focus();
  });
});

appendMessage(
  "assistant",
  "Hello! Ask me about smart city services in English or Amharic.",
);
