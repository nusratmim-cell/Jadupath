import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  checkRateLimit,
  getClientIdentifier,
  isValidGeminiApiKey,
  validateRequestBody,
  sanitizeString,
  extractJSONFromAIResponse,
  withTimeout,
} from "@/lib/apiUtils";
import ERROR_MESSAGES from "@/lib/errorMessages";
import { getTextbookImages, getImagePartsForGemini, getTrainingImagePartsForGemini } from "@/lib/textbookImageHelper";

// System prompt for generating quiz questions based on textbook content
const QUIZ_SYSTEM_PROMPT = `তুমি একজন শিক্ষক সহায়ক যিনি পাঠ্যবইয়ের বিষয়বস্তু থেকে MCQ প্রশ্ন তৈরি করেন। বাংলাদেশের প্রাথমিক বিদ্যালয়ের শিক্ষার্থীদের জন্য প্রশ্ন তৈরি করো।

CRITICAL LANGUAGE INSTRUCTION:
- You MUST write ONLY in Bengali language (বাংলা ভাষা)
- DO NOT use Hindi or Devanagari script (हिंदी लिपि नहीं)
- Use Bengali script exclusively (শুধু বাংলা লিপি)

নিয়ম:
- পাঠ্যবইয়ের ছবিতে যা দেখছো তার উপর ভিত্তি করে প্রশ্ন তৈরি করো
- শিশুদের জন্য সহজ ও বোধগম্য ভাষা ব্যবহার করো
- প্রতিটি প্রশ্নে ৪টি অপশন থাকবে
- সঠিক উত্তরের ইনডেক্স দাও (০-৩)
- সংক্ষিপ্ত কিন্তু শিক্ষণীয় ব্যাখ্যা দাও
- প্রশ্নগুলো পাঠ্যবইয়ের বিষয়বস্তুর সাথে সরাসরি সম্পর্কিত হতে হবে
- বাস্তব উদাহরণ ও ছবিতে দেখানো বিষয় থেকে প্রশ্ন করো

JSON ফরম্যাটে উত্তর দাও:
[
  {"question": "প্রশ্ন?", "options": ["অপশন ১", "অপশন ২", "অপশন ৩", "অপশন ৪"], "correctAnswer": 0, "explanation": "ব্যাখ্যা"}
]`;

// System prompt for training module quiz - more detailed for teacher training
const TRAINING_QUIZ_SYSTEM_PROMPT = `তুমি একজন শিক্ষক প্রশিক্ষণ মূল্যায়নকারী। শিক্ষক সহায়িকার বিষয়বস্তু থেকে MCQ প্রশ্ন তৈরি করো যা শিক্ষকদের বোঝাপড়া যাচাই করবে।

CRITICAL LANGUAGE INSTRUCTION:
- You MUST write ONLY in Bengali language (বাংলা ভাষা)
- DO NOT use Hindi or Devanagari script (हिंदी लिपि नहीं)
- Use Bengali script exclusively (শুধু বাংলা লিপি)

নিয়ম:
- ছবিতে দেখানো শিক্ষক সহায়িকার বিষয়বস্তু মনোযোগ দিয়ে পড়ো
- সেই বিষয়বস্তুর মূল ধারণা, পদ্ধতি, ও শিক্ষণীয় বিষয় থেকে প্রশ্ন করো
- শিক্ষকদের পেশাগত দক্ষতা যাচাই করার মতো প্রশ্ন তৈরি করো
- প্রতিটি প্রশ্নে ৪টি অপশন থাকবে
- সঠিক উত্তরের ইনডেক্স দাও (০-৩)
- ব্যাখ্যায় কেন এই উত্তর সঠিক তা স্পষ্ট করো
- প্রশ্নগুলো ছবিতে দেখানো নির্দিষ্ট বিষয়বস্তু থেকেই হতে হবে

JSON ফরম্যাটে উত্তর দাও:
[
  {"question": "প্রশ্ন?", "options": ["অপশন ১", "অপশন ২", "অপশন ৩", "অপশন ৪"], "correctAnswer": 0, "explanation": "ব্যাখ্যা"}
]`;

interface RequestBody {
  topicId: string;
  topicName?: string;
  chapterName?: string;
  classId?: string;
  subjectId?: string;
  chapterId?: string;
  startPage?: number;
  endPage?: number;
  questionCount?: number; // Number of questions to generate (3-10)
  difficulty?: "easy" | "medium" | "hard"; // Optional difficulty level
  trainingImages?: string[]; // Training module images (local paths)
  isTrainingQuiz?: boolean; // Whether this is for training module
  courseName?: string; // Training course name
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
      questionCount: {
        type: "number",
      },
      difficulty: {
        type: "string",
      },
      trainingImages: {
        type: "array",
      },
      isTrainingQuiz: {
        type: "boolean",
      },
      courseName: {
        type: "string",
        maxLength: 200,
      },
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { topicId, topicName, chapterName, classId, subjectId, chapterId, startPage, endPage, questionCount, difficulty, trainingImages, isTrainingQuiz, courseName } = validation.data!;

    // Validate and set question count (default to 5, must be between 3-10)
    const numQuestions = questionCount && questionCount >= 3 && questionCount <= 10 ? questionCount : 5;

