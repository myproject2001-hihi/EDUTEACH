import express from "express";
import path from "path";
import fs from "fs";
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
    console.log("Received Zalo Webhook:", JSON.stringify(req.body, null, 2));
    
    const eventName = req.body?.event_name;
    let messageText = req.body?.message?.text;
    let senderId = req.body?.sender?.id;

    // Support Zalo Bot Creator (Telegram-compatible / Bot Người đồng hành) format
    if (!senderId) {
      if (req.body?.message?.from?.id) {
        senderId = String(req.body.message.from.id);
      } else if (req.body?.message?.chat?.id) {
        senderId = String(req.body.message.chat.id);
      }
    }

    // Robust parsing of text message
    if (!messageText) {
      if (typeof req.body?.message === 'string') {
        messageText = req.body.message;
      } else if (req.body?.text) {
        messageText = req.body.text;
      }
    }

    if (messageText && typeof messageText === "string") {
      const trimmedText = messageText.trim();
      if (trimmedText.toLowerCase().startsWith("/start")) {
        const parts = trimmedText.split(/\s+/);
        const code = parts[1]?.trim() || "";
        
        console.log(`[Zalo Webhook] Processing /start with connection code: "${code}", senderId: "${senderId}"`);
        
        if (!code || !senderId) {
          console.log(`[Zalo Webhook] Missing connection code or senderId.`);
          return res.status(200).send("OK");
        }

        try {
          const projectId = 'eduteach-c4af0';
          
          // Get API key dynamically
          let apiKey = "AIzaSyDuMxRa1ZS3RcRaod69cU9EyVTDdaYno78"; // default fallback
          try {
            const configPath = path.join(process.cwd(), "firebase-applet-config.json");
            if (fs.existsSync(configPath)) {
              const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
              if (configData.apiKey) {
                apiKey = configData.apiKey;
              }
            }
          } catch (err) {
            console.error("[Zalo Webhook] Failed to load firebase config:", err);
          }

          console.log(`[Zalo Webhook] Querying user with connectionCode="${code}" using Firestore REST API...`);
          const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
          const queryRes = await fetch(queryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'users' }],
                where: {
                  fieldFilter: {
                    field: { fieldPath: 'connectionCode' },
                    op: 'EQUAL',
                    value: { stringValue: code }
                  }
                },
                limit: 1
              }
            })
          });

          console.log(`[Zalo Webhook] Query Response Status: ${queryRes.status}`);
          const queryText = await queryRes.text();
          console.log(`[Zalo Webhook] Query Response Body: ${queryText}`);

          let queryData;
          try {
            queryData = JSON.parse(queryText);
          } catch (e) {
            console.error(`[Zalo Webhook] Failed to parse query response as JSON:`, e);
          }

          let targetDocName = null;
          let userName = "";
          
          if (Array.isArray(queryData) && queryData[0] && queryData[0].document) {
              targetDocName = queryData[0].document.name;
              userName = queryData[0].document.fields?.name?.stringValue || "";
              console.log(`[Zalo Webhook] Found user document: ${targetDocName}, name: "${userName}"`);
          } else {
              console.log(`[Zalo Webhook] User not found by connectionCode query. Using fallback path.`);
              targetDocName = `projects/${projectId}/databases/(default)/documents/users/${code}`;
          }

          if (targetDocName) {
              console.log(`[Zalo Webhook] Updating zaloChatId to "${senderId}" for document: ${targetDocName}`);
              const patchUrl = `https://firestore.googleapis.com/v1/${targetDocName}?updateMask.fieldPaths=zaloChatId&key=${apiKey}`;
              const patchRes = await fetch(patchUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fields: {
                    zaloChatId: { stringValue: senderId }
                  }
                })
              });
              
              console.log(`[Zalo Webhook] Firestore PATCH Response Status: ${patchRes.status}`);
              const patchBody = await patchRes.text();
              console.log(`[Zalo Webhook] Firestore PATCH Response Body: ${patchBody}`);

              // Try to get global botToken to reply to the user
              try {
                console.log(`[Zalo Webhook] Loading global bot settings from settings/zalo_bot`);
                const settingsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/zalo_bot?key=${apiKey}`;
                const settingsRes = await fetch(settingsUrl);
                console.log(`[Zalo Webhook] Settings load status: ${settingsRes.status}`);
                
                if (settingsRes.ok) {
                  const settingsData = await settingsRes.json();
                  const globalBotToken = settingsData?.fields?.botToken?.stringValue;
                  
                  if (globalBotToken) {
                    const replyText = `✅ Chúc mừng${userName ? ' ' + userName : ''}! Tài khoản Zalo của bạn đã kết nối thành công với hệ thống Eduteach. Bạn sẽ nhận được thông báo bài tập và lịch học tại đây.`;
                    
                    const isPersonalBot = globalBotToken.includes(':');
                    console.log(`[Zalo Webhook] Global bot token loaded. isPersonalBot=${isPersonalBot}`);

                    if (isPersonalBot) {
                      console.log(`[Zalo Webhook] Replying via Personal Bot (Zalo Bot Creator) to chat_id: "${senderId}"`);
                      const botReplyUrl = `https://bot-api.zaloplatforms.com/bot${globalBotToken}/sendMessage`;
                      const botReplyRes = await fetch(botReplyUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          chat_id: String(senderId),
                          text: replyText,
                        }),
                      });
                      console.log(`[Zalo Webhook] Personal Bot reply status: ${botReplyRes.status}`);
                      const botReplyText = await botReplyRes.text();
                      console.log(`[Zalo Webhook] Personal Bot reply response: ${botReplyText}`);
                    } else {
                      console.log(`[Zalo Webhook] Replying via Official Zalo OA to user_id: "${senderId}"`);
                      const oaReplyRes = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          access_token: globalBotToken,
                        },
                        body: JSON.stringify({
                          recipient: { user_id: senderId },
                          message: { text: replyText },
                        }),
                      });
                      console.log(`[Zalo Webhook] Zalo OA reply status: ${oaReplyRes.status}`);
                      const oaReplyText = await oaReplyRes.text();
                      console.log(`[Zalo Webhook] Zalo OA reply response: ${oaReplyText}`);
                    }
                  } else {
                    console.log(`[Zalo Webhook] No botToken found in settings/zalo_bot`);
                  }
                } else {
                  const settingsErrText = await settingsRes.text();
                  console.error(`[Zalo Webhook] Failed to load settings document: ${settingsErrText}`);
                }
              } catch (err) {
                console.error('[Zalo Webhook] Failed to send confirmation message to user:', err);
              }
          }
        } catch (err) {
          console.error('[Zalo Webhook] Failed to process webhook flow:', err);
        }
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
      const isPersonalBot = botToken.includes(':');
      let response;
      if (isPersonalBot) {
        response = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: String(chatId),
            text: message,
          }),
        });
      } else {
        response = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
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
      }

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
