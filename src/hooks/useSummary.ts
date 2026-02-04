"use client";

import { useState, useCallback } from "react";
import { trackAIToolUsage } from "@/lib/data";

interface Topic {
  id: string;
  name: string;
  pdfStartPage?: number;
  pdfEndPage?: number;
}

interface Chapter {
  id: string;
  name: string;
}

interface UseSummaryResult {
  summary: string;
  isGenerating: boolean;
  error: string | null;
  generateSummary: (topic: Topic, chapter: Chapter, userId?: string) => Promise<void>;
  clearSummary: () => void;
}

export function useSummary(): UseSummaryResult {
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async (topic: Topic, chapter: Chapter, userId?: string) => {
    setIsGenerating(true);
    setError(null);
    setSummary("");

    // Track AI tool usage if userId provided
    if (userId) {
      trackAIToolUsage(userId, "summary-generator");
    }

    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicId: topic.id,
          topicName: topic.name,
          chapterName: chapter.name,
          startPage: topic.pdfStartPage,
          endPage: topic.pdfEndPage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate summary");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        setSummary(accumulatedText);
      }

    } catch (err) {
      console.error("Summary generation error:", err);
      setError(err instanceof Error ? err.message : "সারসংক্ষেপ তৈরিতে সমস্যা হয়েছে");

      // Fallback mock summary if API fails
      const mockSummary = generateMockSummary(topic, chapter);
      setSummary(mockSummary);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearSummary = useCallback(() => {
    setSummary("");
    setError(null);
  }, []);

  return {
    summary,
    isGenerating,
    error,
    generateSummary,
    clearSummary,
  };
}

// Fallback mock summary generator
function generateMockSummary(topic: Topic, chapter: Chapter): string {
  return `## ${chapter.name} - ${topic.name}

• এই পাঠে আমরা ${topic.name} সম্পর্কে শিখব
• সহজ উদাহরণ দিয়ে বুঝতে পারব
• প্রতিদিনের জীবনে এটি কীভাবে কাজে লাগে তা জানব

বাহ! তুমি দারুণ করছ! শেখা চালিয়ে যাও!`;
}
