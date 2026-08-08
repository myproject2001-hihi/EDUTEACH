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

    if (messageText && messageText.startsWith('/start ') && senderId) {
      const code = messageText.replace('/start ', '').trim();
      console.log(`Linking Zalo Chat ID ${senderId} with Code ${code}`);
      
      try {
        const projectId = 'eduteach-c4af0';
        
        // Find user by connectionCode
        const queryRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
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
        
        const queryData = await queryRes.json();
        let targetDocName = null;
        let userName = "";
        
        if (queryData && queryData[0] && queryData[0].document) {
            targetDocName = queryData[0].document.name;
            userName = queryData[0].document.fields?.name?.stringValue || "";
        } else {
            // Fallback if they passed the raw ID
            targetDocName = `projects/${projectId}/databases/(default)/documents/users/${code}`;
        }

        if (targetDocName) {
            await fetch(`https://firestore.googleapis.com/v1/${targetDocName}?updateMask.fieldPaths=zaloChatId`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  zaloChatId: { stringValue: senderId }
                }
              })
            });
            console.log('Successfully updated user zaloChatId in Firestore');

            // Try to get global botToken to reply to the user
            try {
              const settingsRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/zalo_bot`);
              if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                const globalBotToken = settingsData?.fields?.botToken?.stringValue;
                
                if (globalBotToken) {
                  const replyText = `✅ Chúc mừng${userName ? ' ' + userName : ''}! Tài khoản Zalo của bạn đã kết nối thành công với hệ thống Eduteach. Bạn sẽ nhận được thông báo bài tập và lịch học tại đây.`;
                  
                  const isPersonalBot = globalBotToken.includes(':');
                  if (isPersonalBot) {
                    await fetch(`https://bot-api.zaloplatforms.com/bot${globalBotToken}/sendMessage`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        chat_id: String(senderId),
                        text: replyText,
                      }),
                    });
                  } else {
                    await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
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
                  }
                }
              }
            } catch (err) {
              console.error('Failed to send confirmation message to user:', err);
            }
        }
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
