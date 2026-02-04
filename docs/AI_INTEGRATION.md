# Shikho AI Integration Guide

This document explains how to integrate real AI capabilities into the Teacher Portal.

## Current State (Mock Implementation)

The AI features currently use mock/simulated responses. To enable real AI:

1. Get API keys from Anthropic (Claude) or OpenAI
2. Create API routes
3. Replace mock functions with API calls

---

## AI Features Location

**File:** `src/app/teach/[classId]/[subjectId]/[chapterId]/[topicId]/page.tsx`

| Feature | Function | Line |
|---------|----------|------|
| Quiz Generation | `generateQuiz()` | ~150-198 |
| Summary Generation | `generateSummary()` | ~222-253 |
| Ask Anything | `handleAsk()` | ~255-276 |

---

## Integration Steps

### Step 1: Add API Key

Create `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
# OR
OPENAI_API_KEY=sk-xxxxx
```

### Step 2: Create API Route

Create `src/app/api/ai/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const { action, content, topic } = await request.json();

  try {
    let prompt = "";

    switch (action) {
      case "quiz":
        prompt = `You are a teacher assistant. Create 5 multiple choice questions in Bengali about "${topic}".

Content to base questions on:
${content}

Return JSON format:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question in Bengali",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0,
      "explanation": "Explanation in Bengali"
    }
  ]
}`;
        break;

      case "summary":
        prompt = `Summarize the following educational content in Bengali.
Use bullet points and headers. Keep it concise but comprehensive.

Topic: ${topic}
Content: ${content}`;
        break;

      case "ask":
        prompt = `You are a helpful teaching assistant. Answer the following question about "${topic}" in Bengali.
Be educational and provide examples.

Question: ${content}`;
        break;
    }

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const response = message.content[0].type === "text"
      ? message.content[0].text
      : "";

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { success: false, error: "AI request failed" },
      { status: 500 }
    );
  }
}
```

### Step 3: Install SDK

```bash
npm install @anthropic-ai/sdk
# OR
npm install openai
```

### Step 4: Update Frontend Functions

Replace mock functions in the topic page:

```typescript
// Replace generateQuiz function
const generateQuiz = async () => {
  setIsGeneratingQuiz(true);
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "quiz",
        topic: topic?.name,
        content: topic?.nctbBook?.content || topic?.description,
      }),
    });

    const result = await response.json();
    if (result.success) {
      const parsed = JSON.parse(result.data);
      setQuizQuestions(parsed.questions);
    }
  } catch (error) {
    console.error("Quiz generation failed:", error);
  }
  setIsGeneratingQuiz(false);
};

// Replace generateSummary function
const generateSummary = async () => {
  setIsGeneratingSummary(true);
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "summary",
        topic: topic?.name,
        content: topic?.nctbBook?.content || topic?.description,
      }),
    });

    const result = await response.json();
    if (result.success) {
      setSummary(result.data);
    }
  } catch (error) {
    console.error("Summary generation failed:", error);
  }
  setIsGeneratingSummary(false);
};

// Replace handleAsk function
const handleAsk = async () => {
  if (!askQuestion.trim()) return;

  setIsAsking(true);
  setChatHistory(prev => [...prev, { role: "user", content: askQuestion }]);

  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ask",
        topic: topic?.name,
        content: askQuestion,
      }),
    });

    const result = await response.json();
    if (result.success) {
      setChatHistory(prev => [...prev, { role: "assistant", content: result.data }]);
    }
  } catch (error) {
    console.error("Ask failed:", error);
  }

  setAskQuestion("");
  setIsAsking(false);
};
```

---

## AI Model Options

### Anthropic Claude (Recommended)

| Model | Speed | Cost | Best For |
|-------|-------|------|----------|
| claude-3-haiku | Fast | Low | Quick responses, simple queries |
| claude-3-sonnet | Medium | Medium | Balanced quality/speed |
| claude-3-opus | Slow | High | Complex analysis |

### OpenAI

| Model | Speed | Cost | Best For |
|-------|-------|------|----------|
| gpt-4o-mini | Fast | Low | Quick responses |
| gpt-4o | Medium | Medium | Quality responses |
| gpt-4 | Slow | High | Complex tasks |

---

## Bengali Language Support

Both Claude and GPT support Bengali well. Tips:

1. Always specify language in prompt: "Respond in Bengali (বাংলা)"
2. For quiz options, ensure Bengali numerals: ক, খ, গ, ঘ
3. Test with actual Bengali content

---

## Error Handling

Add proper error handling:

```typescript
const generateQuiz = async () => {
  setIsGeneratingQuiz(true);
  setError(null);

  try {
    const response = await fetch("/api/ai", { ... });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Unknown error");
    }

    // Process result...
  } catch (error) {
    setError("AI সার্ভিসে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।");
    console.error("Quiz generation failed:", error);
  } finally {
    setIsGeneratingQuiz(false);
  }
};
```

---

## Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// src/app/api/ai/route.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per minute
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  // ... rest of handler
}
```

---

## Cost Estimation

| Feature | Tokens/Call | Calls/Day | Monthly Cost |
|---------|-------------|-----------|--------------|
| Quiz (5 questions) | ~500 | 100 | ~$3 |
| Summary | ~300 | 200 | ~$4 |
| Ask | ~200 | 500 | ~$6 |
| **Total** | | | **~$13/month** |

*Based on Claude Haiku pricing ($0.25/1M input, $1.25/1M output)*

---

## Testing

Test AI features with:

```bash
# Test API route
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"action":"quiz","topic":"গণিত","content":"সংখ্যা পদ্ধতি"}'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API key not working | Check `.env.local` is not committed, restart dev server |
| Bengali not rendering | Ensure UTF-8 encoding, check font support |
| Slow responses | Use faster model (Haiku), add loading states |
| Rate limited | Implement caching, reduce unnecessary calls |

---

## Future Enhancements

1. **Caching** - Cache common queries to reduce API calls
2. **Streaming** - Stream responses for better UX
3. **Context** - Maintain conversation context for Ask mode
4. **PDF Analysis** - Extract text from NCTB PDFs for better context
5. **Voice** - Text-to-speech for generated content
