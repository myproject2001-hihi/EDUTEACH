import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Zalo Webhook endpoint
  app.post("/api/zalo-webhook", async (req, res) => {
    console.log("Received Zalo Webhook:", req.body);
    const eventName = req.body?.event_name;
    const messageText = req.body?.message?.text;
    const senderId = req.body?.sender?.id;

    if (eventName === 'user_send_text' && messageText && messageText.startsWith('/start ') && senderId) {
      const userId = messageText.replace('/start ', '').trim();
      console.log(`Linking Zalo Chat ID ${senderId} to User ID ${userId}`);
      
      // Update the user's zaloChatId using Firebase REST API (bypassing SDK setup for simple demo)
      try {
        const projectId = 'eduteach-c4af0';
        await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?updateMask.fieldPaths=zaloChatId`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              zaloChatId: { stringValue: senderId }
            }
          })
        });
        console.log('Successfully updated user zaloChatId in Firestore');
      } catch (err) {
        console.error('Failed to update Firestore:', err);
      }
    }
    
    // Always return 200 to Zalo
    res.status(200).send("OK");
  });

  // API to trigger Zalo messages
  app.post("/api/send-zalo-message", async (req, res) => {
    const { botToken, chatId, message } = req.body;
    if (!botToken || !chatId || !message) {
      return res.status(400).json({ error: "Missing botToken, chatId, or message" });
    }

    try {
      const response = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: botToken,
        },
        body: JSON.stringify({
          recipient: { user_id: chatId },
          message: { text: message },
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("Error sending Zalo message:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
