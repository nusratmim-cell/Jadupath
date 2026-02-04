import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  checkRateLimit,
  getClientIdentifier,
  isValidGeminiApiKey,
  validateRequestBody,
  extractJSONFromAIResponse,
  withTimeout,
} from "@/lib/apiUtils";
import ERROR_MESSAGES from "@/lib/errorMessages";

// System prompt for OCR answer sheet scanning
const OCR_SYSTEM_PROMPT = `তুমি একজন AI সহায়ক যিনি শিক্ষকদের জন্য উত্তরপত্র স্ক্যান করে নম্বর দেন।

তোমার কাজ:
1. ছবিতে দেখানো উত্তরপত্র বিশ্লেষণ করো
2. প্রতিটি শিক্ষার্থীর রোল নম্বর চিহ্নিত করো
3. প্রতিটি শিক্ষার্থীর প্রতিটি প্রশ্নের উত্তর (A, B, C, বা D) চিহ্নিত করো
4. উত্তরগুলো সংখ্যায় রূপান্তর করো (A=0, B=1, C=2, D=3)

CRITICAL LANGUAGE INSTRUCTION:
- You MUST read ONLY Bengali script (বাংলা লিপি)
- DO NOT confuse with Hindi or Devanagari script (हिंदी लिपि नहीं)

নির্দেশনা:
- উত্তরপত্র ফরম্যাট: প্রতিটি ছাত্রের জন্য আলাদা সারি থাকতে পারে বা টেবিল থাকতে পারে
- রোল নম্বর ১-৫০ এর মধ্যে হতে পারে
- উত্তর A, B, C, বা D হতে পারে (অথবা বাংলায়: ক, খ, গ, ঘ)
- যদি কোনো উত্তর অস্পষ্ট থাকে, তাহলে -1 দাও
- শুধুমাত্র JSON ফরম্যাটে উত্তর দাও

JSON ফরম্যাট:
{
  "students": [
    {
      "rollNumber": "১",
      "answers": [0, 1, 2, 0, 3]  // প্রতিটি প্রশ্নের উত্তর (০-৩), অস্পষ্ট হলে -1
    }
  ]
}`;

interface RequestBody {
  imageData: string; // Base64 encoded image
  questions: Array<{
    id: string;
    question: string;
    correctAnswer: number;
  }>;
  students: Array<{
    id: string;
    name: string;
    rollNumber: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 5, // Lower limit for OCR (more intensive)
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
      imageData: {
        required: true,
        type: "string",
      },
      questions: {
        required: true,
        type: "object",
      },
      students: {
        required: true,
        type: "object",
      },
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { imageData, questions, students } = validation.data!;

    // Validate image data
    if (!imageData.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "অবৈধ ছবি ফরম্যাট" },
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
        systemInstruction: OCR_SYSTEM_PROMPT,
      });

      // Convert base64 image to Gemini format
      const base64Data = imageData.split(",")[1];
      const mimeType = imageData.split(";")[0].split(":")[1];

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      };

      // Build prompt with question details
      const questionList = questions
        .map((q, idx) => `প্রশ্ন ${idx + 1}: সঠিক উত্তর = ${q.correctAnswer} (${["A", "B", "C", "D"][q.correctAnswer]})`)
        .join("\n");

      const studentList = students
        .map((s) => `রোল ${s.rollNumber}: ${s.name}`)
        .join("\n");

      const prompt = `উত্তরপত্র স্ক্যান করো এবং প্রতিটি শিক্ষার্থীর উত্তর বের করো।

প্রশ্ন তালিকা (মোট ${questions.length}টি প্রশ্ন):
${questionList}

শিক্ষার্থী তালিকা (${students.length} জন):
${studentList}

ছবিতে দেখানো উত্তরপত্র থেকে:
1. প্রতিটি শিক্ষার্থীর রোল নম্বর চিহ্নিত করো
2. প্রতিটি প্রশ্নের জন্য তাদের উত্তর (A/B/C/D বা ক/খ/গ/ঘ) চিহ্নিত করো
3. উত্তরগুলো সংখ্যায় রূপান্তর করো (A=0, B=1, C=2, D=3)
4. শুধু JSON দাও, অন্য কিছু না

উদাহরণ আউটপুট:
{
  "students": [
    {"rollNumber": "১", "answers": [0, 1, 2, 0, 3]},
    {"rollNumber": "২", "answers": [0, 0, 2, 1, 3]}
  ]
}`;

      // Add 60-second timeout for OCR processing
      const result = await withTimeout(
        model.generateContent([imagePart, { text: prompt }]),
        60000,
        ERROR_MESSAGES.AI.TIMEOUT
      );
      const responseText = result.response.text();

      // Extract JSON from response
      type OCRResponse = {
        students: Array<{
          rollNumber: string;
          answers: number[];
        }>;
      };

      const parseResult = extractJSONFromAIResponse<OCRResponse>(responseText);

      if (!parseResult.success || !parseResult.data || !parseResult.data.students) {
        console.error("Failed to parse OCR JSON:", parseResult.error);
        return NextResponse.json(
          { error: "OCR প্রক্রিয়া ব্যর্থ হয়েছে। অনুগ্রহ করে ছবি আরও স্পষ্ট করে আবার চেষ্টা করুন।" },
          { status: 500 }
        );
      }

      const ocrData = parseResult.data;

      // Match OCR results with student database and calculate scores
      const studentAnswers: {
        [studentId: string]: {
          answers: number[];
          score: number;
          totalQuestions: number;
        };
      } = {};

      for (const ocrStudent of ocrData.students) {
        // Find matching student by roll number
        const student = students.find(
          (s) => s.rollNumber === ocrStudent.rollNumber || s.rollNumber === ocrStudent.rollNumber.replace(/[০-৯]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 2534 + 48))
        );

        if (student) {
          // Calculate score
          let score = 0;
          const answers = ocrStudent.answers;

          for (let i = 0; i < Math.min(answers.length, questions.length); i++) {
            if (answers[i] === questions[i].correctAnswer) {
              score++;
            }
          }

          studentAnswers[student.id] = {
            answers: answers,
            score: score,
            totalQuestions: questions.length,
          };
        }
      }

      return NextResponse.json({
        success: true,
        results: {
          studentAnswers: studentAnswers,
          totalStudentsProcessed: Object.keys(studentAnswers).length,
          totalStudentsInClass: students.length,
        },
      });

    } catch (apiError) {
      console.error("Gemini API failed for OCR:", apiError);

      return NextResponse.json(
        { error: "OCR প্রক্রিয়া ব্যর্থ হয়েছে" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("OCR processing error:", error);

    return NextResponse.json(
      { error: "Failed to process answer sheet" },
      { status: 500 }
    );
  }
}
