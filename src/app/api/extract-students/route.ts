import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withTimeout } from "@/lib/apiUtils";
import ERROR_MESSAGES from "@/lib/errorMessages";

const STUDENT_EXTRACTION_PROMPT = `You are an expert at extracting student information from handwritten or printed documents in Bengali/English.

Analyze this image and extract student information. Look for:
- Student names (in Bengali or English)
- Roll numbers (numbers like 01, 02, ১, ২, etc.)
- Guardian/parent phone numbers (11-digit Bangladesh numbers starting with 01)

IMPORTANT RULES:
1. Extract ALL students you can find in the image
2. If you see a list format, extract each entry
3. Roll numbers should be 2-digit format (01, 02, not 1, 2)
4. Convert Bengali numerals (০-৯) to English (0-9)
5. Clean up names - remove extra spaces, punctuation
6. Ignore header rows like "Name", "Roll", "নাম", "রোল", etc.
7. Only include entries that have at least a name

Return ONLY a valid JSON array in this exact format (no markdown, no extra text):
[
  {
    "name": "Student Name",
    "rollNumber": "01",
    "guardianPhone": "01712345678"
  }
]

If guardianPhone is not visible, omit that field. If rollNumber is not visible, assign sequential numbers starting from 01.

RESPOND WITH ONLY THE JSON ARRAY, NOTHING ELSE.`;

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json();

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.length < 20) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.0-flash",
      });

      // Convert base64 image data to the format Gemini expects
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

      // Add 60-second timeout for OCR processing (longer because of image)
      const result = await withTimeout(
        model.generateContent([
          STUDENT_EXTRACTION_PROMPT,
          {
            inlineData: {
              mimeType: imageData.match(/data:(image\/\w+);/)?.[1] || "image/jpeg",
              data: base64Data,
            },
          },
        ]),
        60000, // 60 seconds for OCR processing
        ERROR_MESSAGES.AI.TIMEOUT
      );

      const response = await result.response;
      const text = response.text();

      console.log("Gemini Vision Response:", text);

      // Parse the JSON response
      let students = [];
      try {
        // Remove markdown code blocks if present
        const cleanedText = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        students = JSON.parse(cleanedText);

        // Validate and clean the data
        students = students
          .filter((s: any) => s.name && s.name.trim().length > 0)
          .map((s: any, index: number) => ({
            name: s.name.trim(),
            rollNumber: s.rollNumber || String(index + 1).padStart(2, "0"),
            guardianPhone: s.guardianPhone || undefined,
            guardianName: s.guardianName || undefined,
          }));

      } catch (parseError) {
        console.error("Failed to parse Gemini response:", parseError);
        console.error("Response text:", text);

        return new Response(
          JSON.stringify({
            error: "AI থেকে ডেটা পার্স করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
            rawResponse: text,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      if (students.length === 0) {
        return new Response(
          JSON.stringify({
            error: "ছবি থেকে কোন শিক্ষার্থীর তথ্য পাওয়া যায়নি। স্পষ্ট ছবি তুলুন।",
            students: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ students }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } catch (apiError: any) {
      console.error("Gemini API Error:", apiError);

      return new Response(
        JSON.stringify({
          error: "AI প্রসেসিং এ সমস্যা হয়েছে। আবার চেষ্টা করুন।",
          details: apiError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("Student extraction API error:", error);

    return new Response(
      JSON.stringify({
        error: "সার্ভার এরর। আবার চেষ্টা করুন।",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
