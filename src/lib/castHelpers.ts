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
 * @deprecated Use generateScrollablePDFHTML instead for better scrolling experience
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

/**
 * Generate scrollable HTML with ALL PDF pages as images
 * This creates a TV-optimized viewer that can scroll through all pages
 * Perfect for casting textbook pages to Chromecast devices
 */
export function generateScrollablePDFHTML(
  classId: string,
  subjectId: string,
  chapterId: string,
  startPage: number,
  endPage: number,
  title: string
): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const baseImagePath = `${supabaseUrl}/storage/v1/object/public/textbook-pages/${classId}/${subjectId}/${chapterId}`;

  // Generate all page numbers
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Noto Sans Bengali', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .header {
      position: sticky;
      top: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(15px);
      padding: 1.5rem 2rem;
      z-index: 100;
      border-bottom: 3px solid rgba(207, 39, 141, 0.5);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .header-content {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .book-title {
      font-size: 2.2rem;
      font-weight: bold;
      color: #cf278d;
      text-shadow: 0 2px 10px rgba(207, 39, 141, 0.3);
    }
    .page-count {
      font-size: 1.3rem;
      opacity: 0.9;
      background: rgba(207, 39, 141, 0.2);
      padding: 0.5rem 1.2rem;
      border-radius: 2rem;
    }
    .pages-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }
    .page {
      background: white;
      margin-bottom: 2.5rem;
      border-radius: 1.2rem;
      overflow: hidden;
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.6);
      position: relative;
      transition: transform 0.3s ease;
    }
    .page:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
    }
    .page-number {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      background: rgba(207, 39, 141, 0.95);
      color: white;
      padding: 0.7rem 1.3rem;
      border-radius: 0.7rem;
      font-size: 1.4rem;
      font-weight: bold;
      z-index: 10;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    .page img {
      width: 100%;
      display: block;
      height: auto;
    }
    .page img.loading {
      min-height: 1200px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .error-page {
      background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
      color: white;
      padding: 4rem;
      text-align: center;
      border-radius: 1.2rem;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    .error-message {
      font-size: 1.5rem;
      font-weight: 600;
    }
    /* Smooth scrolling */
    html {
      scroll-behavior: smooth;
    }
    /* Loading indicator */
    .loader {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: rgba(207, 39, 141, 0.95);
      color: white;
      padding: 1.2rem 1.8rem;
      border-radius: 3rem;
      font-size: 1.2rem;
      font-weight: 600;
      display: none;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
      z-index: 1000;
    }
    .loader.show {
      display: flex;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from {
        transform: translateX(150%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    /* Scroll to top button */
    .scroll-top {
      position: fixed;
      bottom: 2rem;
      left: 2rem;
      background: rgba(52, 72, 148, 0.9);
      color: white;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1.8rem;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
      transition: all 0.3s ease;
    }
    .scroll-top.show {
      display: flex;
    }
    .scroll-top:hover {
      background: rgba(52, 72, 148, 1);
      transform: translateY(-5px);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div class="book-title">${title}</div>
      <div class="page-count">পৃষ্ঠা ${toBengaliNumber(startPage)} - ${toBengaliNumber(endPage)}</div>
    </div>
  </div>

  <div class="pages-container">
    ${pages.map((pageNum) => {
      const pageStr = String(pageNum).padStart(3, '0');
      const jpgUrl = `${baseImagePath}/page-${pageStr}.jpg`;
      const pngUrl = `${baseImagePath}/page-${pageStr}.png`;

      return `
        <div class="page" id="page-${pageNum}">
          <div class="page-number">পৃষ্ঠা ${toBengaliNumber(pageNum)}</div>
          <img
            src="${jpgUrl}"
            alt="পৃষ্ঠা ${pageNum}"
            onerror="this.onerror=null; this.src='${pngUrl}'; if(this.complete && this.naturalHeight === 0) { this.parentElement.innerHTML = '<div class=\\'error-page\\'><div class=\\'error-icon\\'>⚠️</div><div class=\\'error-message\\'>পৃষ্ঠা লোড হয়নি</div></div>'; }"
            loading="lazy"
            class="loading"
          />
        </div>
      `;
    }).join('')}
  </div>

  <div class="loader" id="loader">
    <div class="spinner"></div>
    <span>লোড হচ্ছে...</span>
  </div>

  <div class="scroll-top" id="scrollTop" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
    ↑
  </div>

  <script>
    // Show loader when images are loading
    let loadingImages = 0;
    const loader = document.getElementById('loader');
    const images = document.querySelectorAll('.page img');

    images.forEach(img => {
      // Remove loading class when image loads
      img.addEventListener('load', function() {
        this.classList.remove('loading');
        loadingImages--;
        if (loadingImages <= 0) {
          loader.classList.remove('show');
        }
      });

      img.addEventListener('error', function() {
        this.classList.remove('loading');
        loadingImages--;
        if (loadingImages <= 0) {
          loader.classList.remove('show');
        }
      });

      if (!img.complete) {
        loadingImages++;
        loader.classList.add('show');
      } else {
        img.classList.remove('loading');
      }
    });

    // Show scroll to top button when scrolled down
    const scrollTop = document.getElementById('scrollTop');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        scrollTop.classList.add('show');
      } else {
        scrollTop.classList.remove('show');
      }
    });

    // Log page load status
    console.log('📚 PDF Viewer loaded with', ${pages.length}, 'pages');
    console.log('📖 Pages:', ${startPage}, 'to', ${endPage});
    console.log('✨ Scroll to navigate through pages');
  </script>
</body>
</html>
  `.trim();
}
