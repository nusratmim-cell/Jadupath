import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withTimeout, checkRateLimit, getClientIdentifier } from "@/lib/apiUtils";
import ERROR_MESSAGES from "@/lib/errorMessages";
import {
  ExtractedMark,
  mergeDuplicateRollNumbers,
  convertBengaliToEnglish,
} from "@/lib/khataOCRHelpers";

const KHATA_EXTRACTION_PROMPT = `আপনি একজন বিশেষজ্ঞ OCR সিস্টেম যা বাংলাদেশের স্কুলের হাতে লেখা নম্বর খাতা (marks register) থেকে তথ্য উত্তোলন করে।

CRITICAL INSTRUCTIONS:
1. Extract ONLY: Roll Number, Student Name, and Total Marks (out of 100)
2. Roll numbers can be in Bengali (০১, ০২) or English (01, 02) - convert all to English format "01", "02"
3. Student names are in Bengali - preserve exact spelling
4. Total marks are out of 100
5. Ignore column headers like "নাম", "রোল", "নম্বর", "Name", "Roll", "Marks", "মোট"
6. If handwriting is unclear, mark confidence as "low"
7. Skip rows that are completely illegible or crossed out
8. Extract ALL students visible in the image

VALIDATION RULES:
- Roll numbers must be 2-digit format (01-99)
- Student names must have at least 2 characters
- Total marks must be 0-100
- Convert Bengali numerals (০১২৩৪৫৬৭৮৯) to English (0123456789)

CONFIDENCE LEVELS:
- "high": Clear handwriting, all data easily readable
- "medium": Readable but some uncertainty
- "low": Poor handwriting or image quality, uncertain extraction

Return ONLY valid JSON array in this exact format (no markdown, no extra text):
[
  {
    "rollNumber": "01",
    "name": "Student Name in Bengali",
    "totalMarks": 85,
    "confidence": "high"
  },
  {
    "rollNumber": "02",
    "name": "Another Student Name",
    "totalMarks": 92,
    "confidence": "medium"
  }
]

RESPOND WITH ONLY THE JSON ARRAY, NOTHING ELSE.`;

interface RequestBody {
  images: string[];
  classId: string;
  subjectId: string;
  term: 1 | 2 | 3;
  year: number;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting - 10 requests per minute
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 10,
      windowMs: 60000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "অনেক বেশি অনুরোধ। ১ মিনিট পরে চেষ্টা করুন।",
          resetTime: rateLimit.resetTime,
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate request body
    let body: RequestBody;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { images, classId, subjectId, term, year } = body;

    // Validate required fields
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "কমপক্ষে একটি ছবি আপলোড করুন" },
        { status: 400 }
      );
    }

    if (images.length > 5) {
      return NextResponse.json(
        { error: "সর্বোচ্চ ৫টি ছবি আপলোড করতে পারবেন" },
        { status: 400 }
      );
    }

    if (!classId || !subjectId || !term || !year) {
      return NextResponse.json(
        { error: "ক্লাস, বিষয়, সাময়িক এবং বছর নির্বাচন করুন" },
        { status: 400 }
      );
    }

    // 3. Check API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.length < 20) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // 4. Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.0-flash",
    });

    // 5. Process each image sequentially
    const allExtracted: ExtractedMark[] = [];
    const processingErrors: string[] = [];

    for (let i = 0; i < images.length; i++) {
      try {
        // Clean base64 data
        const base64Data = images[i].replace(/^data:image\/\w+;base64,/, "");

        // Determine mime type
        const mimeTypeMatch = images[i].match(/data:(image\/\w+);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";

        // Call Gemini Vision API with timeout
        const result = await withTimeout(
          model.generateContent([
            KHATA_EXTRACTION_PROMPT,
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ]),
          60000, // 60 seconds timeout per image
          ERROR_MESSAGES.AI.TIMEOUT
        );

        const response = await result.response;
        const text = response.text();

        console.log(`Gemini response for image ${i + 1}:`, text);

        // Parse JSON response
        try {
          // Remove markdown code blocks if present
          const cleanedText = text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

          const parsed = JSON.parse(cleanedText);

          // Validate that it's an array
          if (!Array.isArray(parsed)) {
            throw new Error("Response is not an array");
          }

          // Validate and clean each entry
          const validEntries = parsed
            .filter((entry: any) => {
              // Must have name and rollNumber
              return (
                entry.name &&
                entry.name.trim().length > 0 &&
                entry.rollNumber
              );
            })
            .map((entry: any) => ({
              rollNumber: String(entry.rollNumber),
              name: entry.name.trim(),
              totalMarks: parseFloat(entry.totalMarks) || 0,
              confidence: entry.confidence || "medium",
            }));

          allExtracted.push(...validEntries);

          if (validEntries.length === 0) {
            processingErrors.push(
              `ছবি ${i + 1}: কোন বৈধ তথ্য পাওয়া যায়নি`
            );
          }
        } catch (parseError) {
          console.error(`Failed to parse response for image ${i + 1}:`, parseError);
          processingErrors.push(
            `ছবি ${i + 1}: AI থেকে ডেটা পার্স করতে সমস্যা হয়েছে`
          );
        }
      } catch (apiError: any) {
        console.error(`Error processing image ${i + 1}:`, apiError);
        processingErrors.push(
          `ছবি ${i + 1}: ${apiError.message || "প্রসেসিং এ সমস্যা হয়েছে"}`
        );
      }
    }

    // 6. Check if any data was extracted
    if (allExtracted.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ছবি থেকে কোন তথ্য পাওয়া যায়নি। স্পষ্ট ছবি তুলুন।",
          extractedMarks: [],
          warnings: processingErrors,
        },
        { status: 200 }
      );
    }

    // 7. Merge duplicate roll numbers from multiple images
    const { merged, warnings } = mergeDuplicateRollNumbers(allExtracted);

    // 8. Return successful response
    return NextResponse.json(
      {
        success: true,
        extractedMarks: merged,
        warnings: [...warnings, ...processingErrors],
        totalImagesProcessed: images.length,
        totalStudentsExtracted: merged.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Khata extraction API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "সার্ভার এরর। আবার চেষ্টা করুন।",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
