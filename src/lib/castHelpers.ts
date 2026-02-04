import { QuizQuestion } from "./data";
import { toBengaliNumber } from "./data";

interface Slide {
  id: string;
  title: string;
  content: string;
  visual?: string;
  narration?: string;
}

/**
 * Generate HTML for casting a quiz question to TV
 */
export function generateQuizHTML(question: QuizQuestion, questionNumber: number): string {
  const bengaliNumber = toBengaliNumber(questionNumber);
  const bengaliOptions = ["ক", "খ", "গ", "ঘ"];

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>প্রশ্ন ${bengaliNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Noto Sans Bengali', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 3rem;
    }
    .question-number {
      font-size: 2.5rem;
      font-weight: bold;
      opacity: 0.9;
      margin-bottom: 1rem;
    }
    .question {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 2rem;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .question-text {
      font-size: 3rem;
      font-weight: bold;
      text-align: center;
      margin-bottom: 3rem;
      line-height: 1.5;
    }
    .options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
    }
    .option {
      background: rgba(255, 255, 255, 0.2);
      border: 3px solid rgba(255, 255, 255, 0.4);
      border-radius: 1.5rem;
      padding: 2rem;
      font-size: 2rem;
      font-weight: 600;
      transition: all 0.3s;
      text-align: center;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .option-label {
      display: inline-block;
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
      font-size: 1.8rem;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="question-number">প্রশ্ন ${bengaliNumber}</div>
    </div>
    <div class="question">
      <div class="question-text">${question.question}</div>
      <div class="options">
        ${question.options.map((option, index) => `
          <div class="option">
            <span class="option-label">${bengaliOptions[index]}</span>
            <span>${option}</span>
          </div>
        `).join("")}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML for casting a presentation slide to TV
 */
export function generateSlideHTML(slide: Slide, slideNumber: number, totalSlides: number): string {
  const bengaliSlideNum = toBengaliNumber(slideNumber);
  const bengaliTotal = toBengaliNumber(totalSlides);

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${slide.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Noto Sans Bengali', Arial, sans-serif;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding: 2rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      opacity: 0.8;
    }
    .slide-number {
      font-size: 1.5rem;
    }
    .container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
    }
    .slide {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 2rem;
      padding: 4rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
    }
    .slide-title {
      font-size: 4rem;
      font-weight: bold;
      text-align: center;
      margin-bottom: 3rem;
    }
    .slide-visual {
      font-size: 5rem;
      text-align: center;
      margin: 3rem 0;
      line-height: 1.5;
    }
    .slide-content {
      font-size: 2.5rem;
      text-align: center;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    .slide-narration {
      background: rgba(255, 255, 255, 0.15);
      border-left: 4px solid rgba(255, 255, 255, 0.5);
      padding: 2rem;
      border-radius: 1rem;
      font-size: 1.8rem;
      line-height: 1.8;
      margin-top: 2rem;
    }
    .narration-icon {
      font-size: 2rem;
      margin-right: 1rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="slide-number">স্লাইড ${bengaliSlideNum} / ${bengaliTotal}</div>
  </div>
  <div class="container">
    <div class="slide">
      <h1 class="slide-title">${slide.title}</h1>
      ${slide.visual ? `<div class="slide-visual">${slide.visual}</div>` : ""}
      <div class="slide-content">${slide.content}</div>
      ${slide.narration ? `
        <div class="slide-narration">
          <span class="narration-icon">[Audio]</span>
          ${slide.narration}
        </div>
      ` : ""}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML for casting PDF pages
 * Creates a simple viewer with the PDF URL
 */
export function generatePDFViewerHTML(pdfUrl: string, title: string, startPage?: number): string {
  const page = startPage || 1;

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: #2c3e50;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      font-family: 'Noto Sans Bengali', Arial, sans-serif;
    }
    .header {
      background: #34495e;
      color: white;
      padding: 1.5rem 2rem;
      font-size: 1.5rem;
      font-weight: bold;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .viewer {
      flex: 1;
      width: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <div class="header">${title}</div>
  <iframe
    class="viewer"
    src="https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}#page=${page}"
    frameborder="0"
  ></iframe>
</body>
</html>
  `.trim();
}
