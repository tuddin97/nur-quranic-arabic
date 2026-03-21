import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { getLessonById, getLevelForLesson } from "@/lib/curriculum";
import { useProgress } from "@/lib/progressStore";
import type { Question } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Star, ChevronRight, BookOpen, Check, Volume2 } from "lucide-react";

type Phase = "vocab" | "quiz" | "result";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { upsertProgress, initSRSForLesson } = useProgress();

  const lesson = getLessonById(params.id ?? "");
  const level = getLevelForLesson(params.id ?? "");

  const [phase, setPhase] = useState<Phase>("vocab");
  const [vocabIdx, setVocabIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!lesson || !level) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Lesson not found</p>
      </div>
    );
  }

  const totalQuestions = lesson.questions.length;
  const currentQuestion: Question | undefined = lesson.questions[questionIdx];

  const handleVocabNext = () => {
    if (vocabIdx < lesson.vocab.length - 1) {
      setVocabIdx(vocabIdx + 1);
    } else {
      setPhase("quiz");
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (currentQuestion && idx === currentQuestion.correctIndex) {
      setCorrectCount((c) => c + 1);
    } else {
      setLives((l) => Math.max(0, l - 1));
    }
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    setShowExplanation(false);
    setSelectedOption(null);
    setIsAnswered(false);

    if (questionIdx < totalQuestions - 1 && lives > 0) {
      setQuestionIdx(questionIdx + 1);
    } else {
      // Calculate stars
      const percentage = correctCount / totalQuestions;
      let stars = 0;
      if (percentage >= 0.9) stars = 3;
      else if (percentage >= 0.7) stars = 2;
      else if (percentage >= 0.5) stars = 1;

      const completed = percentage >= 0.5;
      const xp = completed ? lesson.xpReward : Math.round(lesson.xpReward * 0.3);

      upsertProgress({
        lessonId: lesson.id,
        score: Math.round(percentage * 100),
        completed,
        stars,
        xp,
      });

      // Initialize SRS tracking for words in this lesson
      if (completed) {
        initSRSForLesson(lesson.id);
      }

      setPhase("result");
    }
  };

  const progressPercent =
    phase === "vocab"
      ? 0
      : phase === "quiz"
      ? ((questionIdx + (isAnswered ? 1 : 0)) / totalQuestions) * 100
      : 100;

  const score = Math.round((correctCount / totalQuestions) * 100);
  const finalStars =
    score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;

  // Speak Arabic text
  const speakArabic = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-close"
            aria-label="Close lesson"
          >
            <X className="w-5 h-5" />
          </button>
          <Progress value={progressPercent} className="flex-1 h-2" />
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`text-sm ${
                  i <= lives ? "text-red-500" : "text-muted-foreground/30"
                }`}
              >
                ♥
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col">
        {/* VOCAB PHASE */}
        {phase === "vocab" && (
          <div className="flex-1 flex flex-col">
            <div className="mb-6">
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                New Vocabulary
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {vocabIdx + 1} of {lesson.vocab.length}
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <button
                onClick={() => speakArabic(lesson.vocab[vocabIdx].arabic)}
                className="mb-2 p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Listen to pronunciation"
                data-testid="button-listen"
              >
                <Volume2 className="w-5 h-5 text-primary" />
              </button>
              <p
                className="arabic-display text-4xl font-bold mb-4"
                data-testid="text-arabic-word"
              >
                {lesson.vocab[vocabIdx].arabic}
              </p>
              <p className="text-sm text-muted-foreground mb-1 italic">
                {lesson.vocab[vocabIdx].transliteration}
              </p>
              <p className="text-lg font-semibold mb-6">
                {lesson.vocab[vocabIdx].english}
              </p>

              {lesson.vocab[vocabIdx].example && (
                <div className="bg-card border border-card-border rounded-xl p-4 w-full max-w-xs">
                  <p className="arabic-text text-xl mb-1">
                    {lesson.vocab[vocabIdx].example}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lesson.vocab[vocabIdx].exampleTranslation}
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleVocabNext}
              className="w-full mt-6"
              size="lg"
              data-testid="button-vocab-next"
            >
              {vocabIdx < lesson.vocab.length - 1 ? "Next Word" : "Start Quiz"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* QUIZ PHASE */}
        {phase === "quiz" && currentQuestion && (
          <div className="flex-1 flex flex-col">
            <div className="mb-6">
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                {currentQuestion.type === "fill-blank"
                  ? "Fill in the blank"
                  : "Choose the correct answer"}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Question {questionIdx + 1} of {totalQuestions}
              </p>
            </div>

            <div className="mb-8">
              {currentQuestion.arabicPrompt && (
                <div className="flex items-center justify-center gap-2 mb-3">
                  <button
                    onClick={() => speakArabic(currentQuestion.arabicPrompt!)}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    aria-label="Listen"
                  >
                    <Volume2 className="w-4 h-4 text-primary" />
                  </button>
                  <p className="arabic-display text-3xl" data-testid="text-question-arabic">
                    {currentQuestion.arabicPrompt}
                  </p>
                </div>
              )}
              <h2
                className="text-base font-semibold text-center"
                data-testid="text-question"
              >
                {currentQuestion.prompt}
              </h2>
            </div>

            <div className="space-y-2.5 flex-1">
              {currentQuestion.options.map((option, idx) => {
                let optionStyle = "bg-card border-card-border hover:border-primary/40";
                if (isAnswered) {
                  if (idx === currentQuestion.correctIndex) {
                    optionStyle =
                      "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400";
                  } else if (
                    idx === selectedOption &&
                    idx !== currentQuestion.correctIndex
                  ) {
                    optionStyle =
                      "bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400 incorrect-shake";
                  } else {
                    optionStyle = "bg-muted/50 border-transparent opacity-50";
                  }
                } else if (idx === selectedOption) {
                  optionStyle = "bg-primary/10 border-primary/50";
                }

                const isArabicOption = /[\u0600-\u06FF]/.test(option);

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all ${optionStyle} ${
                      isAnswered ? "cursor-default" : "cursor-pointer"
                    }`}
                    data-testid={`option-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 ${
                          isAnswered && idx === currentQuestion.correctIndex
                            ? "bg-green-500 border-green-500 text-white"
                            : isAnswered &&
                              idx === selectedOption &&
                              idx !== currentQuestion.correctIndex
                            ? "bg-red-500 border-red-500 text-white"
                            : "border-border"
                        }`}
                      >
                        {isAnswered && idx === currentQuestion.correctIndex ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          String.fromCharCode(65 + idx)
                        )}
                      </span>
                      <span
                        className={`font-medium ${
                          isArabicOption ? "arabic-text text-2xl" : "text-sm"
                        }`}
                      >
                        {option}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && currentQuestion.explanation && (
              <div
                className={`mt-4 p-3.5 rounded-xl text-sm ${
                  selectedOption === currentQuestion.correctIndex
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-orange-500/10 border border-orange-500/20"
                }`}
                data-testid="text-explanation"
              >
                <p className="font-semibold mb-1">
                  {selectedOption === currentQuestion.correctIndex
                    ? "Correct!"
                    : "Not quite"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {isAnswered && (
              <Button
                onClick={handleNextQuestion}
                className="w-full mt-4"
                size="lg"
                data-testid="button-next-question"
              >
                {questionIdx < totalQuestions - 1 && lives > 0
                  ? "Continue"
                  : "See Results"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === "result" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3].map((s, i) => (
                  <Star
                    key={s}
                    className={`w-10 h-10 ${
                      s <= finalStars
                        ? "text-amber-500 fill-amber-500 star-animate"
                        : "text-muted-foreground/20"
                    }`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <h2 className="text-xl font-bold mb-2">
                {finalStars >= 3
                  ? "Excellent!"
                  : finalStars >= 2
                  ? "Great work!"
                  : finalStars >= 1
                  ? "Good effort!"
                  : "Keep practicing!"}
              </h2>
              <p className="text-sm text-muted-foreground">
                You got {correctCount} out of {totalQuestions} correct
              </p>
            </div>

            <div className="w-full max-w-xs space-y-3 mb-8">
              <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-card-border">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="font-bold" data-testid="text-score">
                  {score}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-card-border">
                <span className="text-sm text-muted-foreground">XP earned</span>
                <span className="font-bold text-primary" data-testid="text-xp">
                  +{finalStars >= 1 ? lesson.xpReward : Math.round(lesson.xpReward * 0.3)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-card-border">
                <span className="text-sm text-muted-foreground">Stars</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= finalStars
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-2.5">
              {finalStars < 3 && (
                <Button
                  onClick={() => {
                    setPhase("vocab");
                    setVocabIdx(0);
                    setQuestionIdx(0);
                    setSelectedOption(null);
                    setIsAnswered(false);
                    setCorrectCount(0);
                    setLives(3);
                    setShowExplanation(false);
                  }}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
              )}
              <Button
                onClick={() => navigate("/")}
                className="w-full"
                size="lg"
                data-testid="button-back-home"
              >
                Back to Lessons
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
