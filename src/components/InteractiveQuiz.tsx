"use client";

import { useState } from "react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface InteractiveQuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
  passingScore: number;
}

export function InteractiveQuiz({ questions, onComplete, passingScore }: InteractiveQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isAnswerCorrect = selectedAnswer === currentQuestion.correctAnswer;
  const finalScore = Math.round((correctCount / questions.length) * 100);

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(answerIndex);
  };

  const handleCheck = () => {
    if (selectedAnswer === null) return;

    setShowFeedback(true);
    if (isAnswerCorrect) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Quiz complete - correctCount already includes the last answer from handleCheck
      setIsComplete(true);
      const score = Math.round((correctCount / questions.length) * 100);
      onComplete(score);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setIsComplete(false);
  };

  if (isComplete) {
    const passed = finalScore >= passingScore;
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className={`text-center p-8 rounded-2xl ${passed ? 'bg-green-50' : 'bg-orange-50'}`}>
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${passed ? 'bg-green-100' : 'bg-orange-100'}`}>
            {passed ? (
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <h2 className={`text-3xl font-bold mb-2 ${passed ? 'text-green-800' : 'text-orange-800'}`}>
            {passed ? 'অভিনন্দন!' : 'আরও চেষ্টা করুন'}
          </h2>

          <p className={`text-lg mb-6 ${passed ? 'text-green-700' : 'text-orange-700'}`}>
            আপনি {questions.length}টি প্রশ্নের মধ্যে {correctCount}টি সঠিক উত্তর দিয়েছেন
          </p>

          <div className="text-6xl font-bold mb-6" style={{color: passed ? '#16a34a' : '#ea580c'}}>
            {finalScore}%
          </div>

          <p className="text-slate-600 mb-8">
            {passed
              ? 'আপনি সফলভাবে কুইজ সম্পন্ন করেছেন! পরবর্তী টপিকে এগিয়ে যান।'
              : `আপনার ${passingScore}% বা তার বেশি স্কোর করতে হবে। আবার চেষ্টা করুন।`
            }
          </p>

          {!passed && (
            <button
              onClick={handleRetry}
              className="px-8 py-3 bg-orange-600 text-white rounded-full font-medium hover:bg-orange-700 transition-colors"
            >
              পুনরায় চেষ্টা করুন
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-600">
            প্রশ্ন {currentQuestionIndex + 1} / {questions.length}
          </span>
          <span className="text-sm font-medium text-purple-600">
            সঠিক: {correctCount}
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-6">
        <h3 className="text-2xl font-bold text-slate-800 mb-6">
          {currentQuestion.question}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctAnswer;
            const showCorrectAnswer = showFeedback && isCorrect;
            const showIncorrectAnswer = showFeedback && isSelected && !isCorrect;

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showFeedback}
                className={`
                  w-full text-left p-4 rounded-xl border-2 transition-all
                  ${!showFeedback && !isSelected ? 'border-slate-200 hover:border-purple-300 hover:bg-purple-50' : ''}
                  ${!showFeedback && isSelected ? 'border-purple-500 bg-purple-50' : ''}
                  ${showCorrectAnswer ? 'border-green-500 bg-green-50' : ''}
                  ${showIncorrectAnswer ? 'border-red-500 bg-red-50' : ''}
                  ${showFeedback ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5
                    ${!showFeedback && !isSelected ? 'border-slate-300' : ''}
                    ${!showFeedback && isSelected ? 'border-purple-500 bg-purple-500' : ''}
                    ${showCorrectAnswer ? 'border-green-500 bg-green-500' : ''}
                    ${showIncorrectAnswer ? 'border-red-500 bg-red-500' : ''}
                  `}>
                    {isSelected && !showFeedback && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                    {showCorrectAnswer && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {showIncorrectAnswer && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  <span className={`
                    flex-1 text-base
                    ${!showFeedback ? 'text-slate-700' : ''}
                    ${showCorrectAnswer ? 'text-green-800 font-medium' : ''}
                    ${showIncorrectAnswer ? 'text-red-800' : ''}
                  `}>
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback Section */}
        {showFeedback && (
          <div className={`
            mt-6 p-4 rounded-xl
            ${isAnswerCorrect ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}
          `}>
            <div className="flex items-start gap-3">
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${isAnswerCorrect ? 'bg-green-100' : 'bg-orange-100'}
              `}>
                {isAnswerCorrect ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h4 className={`font-bold mb-1 ${isAnswerCorrect ? 'text-green-800' : 'text-orange-800'}`}>
                  {isAnswerCorrect ? 'সঠিক উত্তর!' : 'সঠিক উত্তর ছিল:'}
                </h4>
                {!isAnswerCorrect && (
                  <p className="text-orange-700">
                    {currentQuestion.options[currentQuestion.correctAnswer]}
                  </p>
                )}
                {currentQuestion.explanation && (
                  <p className="text-sm text-slate-600 mt-2">
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {!showFeedback ? (
          <button
            onClick={handleCheck}
            disabled={selectedAnswer === null}
            className={`
              px-8 py-3 rounded-full font-medium transition-all
              ${selectedAnswer !== null
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            উত্তর যাচাই করুন
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-medium hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
          >
            {isLastQuestion ? 'ফলাফল দেখুন' : 'পরবর্তী প্রশ্ন'}
          </button>
        )}
      </div>
    </div>
  );
}