    // Sanitize inputs
    const sanitizedTopicName = topicName ? sanitizeString(topicName) : "টপিক";
    const sanitizedChapterName = chapterName ? sanitizeString(chapterName) : "পাঠ";
    const sanitizedCourseName = courseName ? sanitizeString(courseName) : "প্রশিক্ষণ";
    const difficultyText = difficulty === "easy" ? "সহজ" : difficulty === "hard" ? "কঠিন" : "মাঝারি";

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

      // Use different system prompt for training vs regular quiz
      const systemPrompt = isTrainingQuiz ? TRAINING_QUIZ_SYSTEM_PROMPT : QUIZ_SYSTEM_PROMPT;

      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.0-flash",
        systemInstruction: systemPrompt,
      });

      // Fetch images - training images (local) or textbook images (remote)
      let imageParts: any[] = [];

      if (isTrainingQuiz && trainingImages && trainingImages.length > 0) {
        // Training module - fetch local images
        try {
          console.log(`Fetching ${trainingImages.length} training images for quiz generation`);
          imageParts = await getTrainingImagePartsForGemini(trainingImages);
          console.log(`Successfully loaded ${imageParts.length} training images`);
        } catch (imageError) {
          console.error("Error fetching training images:", imageError);
          // Continue without images - will use topic name only
        }
      } else if (classId && subjectId && chapterId && startPage && endPage) {
        // Regular textbook quiz - fetch remote images
        try {
          const images = await getTextbookImages(classId, subjectId, chapterId, startPage, endPage);
          const imageUrls = images.map(img => img.url);
          imageParts = await getImagePartsForGemini(imageUrls);
        } catch (imageError) {
          console.error("Error fetching textbook images:", imageError);
          // Continue without images
        }
      }

      // Build prompt based on quiz type
      let prompt: string;

      if (isTrainingQuiz) {
        prompt = `মডিউল: ${sanitizedCourseName}
অধ্যায়: ${sanitizedChapterName}
টপিক: ${sanitizedTopicName}

${imageParts.length > 0 ? `উপরের শিক্ষক সহায়িকার ${imageParts.length}টি পৃষ্ঠার বিষয়বস্তু মনোযোগ দিয়ে পড়ো এবং সেই বিষয়বস্তু থেকে` : "এই টপিকের উপর ভিত্তি করে"} ${numQuestions}টি MCQ প্রশ্ন তৈরি করো যা:
- শিক্ষকদের এই বিষয়ে বোঝাপড়া যাচাই করবে
- ছবিতে দেখানো নির্দিষ্ট তথ্য ও ধারণা থেকে প্রশ্ন করো
- শিক্ষণ পদ্ধতি, শ্রেণি ব্যবস্থাপনা, বা বিষয়ভিত্তিক জ্ঞান যাচাই করবে
- প্রতিটি প্রশ্ন ছবির বিষয়বস্তুর সাথে সরাসরি সম্পর্কিত হতে হবে

শুধু JSON অ্যারে দাও, অন্য কিছু না:`;
      } else {
        prompt = `টপিক: ${sanitizedTopicName}
অধ্যায়: ${sanitizedChapterName}
${startPage && endPage ? `পৃষ্ঠা: ${startPage} - ${endPage}` : ""}
অসুবিধার স্তর: ${difficultyText}

${imageParts.length > 0 ? "উপরের পাঠ্যবইয়ের ছবিগুলো দেখে" : "এই টপিকের উপর ভিত্তি করে"} ${numQuestions}টি MCQ প্রশ্ন তৈরি করো যা:
- শিক্ষার্থীদের বোঝাপড়া যাচাই করবে
- পাঠ্যবইয়ের বিষয়বস্তুর সাথে সরাসরি সম্পর্কিত
- বয়স-উপযোগী এবং মজাদার
- ${difficultyText} স্তরের হবে

শুধু JSON অ্যারে দাও, অন্য কিছু না:`;
      }

      // Build content parts (images + text)
      const contentParts = [...imageParts, { text: prompt }];

      // Add 60-second timeout for AI generation with vision
      const result = await withTimeout(
        model.generateContent(contentParts),
        60000,
        ERROR_MESSAGES.AI.TIMEOUT
      );
      const responseText = result.response.text();

      // Extract JSON from response using robust extraction
      type QuizQuestion = {
        question: string;
        options: string[];
        correctAnswer: number;
        explanation: string;
      };

      const parseResult = extractJSONFromAIResponse<QuizQuestion[]>(responseText);

      if (!parseResult.success || !parseResult.data || !Array.isArray(parseResult.data)) {
        console.error("Failed to parse quiz JSON:", parseResult.error);
        return NextResponse.json(
          { error: "কুইজ ফরম্যাট সমস্যা হয়েছে" },
          { status: 500 }
        );
      }

      const questions = parseResult.data.slice(0, numQuestions);

      // Add unique IDs to questions
      const questionsWithIds = questions.map((q, index) => ({
        id: `q${index + 1}`,
        ...q,
      }));

      return NextResponse.json({
        success: true,
        topicId,
        topicName: sanitizedTopicName,
        chapterName: sanitizedChapterName,
        questionCount: numQuestions,
        difficulty,
        questions: questionsWithIds,
      });

    } catch (apiError) {
      console.error("Gemini API failed for quiz generation:", apiError);

      return NextResponse.json(
        { error: "কুইজ তৈরি করতে ব্যর্থ হয়েছে" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Quiz generation error:", error);

    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
