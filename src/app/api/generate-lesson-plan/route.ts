import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  checkRateLimit,
  getClientIdentifier,
  isValidGeminiApiKey,
  validateRequestBody,
  sanitizeString,
  safeJsonParse,
  withTimeout,
} from "@/lib/apiUtils";

const LESSON_PLAN_SYSTEM_PROMPT = `তুমি একজন অভিজ্ঞ শিক্ষা পরিকল্পনাকারী। বাংলাদেশের প্রাথমিক বিদ্যালয়ের শিক্ষকদের জন্য কার্যকর পাঠ পরিকল্পনা তৈরি করো।

STRICT LANGUAGE REQUIREMENT:
- MUST write ONLY in Bengali (বাংলা ভাষায় লিখতে হবে)
- NO Hindi or Devanagari script allowed (हिंदी नहीं)
- Use only Bengali script (শুধু বাংলা লিপি)

নিয়ম:
- বাংলায় উত্তর দাও
- NCTB পাঠ্যক্রম অনুযায়ী পরিকল্পনা করো
- বাস্তবসম্মত ও প্রয়োগযোগ্য পরিকল্পনা তৈরি করো
- শিক্ষার্থী-কেন্দ্রিক কার্যক্রম অন্তর্ভুক্ত করো
- সময় ব্যবস্থাপনা সুষ্ঠুভাবে করো

JSON ফরম্যাট এ উত্তর দাও:
{
  "title": "পাঠের শিরোনাম",
  "classId": "ক্লাস আইডি",
  "topic": "টপিকের নাম",
  "duration": "সময়কাল",
  "objectives": ["শিখনফল ১", "শিখনফল ২", "শিখনফল ৩"],
  "materials": ["উপকরণ ১", "উপকরণ ২", "উপকরণ ৩"],
  "activities": {
    "warmUp": {
      "activity": "ওয়ার্ম আপ কার্যক্রম",
      "duration": "৫ মিনিট"
    },
    "mainLesson": {
      "steps": ["ধাপ ১", "ধাপ ২", "ধাপ ৩", "ধাপ ৪"],
      "duration": "মিনিট"
    },
    "practice": {
      "activity": "অনুশীলন কার্যক্রম",
      "duration": "মিনিট"
    },
    "closing": {
      "activity": "সমাপনী কার্যক্রম",
      "duration": "৫ মিনিট"
    }
  },
  "assessment": "মূল্যায়ন পদ্ধতি",
  "homework": "বাড়ির কাজ",
  "generatedAt": "তারিখ"
}`;

interface RequestBody {
  className: string;
  chapterName?: string;
  topicName: string;
  duration: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 10,
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
      className: {
        required: true,
        type: "string",
        maxLength: 100,
      },
      chapterName: {
        type: "string",
        maxLength: 200,
      },
      topicName: {
        required: true,
        type: "string",
        maxLength: 200,
      },
      duration: {
        required: true,
        type: "string",
        pattern: /^\d+$/,
      },
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { className, chapterName, topicName, duration } = validation.data!;

    // Sanitize inputs
    const sanitizedClassName = sanitizeString(className);
    const sanitizedChapterName = chapterName ? sanitizeString(chapterName) : "গণিত";
    const sanitizedTopicName = sanitizeString(topicName);

    // Validate duration is a number
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum < 10 || durationNum > 120) {
      return NextResponse.json(
        { error: "সময়কাল ১০-১২০ মিনিটের মধ্যে হতে হবে" },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!isValidGeminiApiKey(apiKey)) {
      console.error("Invalid or missing Gemini API key");
      return NextResponse.json(
        { error: "AI সেবা বর্তমানে উপলব্ধ নেই" },
        { status: 503 }
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey!);
      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.0-flash",
        systemInstruction: LESSON_PLAN_SYSTEM_PROMPT,
      });

      const prompt = `ক্লাস: ${sanitizedClassName}
অধ্যায়: ${sanitizedChapterName}
টপিক: ${sanitizedTopicName}
ক্লাসের সময়কাল: ${durationNum} মিনিট

এই তথ্যের ভিত্তিতে একটি সম্পূর্ণ পাঠ পরিকল্পনা তৈরি করো। শুধু JSON অবজেক্ট দাও, অন্য কিছু না:`;

      const result = await withTimeout(model.generateContent(prompt), 45000, "সময় শেষ হয়ে গেছে, আবার চেষ্টা করুন");
      const responseText = result.response.text();

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error("No JSON found in Gemini response");
        return NextResponse.json(
          { error: "পাঠ পরিকল্পনা তৈরি করতে সমস্যা হয়েছে" },
          { status: 500 }
        );
      }

      const parseResult = safeJsonParse(jsonMatch[0]);

      if (!parseResult.success || !parseResult.data) {
        console.error("Failed to parse lesson plan JSON:", parseResult.error);
        return NextResponse.json(
          { error: "পাঠ পরিকল্পনা ফরম্যাট সমস্যা হয়েছে" },
          { status: 500 }
        );
      }

      const plan = parseResult.data;

      return NextResponse.json({
        success: true,
        plan: {
          ...plan,
          classId: sanitizedClassName.replace("class-", ""),
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (apiError) {
      console.error("Gemini API failed:", apiError);

      return NextResponse.json(
        { error: "পাঠ পরিকল্পনা তৈরি করতে ব্যর্থ হয়েছে" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Lesson plan generation error:", error);

    return NextResponse.json(
      { error: "Failed to generate lesson plan" },
      { status: 500 }
    );
  }
}
