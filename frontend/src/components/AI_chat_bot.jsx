import React, { useState } from "react";
import axios from "axios";

function Chat_bot() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hello 👋 I’m your Study AI" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("/api/chat", {
        message: input,
      });

      const aiMessage = {
        role: "ai",
        text: res.data.reply,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error getting response 😢" },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-[#0B0F1A] to-black rounded-xl border border-[#1F1F1F]">

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-xs text-sm ${
                msg.role === "user"
                  ? "bg-red-500 text-white"
                  : "bg-[#1F1F1F]"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-gray-400 text-sm">Typing...</div>
        )}
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-[#1F1F1F] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          className="flex-1 bg-[#111] px-4 py-2 rounded-full outline-none border border-[#1F1F1F]"
        />

        <button
          onClick={sendMessage}
          className="bg-red-500 px-4 py-2 rounded-full"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat_bot;