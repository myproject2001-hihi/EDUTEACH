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

  app.post("/api/zalo/send", async (req, res) => {
    const { accessToken, zaloUserId, message } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "Missing Zalo OA Access Token" });
    }
    if (!zaloUserId) {
      return res.status(400).json({ error: "Missing Student Zalo User ID" });
    }
    if (!message) {
      return res.status(400).json({ error: "Missing message content" });
    }

    try {
      const response = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": accessToken,
        },
        body: JSON.stringify({
          recipient: {
            user_id: zaloUserId,
          },
          message: {
            text: message,
          },
        }),
      });

      const data = await response.json() as any;

      if (data.error && data.error !== 0) {
        return res.status(400).json({ 
          error: data.message || "Failed to send Zalo message", 
          errorCode: data.error 
        });
      }

      res.json({ success: true, data });
    } catch (err: any) {
      console.error("Zalo API error:", err);
      res.status(500).json({ error: "Internal server error: " + err.message });
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
