const xss = require('xss');

module.exports = async (req, res) => {
  // إعدادات الـ CORS للسماح بالطلبات
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      console.error("Error: GEMINI_API_KEY is not set in Vercel environment variables");
      return res.status(500).json({ 
        status: 'error', 
        message: 'API Key is missing. Please set GEMINI_API_KEY in your environment variables.' 
      });
    }

    // تنظيف الرسالة من أي أكواد خبيثة
    const cleanMessage = xss(message);

    // تجهيز المحادثة مع الـ System Instruction
    const contents = [...(history || []), { role: "user", parts: [{ text: cleanMessage }] }];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: "أنت مستشار تسويقي ذكي ومحترف تعمل لدى شركة 'تكنولوجيا التسويق الإلكتروني'. قم بالرد بإيجاز واحترافية وبلهجة ودودة. أجب فقط على الأسئلة المتعلقة بالتسويق الإلكتروني، الإعلانات، تحسين المبيعات، والبيانات." }]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error Detail:", JSON.stringify(data));
      return res.status(response.status).json({ status: 'error', message: 'خطأ في الاتصال بالذكاء الاصطناعي', detail: data });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "عذرًا، لم أتمكن من توليد رد.";

    return res.status(200).json({
      status: 'success',
      reply: replyText
    });

  } catch (error) {
    console.error("Global Catch Error:", error.message);
    return res.status(500).json({ status: 'error', message: 'حدث خطأ داخلي في الخادم' });
  }
};
