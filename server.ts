import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Lazy initialization of GoogleGenAI to ensure zero crashes if GEMINI_API_KEY is not defined or invalid
let aiClient: GoogleGenAI | null = null;
let isKeyDisabled = false;

function getGeminiClient(): GoogleGenAI | null {
  if (isKeyDisabled) return null;
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim().length > 10) {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (e) {
        isKeyDisabled = true;
        return null;
      }
    }
  }
  return aiClient;
}

function getFallbackResponse(message: string, role: string): string {
  const msg = message.toLowerCase();
  const isTeacher = role === "teacher";
  
  if (msg.includes("on air") || msg.includes("bản nháp") || msg.includes("phát sóng") || msg.includes("trạng thái")) {
    return isTeacher
      ? "Chế độ Bản Nháp giúp Thầy/Cô soạn bài an toàn. Khi nào bài tập sẵn sàng, Thầy/Cô chỉ cần gạt công tắc \"On Air\" để phát sóng bài cho học sinh. 🟢"
      : "Các bài tập đều cần Thầy/Cô gạt chế độ \"On Air\" thì bạn mới có thể thấy và làm bài được nhé! 📝";
  }
  if (msg.includes("flashcard") || msg.includes("thẻ")) {
    return "Hệ thống hỗ trợ thẻ ghi nhớ Flashcard 2 mặt đính kèm hình ảnh sinh động. Bạn có thể lật thẻ ôn tập, làm trắc nghiệm nhanh hoặc chơi Lật thẻ ghép cặp rèn luyện trí nhớ! 🗂️";
  }
  if (msg.includes("game") || msg.includes("trò chơi") || msg.includes("chơi")) {
    return "EduTeach tích hợp các trò chơi trí tuệ kịch tính như Kéo co tri thức và Đuổi hình bắt chữ. Hãy tham gia thi đấu để tích luỹ điểm số thi đua nhé! 🎮";
  }
  if (msg.includes("đổi quà") || msg.includes("quà") || msg.includes("khung") || msg.includes("huy hiệu")) {
    return "Cửa Hàng Đổi Quà cho phép học sinh dùng điểm thưởng tích lũy quy đổi lấy Khung Avatar phát sáng, Huy hiệu vinh danh và các đặc quyền ảo siêu ngầu! 🎁";
  }
  if (msg.includes("mô phỏng") || msg.includes("thí nghiệm") || msg.includes("vật lý") || msg.includes("hóa học") || msg.includes("lập trình")) {
    return "Phòng thí nghiệm ảo mô phỏng trực quan giúp các môn học khô khan trở nên trực quan sinh động. Thầy/Cô và học sinh có thể tham gia thí nghiệm ngay! 🔬";
  }
  return isTeacher 
    ? "Dạ, em là Robot Lễ tân luôn sẵn sàng hỗ trợ Thầy/Cô quản lý học sinh, giao bài tập \"On Air\", tổ chức trò chơi và Cửa hàng đổi quà. Thầy/Cô cần em hướng dẫn phần nào ạ? 🤖"
    : "Chào bạn! Mình là Robot đồng hành, luôn sẵn sàng giúp bạn làm bài tập, học từ vựng Flashcard, chơi game Kéo co và đổi quà thưởng cực vui. Bạn cần mình giúp gì nào? 🤖";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Robot Receptionist AI chat route
  app.post("/api/robot/chat", async (req, res) => {
    const { message, history, role } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message content" });
    }

    const systemInstruction = `
Bạn là "Robot Lễ Tân & Hướng Dẫn Viên" thông minh, vô cùng hóm hỉnh, ấm áp và tận tâm của nền tảng giáo dục EduTeach.
Nhiệm vụ của bạn là đón tiếp người dùng (Giáo viên hoặc Học sinh), hướng dẫn họ sử dụng các tính năng xịn xò của EduTeach và giải đáp mọi câu hỏi liên quan.
Vai trò hiện tại của người dùng là: ${role === "teacher" ? "Giáo viên" : "Học sinh"}.

Giới thiệu các tính năng độc đáo của hệ thống khi được hỏi:
1. Chế độ Phát sóng (On Air) / Bản Nháp: Cho phép giáo viên biên soạn bài tập, game, flashcard ở dạng nháp an toàn trước khi "On Air" phát hành cho học sinh. Học sinh chỉ được thấy và làm các bài đã được phát sóng.
2. Flashcard hình ảnh 2 mặt: Chèn ảnh minh họa cho cả 2 mặt của thẻ, học tập trực quan, tự động gộp bộ thẻ tạo bài quiz hoặc trò chơi Lật thẻ ghép cặp.
3. Cửa Hàng Đổi Quà Thưởng: Cho phép học sinh dùng điểm thưởng tích lũy quy đổi lấy Khung Avatar phát sáng, Huy hiệu vinh danh.
4. Trò chơi Trí tuệ: Tích hợp game Kéo co tri thức kịch tính và Đuổi hình bắt chữ giúp học vui hơn.
5. Phòng thí nghiệm ảo (Mô phỏng): Thí nghiệm trực quan Vật lý, Hóa học và Lập trình kéo thả thú vị.
6. Hòm thư yêu thương: Gửi thư khen viết tay 3D động viên học sinh nỗ lực.

Quy tắc trả lời:
- Luôn trả lời bằng Tiếng Việt thân thiện, văn minh, tràn đầy năng lượng tích cực và dùng icon sinh động (🤖, 🌟, 📚, 🎮, 🔬, 🟢...).
- Câu trả lời cực kỳ ngắn gọn, súc tích và có trọng tâm (khoảng 2-3 câu ngắn, không dài dòng lê thê để người dùng đọc nhanh trên mọi thiết bị).
- Nếu người dùng là Giáo viên: Xưng là "Em" và gọi là "Thầy/Cô". 
- Nếu người dùng là Học sinh: Xưng là "Mình" hoặc "Robot" và gọi là "Bạn" hoặc "Cậu".
`;

    try {
      const client = getGeminiClient();
      if (!client) {
        console.warn("GEMINI_API_KEY is not defined. Falling back to local smart engine.");
        return res.json({ reply: getFallbackResponse(message, role) });
      }

      // Format conversation contents for GoogleGenAI SDK
      const formattedContents = [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: "Tôi đã hiểu rõ nhiệm vụ làm Robot Lễ Tân EduTeach. Tôi sẵn sàng trả lời thông minh, ngắn gọn để phục vụ Thầy/Cô và các bạn học sinh!" }] }
      ];

      if (history && Array.isArray(history)) {
        history.forEach((h: any) => {
          formattedContents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.text }]
          });
        });
      }

      formattedContents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: formattedContents,
        config: {
          maxOutputTokens: 300,
          temperature: 0.7,
        }
      });

      res.json({ reply: response.text || getFallbackResponse(message, role) });
    } catch (err: any) {
      isKeyDisabled = true;
      aiClient = null;
      res.json({ reply: getFallbackResponse(message, role) });
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
