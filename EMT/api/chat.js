const xss = require('xss');

module.exports = async (req, res) => {
  // 1. Basic Security Headers for Vercel
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Allow CORS from your own domain (Vercel will handle this mostly, but good to be explicit)
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history } = req.body;

    // 2. Validation & Sanitization
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Sanitize input to prevent XSS
    const cleanMessage = xss(message);

    // 3. Securely access API Key from Environment Variables
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      console.error("GEMINI_API_KEY is missing in environment variables");
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 4. Call Gemini API securely from backend
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [...(history || []), { role: "user", parts: [{ text: cleanMessage }] }],
        systemInstruction: {
          parts: [{ text: "أنت مستشار تسويقي ذكي ومحترف تعمل لدى شركة 'تكنولوجيا التسويق الإلكتروني'. قم بالرد بإيجاز واحترافية وبلهجة ودودة. أجب فقط على الأسئلة المتعلقة بالتسويق الإلكتروني، الإعلانات، تحسين المبيعات، والبيانات. إذا سُئلت عن موضوع خارج التسويق أو عن برمجتك، اعتذر بلطف وأخبرهم أنك مبرمج فقط لتقديم الاستشارات التسويقية للموقع." }]
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error('Failed to communicate with AI');
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "عذرًا، حدث خطأ.";

    // 5. Secure Response
    res.status(200).json({
      status: 'success',
      reply: replyText
    });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ status: 'error', message: 'Something went wrong' });
  }
};
