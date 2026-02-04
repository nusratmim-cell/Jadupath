import { NextRequest, NextResponse } from "next/server";
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
import { getTextbookImages, getImagePartsForGemini } from "@/lib/textbookImageHelper";

// System prompt for generating summaries
const SYSTEM_PROMPT = `তুমি "শিখো সহায়ক" - বাংলাদেশের একজন বন্ধুসুলভ প্রাথমিক বিদ্যালয়ের শিক্ষক সহকারী।

তোমার কাজ পাঠ্যবইয়ের বিষয়বস্তুর সারাংশ তৈরি করা।

CRITICAL LANGUAGE REQUIREMENT:
- ONLY use Bengali language (বাংলা ভাষা)
- DO NOT use Hindi or Devanagari script (हिंदी नहीं)
- All text must be in Bengali script (বাংলা লিপি)

নিয়ম:
- পাঠ্যবইয়ের ছবিগুলো বিশ্লেষণ করে সারাংশ তৈরি করো
- শিশুদের বয়স-উপযোগী সহজ বাংলায় লেখো
- ৫-৬টি বুলেট পয়েন্টে মূল বিষয়গুলো তুলে ধরো
- বাস্তব ও পাঠ্যবইয়ের উদাহরণ দাও
- প্রতিটি পয়েন্ট • চিহ্ন দিয়ে শুরু করো
- শুধু সারাংশ দাও, অপ্রয়োজনীয় কথা বলো না`;

interface RequestBody {
  topicId: string;
  topicName?: string;
  chapterName?: string;
  classId?: string;
  subjectId?: string;
  chapterId?: string;
  startPage?: number;
  endPage?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 15,
      windowMs: 60000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন" },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Validate request body
    const validation = await validateRequestBody<RequestBody>(request, {
      topicId: {
        required: true,
        type: "string",
        maxLength: 100,
      },
      topicName: {
        type: "string",
        maxLength: 200,
      },
      chapterName: {
        type: "string",
        maxLength: 200,
      },
      classId: {
        type: "string",
        maxLength: 10,
      },
      subjectId: {
        type: "string",
        maxLength: 50,
      },
      chapterId: {
        type: "string",
        maxLength: 100,
      },
      startPage: {
        type: "number",
      },
      endPage: {
        type: "number",
      },
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { topicId, topicName, chapterName, classId, subjectId, chapterId, startPage, endPage } = validation.data!;

    // Sanitize inputs
    const sanitizedTopicName = topicName ? sanitizeString(topicName) : "টপিক";
    const sanitizedChapterName = chapterName ? sanitizeString(chapterName) : "অধ্যায়";

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!isValidGeminiApiKey(apiKey)) {
      console.error("Invalid or missing Gemini API key");
      return new Response(
        "দুঃখিত, AI সেবা বর্তমানে উপলব্ধ নেই।",
        {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey!);
      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.0-flash",
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,
        },
      });

      // Fetch textbook images if page info is provided
      let imageParts: any[] = [];
      if (classId && subjectId && chapterId && startPage && endPage) {
        try {
          const images = await getTextbookImages(classId, subjectId, chapterId, startPage, endPage);
          const imageUrls = images.map(img => img.url);
          imageParts = await getImagePartsForGemini(imageUrls);
        } catch (imageError) {
          console.error("Error fetching textbook images:", imageError);
          // Continue without images
        }
      }

      const prompt = `${imageParts.length > 0 ? "উপরের পাঠ্যবইয়ের ছবিগুলো বিশ্লেষণ করে" : ""} নিচের পাঠের সারাংশ তৈরি করো:

অধ্যায়: ${sanitizedChapterName}
টপিক: ${sanitizedTopicName}
${startPage && endPage ? `পৃষ্ঠা: ${startPage} - ${endPage}` : ""}

সারাংশ (## দিয়ে শিরোনাম এবং • দিয়ে পয়েন্ট):`;

      // Build content parts (images + text)
      const contentParts = [...imageParts, { text: prompt }];

      // Add 60-second timeout for AI generation with vision
      const result = await withTimeout(
        model.generateContent(contentParts),
        60000,
        "সময় শেষ হয়ে গেছে, আবার চেষ্টা করুন"
      );
      const text = result.response.text();

      // Return streaming response
      return createStreamingResponse(text, {
        chunkDelay: 2,
        onAbort: () => {
          console.log("Client disconnected from summary API");
        },
      });
    } catch (apiError: unknown) {
      console.error("Gemini API failed:", apiError);

      return new Response(
        "দুঃখিত, এই মুহূর্তে সারাংশ তৈরি করতে পারছি না।",
        {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }
  } catch (error) {
    console.error("Summary generation error:", error);

    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
