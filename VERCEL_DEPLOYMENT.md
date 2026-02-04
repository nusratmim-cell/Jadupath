# Vercel Deployment Guide

## Prerequisites
- GitHub repository: https://github.com/nusratmim-cell/teacher-saas-demo-ready
- Vercel account: https://vercel.com
- Gemini API Key (2026): Get from https://aistudio.google.com/apikey or https://makersuite.google.com/app/apikey

## Deployment Steps

### 1. Import Project to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository: `nusratmim-cell/teacher-saas-demo-ready`
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 2. Configure Environment Variables

**CRITICAL**: Before deploying, add the following environment variable:

#### Required Variable:
- **Name**: `GEMINI_API_KEY`
- **Value**: Your Gemini API key (get from https://aistudio.google.com/apikey)
- **Environment**: Production, Preview, Development (check all)
- **Note**: As of 2026, use the latest Gemini 3.0 Flash Preview model for best performance

#### How to Add:
1. In Vercel project settings, go to **Settings** → **Environment Variables**
2. Add Variable:
   - Name: `GEMINI_API_KEY`
   - Value: `AIza...` (your actual Gemini API key)
   - Select all environments: Production, Preview, Development
3. Click **Save**

### 3. Deploy

1. Click **Deploy** button
2. Wait for deployment to complete (~2-3 minutes)
3. Your app will be live at: `https://your-project-name.vercel.app`

## Post-Deployment Verification

### Test AI Features:
1. **Student Extraction**: Go to `/students/setup` → Upload handwritten student list photo
2. **AI Portal Guide**: Go to `/ai` → Click "AI পোর্টাল সহায়ক" → Ask questions
3. **Lesson Planner**: Go to `/ai` → Click "AI লেসন প্ল্যানার" → Generate lesson plan
4. **Training AI Chat**: Go to `/training/professionalism` → Select topic → "শিখো সহায়ক" tab

### Expected Behavior:
✅ AI responses should be real and contextual (not mock data)
✅ Handwriting recognition should extract student names accurately
✅ Markdown formatting should display beautifully with headings, lists, code blocks

### Troubleshooting:

#### Problem: Getting mock data instead of AI responses
**Solution**:
1. Check if `GEMINI_API_KEY` is set in Vercel environment variables
2. Redeploy after adding the environment variable
3. Check Vercel logs for API errors

#### Problem: API key error
**Solution**:
1. Verify API key is valid at https://aistudio.google.com/apikey
2. Ensure API key has no extra spaces or quotes
3. API key should start with `AIza...`
4. Check that your API key has access to Gemini 3.0 models (available in 2026)

#### Problem: Handwriting extraction not working
**Solution**:
1. Ensure image is clear and well-lit
2. Check that GEMINI_API_KEY is properly configured
3. Try with a clearer handwritten list

## Environment Variables Reference

```bash
# Required for AI features (2026 Update)
GEMINI_API_KEY=AIzaSy... # Get from https://aistudio.google.com/apikey
# Uses Gemini 3.0 Flash Preview model for enhanced performance

# Optional (already set in code)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME="শিখো টিচার পোর্টাল"
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_OFFLINE_MODE=true
```

## Features Using Gemini API (2026 Update)

All features now use **Gemini 3.0 Flash Preview** for improved performance and accuracy.

1. **Student Handwriting Extraction** (`/api/extract-students`)
   - Extracts student names, roll numbers, phone numbers from photos
   - Supports Bengali and English text
   - Model: gemini-3.0-flash-preview

2. **Portal Guide** (`/api/portal-guide`)
   - Answers questions about portal usage
   - Provides step-by-step instructions
   - Model: gemini-3.0-flash-preview

3. **Lesson Planner** (`/api/generate-lesson-plan`)
   - Creates detailed lesson plans
   - Follows NCTB curriculum
   - Model: gemini-3.0-flash-preview

4. **Q&A Assistant** (`/api/ask`)
   - Answers student questions about topics
   - Provides contextual explanations
   - Model: gemini-3.0-flash-preview

5. **Quiz Generator** (`/api/generate-quiz`)
   - Creates topic-based quizzes
   - Generates explanations for answers
   - Model: gemini-3.0-flash-preview

6. **Summary Generator** (`/api/generate-summary`)
   - Generates topic summaries
   - Student-friendly explanations
   - Model: gemini-3.0-flash-preview

## Fallback Behavior

All AI features have built-in fallback to mock data if:
- GEMINI_API_KEY is not configured
- API quota is exceeded
- Network errors occur

This ensures the app works in development and demo scenarios.

## Support

For issues or questions:
- GitHub Issues: https://github.com/nusratmim-cell/teacher-saas-demo-ready/issues
- Check logs in Vercel dashboard: Settings → Logs

## Cost Considerations (2026 Update)

Gemini API pricing and free tier (subject to change):
- **Free Tier**: Available with generous limits for development and small-scale use
- **Gemini 3.0 Flash Preview**: Optimized for speed and cost-efficiency
- Check current pricing and quotas at: https://ai.google.dev/pricing
- Monitor your usage at: https://aistudio.google.com/apikey

**Note**: Gemini 3.0 models offer improved performance with better cost-efficiency compared to previous versions.

---

**Last Updated**: 2026-01-29
**Version**: 1.0.0
