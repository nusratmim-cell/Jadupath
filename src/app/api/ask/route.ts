import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  checkRateLimit,
  getClientIdentifier,
  isValidGeminiApiKey,
  validateRequestBody,
  createStreamingResponse,
  sanitizeString,
  withTimeout,
} from "@/lib/apiUtils";

// System instruction for the AI tutor - General purpose assistant
const SYSTEM_INSTRUCTION = `তুমি "শিখো সহায়ক" - বাংলাদেশের প্রাথমিক বিদ্যালয়ের শিক্ষকদের জন্য একজন বুদ্ধিমান সহকারী।

CRITICAL LANGUAGE INSTRUCTION - MUST FOLLOW:
- You MUST respond ONLY in Bengali script (বাংলা লিপি)
- NEVER use Hindi/Devanagari script (हिंदी/देवनागरी लिपि)
- Write ONLY in Bengali language of Bangladesh (বাংলাদেশের বাংলা ভাষা)
- If you accidentally write in Hindi, IMMEDIATELY STOP and rewrite in Bengali
- Use ONLY Bengali script: অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ ড় ঢ় য় ৎ ং ঃ ঁ
- DO NOT use Devanagari: अ आ इ ई उ ऊ ऋ ए ऐ ओ औ क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह
- Always verify you are writing in Bengali script before responding

তোমার কাজ:
- শিক্ষকদের যেকোনো প্রশ্নের উত্তর দেওয়া
- পাঠদান, শিক্ষার্থী ব্যবস্থাপনা, বিষয়বস্তু, পাঠ পরিকল্পনা সম্পর্কে সহায়তা করা
- প্রাথমিক স্তরের (ক্লাস ১-৫) সকল বিষয়ে সাহায্য করা
- শিক্ষকদের পেশাগত উন্নয়নে সহায়তা করা
- কার্যকর শিক্ষণ পদ্ধতি সম্পর্কে পরামর্শ দেওয়া
- শিক্ষা সংক্রান্ত যেকোনো প্রশ্নের উত্তর দেওয়া

নিয়ম:
- সব উত্তর বাংলায় দাও (BENGALI SCRIPT ONLY - NOT HINDI/DEVANAGARI)
- পেশাদার কিন্তু বন্ধুত্বপূর্ণ ভাষা ব্যবহার কর
- বাস্তব ও প্রাসঙ্গিক উদাহরণ দাও
- বাংলাদেশের শিক্ষা ব্যবস্থার প্রেক্ষাপট বিবেচনা কর
- সুস্পষ্ট ও সহায়ক উত্তর দাও
- উত্তর সংক্ষিপ্ত ও বোধগম্য রাখো (৮-১০ লাইন)

IMPORTANT - Response Style:
- Answer the question EXACTLY as asked - do NOT assume user meant something else
- Be direct and confident - do NOT apologize unnecessarily
- If user asks about "ভাগ" (division), answer about division
- If user asks about "যোগ" (addition), answer about addition
- Do NOT say things like "দুঃখিত, আপনি সম্ভবত X এর বদলে Y সম্পর্কে জানতে চেয়েছেন"
- Trust the user knows what they are asking
- Be helpful and straightforward without second-guessing user intent`;

interface RequestBody {
  question: string;
  topicName?: string;
  chapterName?: string;
  chatHistory?: Array<{ role: string; content: string }>;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 20, // 20 requests
      windowMs: 60000, // per minute
    });

    if (!rateLimit.allowed) {
      return new Response(
        "অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন। অনেক বেশি প্রশ্ন করা হয়েছে।",
        {
          status: 429,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Validate request body
    const validation = await validateRequestBody<RequestBody>(request, {
      question: {
        required: true,
        type: "string",
        minLength: 1,
        maxLength: 1000,
      },
      topicName: {
        type: "string",
        maxLength: 200,
      },
      chapterName: {
        type: "string",
        maxLength: 200,
      },
      chatHistory: {
        type: "array",
        maxLength: 50, // Limit chat history to prevent memory issues
      },
    });

    if (!validation.valid) {
      return new Response(
        `ভুল তথ্য: ${validation.error}`,
        {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    const { question, topicName, chapterName, chatHistory } = validation.data!;

    // Sanitize inputs
    const sanitizedQuestion = sanitizeString(question);
    const sanitizedTopicName = topicName ? sanitizeString(topicName) : "";
    const sanitizedChapterName = chapterName ? sanitizeString(chapterName) : "";

    if (!sanitizedQuestion) {
      return new Response(
        "প্রশ্ন খালি থাকতে পারবে না",
        {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!isValidGeminiApiKey(apiKey)) {
      console.error("Invalid or missing Gemini API key");
      return new Response(
        "দুঃখিত, AI সেবা বর্তমানে উপলব্ধ নেই। পরে চেষ্টা করুন।",
        {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    try {
      // Try Gemini API
      const genAI = new GoogleGenerativeAI(apiKey!);
      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 800,
        },
      });

      // Build context with optional topic information
      let context = `প্রশ্ন: ${sanitizedQuestion}\n\nউত্তর (বাংলায়):`;

      if (sanitizedTopicName || sanitizedChapterName) {
        context = `বর্তমান প্রসঙ্গ:
${sanitizedChapterName ? `অধ্যায়: ${sanitizedChapterName}` : ''}
${sanitizedTopicName ? `টপিক: ${sanitizedTopicName}` : ''}

প্রশ্ন: ${sanitizedQuestion}

উত্তর (বাংলায়):`;
      }

      // Sanitize and validate chat history
      const sanitizedHistory = (chatHistory || [])
        .filter((msg) => msg && typeof msg === "object" && msg.role && msg.content)
        .slice(-20) // Keep last 20 messages
        .map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: sanitizeString(msg.content).slice(0, 2000) }],
        }));

      const chat = model.startChat({ history: sanitizedHistory });
      // Add 45-second timeout for AI response
      const result = await withTimeout(
        chat.sendMessage(context),
        45000,
        "সময় শেষ হয়ে গেছে, আবার চেষ্টা করুন"
      );
      const text = result.response.text();

      // Return streaming response with cleanup
      return createStreamingResponse(text, {
        chunkDelay: 3,
        onAbort: () => {
          console.log("Client disconnected from ask API");
        },
      });
    } catch (apiError: unknown) {
      console.error("Gemini API failed:", apiError);

      return new Response(
        "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।",
        {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }
  } catch (error) {
    console.error("Ask API error:", error);

    return new Response(
      "দুঃখিত, সার্ভার এরর হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
      {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }
}
