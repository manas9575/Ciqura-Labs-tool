import React, { useState } from "react";
import api from "../lib/api";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [loading, setLoading] = useState(false);

  const sendNotification = async () => {
    if (!title || !message) {
      alert("Title and message required");
      return;
    }

    try {
      setLoading(true);

      await api.post("/notifications", {
        title,
        message,
        type
      });

      alert("✅ Notification sent!");

      setTitle("");
      setMessage("");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-2xl font-bold mb-6">Send Notification</h2>

      <input
        className="border p-2 w-full mb-3"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="border p-2 w-full mb-3"
        placeholder="Message"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <select
        className="border p-2 w-full mb-4"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="success">Success</option>
      </select>

      <button
        onClick={sendNotification}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2"
      >
        {loading ? "Sending..." : "Send Notification"}
      </button>
    </div>
  );
}
