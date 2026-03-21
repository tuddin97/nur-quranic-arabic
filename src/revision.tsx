import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { curriculum, getAllLessons } from "@/lib/curriculum";
import type { VocabWord, Question } from "@/lib/curriculum";
import { useProgress } from "@/lib/progressStore";
import { Button } from "@/components/ui/button";
import { Progress as ProgressBar } from "@/components/ui/progress";
import {
  ArrowLeft,
  RotateCcw,
  Star,
  Check,
  X,
  Volume2,
  ChevronRight,
  BookOpen,
  Brain,
  Layers,
  Zap,
  Clock,
} from "lucide-react";

type RevisionMode = "select" | "flashcards" | "srs-review" | "quiz" | "results";

export default function RevisionPage() {
  const [, navigate] = useLocation();
  const {
    allProgress,
    getDueWords,
    updateSRS,
    addFlashcardsReviewed,
    addQuizCompleted,
  } = useProgress();

  const progressMap = new Map(allProgress.map((p) => [p.lessonId, p]));

  // Get completed lessons
  const completedLessons = useMemo(() => {
    return getAllLessons().filter((l) => progressMap.get(l.id)?.completed);
  }, [allProgress]);

  // Get all vocab from completed lessons
  const allLearnedVocab = useMemo(() => {
    return completedLessons.flatMap((l) =>
      l.vocab.map((v) => ({ ...v, lessonId: l.id, lessonTitle: l.title }))
    );
  }, [completedLessons]);

  // Get all questions from completed lessons
  const allLearnedQuestions = useMemo(() => {
    return completedLessons.flatMap((l) => l.questions);
  }, [completedLessons]);

  // SRS due words
  const dueWords = useMemo(() => getDueWords(), [getDueWords]);

  // Revision state
  const [mode, setMode] = useState<RevisionMode>("select");
  const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [shuffledVocab, setShuffledVocab] = useState<
    (VocabWord & { lessonId: string; lessonTitle: string })[]
  >([]);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);

  // SRS review state
  const [srsCards, setSrsCards] = useState<
    { word: VocabWord; lessonId: string; wordKey: string }[]
  >([]);
  const [srsIdx, setSrsIdx] = useState(0);
  const [srsShowBack, setSrsShowBack] = useState(false);

  // Filter vocab/questions by selected levels
  const filteredVocab = useMemo(() => {
    if (selectedLevelIds.length === 0) return allLearnedVocab;
    const levelLessonIds = new Set(
      curriculum
        .filter((l) => selectedLevelIds.includes(l.id))
        .flatMap((l) => l.lessons.map((lesson) => lesson.id))
    );
    return allLearnedVocab.filter((v) => levelLessonIds.has(v.lessonId));
  }, [selectedLevelIds, allLearnedVocab]);

  const filteredQuestions = useMemo(() => {
    if (selectedLevelIds.length === 0) return allLearnedQuestions;
    const levelLessonIds = new Set(
      curriculum
        .filter((l) => selectedLevelIds.includes(l.id))
        .flatMap((l) => l.lessons.map((lesson) => lesson.id))
    );
    const completedIds = new Set(completedLessons.map((l) => l.id));
    return completedLessons
      .filter(
        (l) => levelLessonIds.has(l.id) && completedIds.has(l.id)
      )
      .flatMap((l) => l.questions);
  }, [selectedLevelIds, completedLessons, allLearnedQuestions]);

  // Shuffle utility
  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const startFlashcards = () => {
    const shuffled = shuffle(filteredVocab);
    setShuffledVocab(shuffled.slice(0, Math.min(20, shuffled.length)));
    setCardIdx(0);
    setShowBack(false);
    setKnownCount(0);
    setUnknownCount(0);
    setMode("flashcards");
  };

  const startSrsReview = () => {
    const cards = dueWords.slice(0, 20).map((d) => ({
      word: d.word,
      lessonId: d.lessonId,
      wordKey: d.entry.wordKey,
    }));
    setSrsCards(cards);
    setSrsIdx(0);
    setSrsShowBack(false);
    setKnownCount(0);
    setUnknownCount(0);
    setMode("srs-review");
  };

  const startQuiz = () => {
    const shuffled = shuffle(filteredQuestions);
    setShuffledQuestions(shuffled.slice(0, Math.min(15, shuffled.length)));
    setQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setTotalAnswered(0);
    setMode("quiz");
  };

  const handleFlashcardKnown = () => {
    setKnownCount((c) => c + 1);
    if (cardIdx < shuffledVocab.length - 1) {
      setCardIdx(cardIdx + 1);
      setShowBack(false);
    } else {
      addFlashcardsReviewed(shuffledVocab.length);
      setMode("results");
    }
  };

  const handleFlashcardUnknown = () => {
    setUnknownCount((c) => c + 1);
    if (cardIdx < shuffledVocab.length - 1) {
      setCardIdx(cardIdx + 1);
      setShowBack(false);
    } else {
      addFlashcardsReviewed(shuffledVocab.length);
      setMode("results");
    }
  };

  // SRS review handlers
  const handleSrsKnown = () => {
    // Quality 4 = "Good"
    updateSRS(srsCards[srsIdx].wordKey, 4);
    setKnownCount((c) => c + 1);
    if (srsIdx < srsCards.length - 1) {
      setSrsIdx(srsIdx + 1);
      setSrsShowBack(false);
    } else {
      addFlashcardsReviewed(srsCards.length);
      setMode("results");
    }
  };

  const handleSrsEasy = () => {
    // Quality 5 = "Easy"
    updateSRS(srsCards[srsIdx].wordKey, 5);
    setKnownCount((c) => c + 1);
    if (srsIdx < srsCards.length - 1) {
      setSrsIdx(srsIdx + 1);
      setSrsShowBack(false);
    } else {
      addFlashcardsReviewed(srsCards.length);
      setMode("results");
    }
  };

  const handleSrsHard = () => {
    // Quality 2 = "Fail / Hard"
    updateSRS(srsCards[srsIdx].wordKey, 2);
    setUnknownCount((c) => c + 1);
    if (srsIdx < srsCards.length - 1) {
      setSrsIdx(srsIdx + 1);
      setSrsShowBack(false);
    } else {
      addFlashcardsReviewed(srsCards.length);
      setMode("results");
    }
  };

  const handleSelectAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    setTotalAnswered((t) => t + 1);
    if (shuffledQuestions[questionIdx]?.correctIndex === idx) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    if (questionIdx < shuffledQuestions.length - 1) {
      setQuestionIdx(questionIdx + 1);
    } else {
      addQuizCompleted();
      setMode("results");
    }
  };

  const speakArabic = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar";
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Get levels that have at least one completed lesson
  const completedLevelIds = useMemo(() => {
    return curriculum
      .filter((level) =>
        level.lessons.some((l) => progressMap.get(l.id)?.completed)
      )
      .map((l) => l.id);
  }, [allProgress]);

  const toggleLevel = (id: string) => {
    setSelectedLevelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (completedLessons.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold">Revision</h1>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-bold mb-2">No lessons completed yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Complete at least one lesson to unlock the revision section.
          </p>
          <Button onClick={() => navigate("/")} data-testid="button-go-learn">
            Start Learning
          </Button>
        </main>
      </div>
    );
  }

  const modeTitle =
    mode === "select" ? "Revision"
    : mode === "flashcards" ? "Flashcards"
    : mode === "srs-review" ? "Smart Review"
    : mode === "quiz" ? "Review Quiz"
    : "Results";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() =>
              mode === "select" ? navigate("/") : setMode("select")
            }
            className="p-1 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">{modeTitle}</h1>
          {mode === "flashcards" && (
            <span className="ml-auto text-xs text-muted-foreground">
              {cardIdx + 1} / {shuffledVocab.length}
            </span>
          )}
          {mode === "srs-review" && (
            <span className="ml-auto text-xs text-muted-foreground">
              {srsIdx + 1} / {srsCards.length}
            </span>
          )}
          {mode === "quiz" && (
            <span className="ml-auto text-xs text-muted-foreground">
              {questionIdx + 1} / {shuffledQuestions.length}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col">
        {/* SELECT MODE */}
        {mode === "select" && (
          <div className="flex flex-col gap-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-card-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">
                  {allLearnedVocab.length}
                </p>
                <p className="text-xs text-muted-foreground">Words Learned</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">
                  {completedLessons.length}
                </p>
                <p className="text-xs text-muted-foreground">Lessons Done</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">
                  {Math.min(
                    92,
                    Math.round(
                      (completedLessons.length / getAllLessons().length) * 92
                    )
                  )}%
                </p>
                <p className="text-xs text-muted-foreground">Quran Coverage</p>
              </div>
            </div>

            {/* Level filter */}
            <div>
              <h2 className="text-sm font-semibold mb-2">Filter by level</h2>
              <div className="flex flex-wrap gap-2">
                {curriculum
                  .filter((level) => completedLevelIds.includes(level.id))
                  .map((level) => (
                    <button
                      key={level.id}
                      onClick={() => toggleLevel(level.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedLevelIds.includes(level.id)
                          ? "text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      style={
                        selectedLevelIds.includes(level.id)
                          ? { backgroundColor: level.color }
                          : undefined
                      }
                      data-testid={`filter-${level.id}`}
                    >
                      {level.name}
                    </button>
                  ))}
                {selectedLevelIds.length > 0 && (
                  <button
                    onClick={() => setSelectedLevelIds([])}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {filteredVocab.length} words &middot;{" "}
                {filteredQuestions.length} questions available
              </p>
            </div>

            {/* Revision modes */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Choose revision mode</h2>

              {/* SRS Smart Review — show only if there are due words */}
              {dueWords.length > 0 && (
                <button
                  onClick={startSrsReview}
                  className="w-full flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl hover:border-primary/40 transition-colors text-left"
                  data-testid="button-srs-review"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Smart Review</p>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {dueWords.length} due
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Spaced repetition — focus on words you find hardest
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary shrink-0 ml-auto" />
                </button>
              )}

              <button
                onClick={startFlashcards}
                disabled={filteredVocab.length === 0}
                className="w-full flex items-center gap-4 p-4 bg-card border border-card-border rounded-xl hover:border-primary/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-flashcards"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Flashcards</p>
                  <p className="text-xs text-muted-foreground">
                    Flip through vocabulary cards. Mark what you know.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
              </button>

              <button
                onClick={startQuiz}
                disabled={filteredQuestions.length === 0}
                className="w-full flex items-center gap-4 p-4 bg-card border border-card-border rounded-xl hover:border-primary/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-review-quiz"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Review Quiz</p>
                  <p className="text-xs text-muted-foreground">
                    Test yourself on questions from completed lessons.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
              </button>
            </div>
          </div>
        )}

        {/* FLASHCARD MODE */}
        {mode === "flashcards" && shuffledVocab[cardIdx] && (
          <div className="flex-1 flex flex-col">
            <ProgressBar
              value={((cardIdx + 1) / shuffledVocab.length) * 100}
              className="h-1.5 mb-6"
            />

            <div
              className="flex-1 flex flex-col items-center justify-center"
              onClick={() => setShowBack(true)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakArabic(shuffledVocab[cardIdx].arabic);
                }}
                className="mb-3 p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Listen"
              >
                <Volume2 className="w-5 h-5 text-primary" />
              </button>

              <p
                className="arabic-display text-4xl font-bold mb-4"
                data-testid="text-flashcard-arabic"
              >
                {shuffledVocab[cardIdx].arabic}
              </p>

              <p className="text-sm text-muted-foreground italic mb-6">
                {shuffledVocab[cardIdx].transliteration}
              </p>

              {showBack ? (
                <div className="text-center">
                  <p
                    className="text-lg font-semibold mb-3"
                    data-testid="text-flashcard-english"
                  >
                    {shuffledVocab[cardIdx].english}
                  </p>
                  {shuffledVocab[cardIdx].example && (
                    <div className="bg-card border border-card-border rounded-xl p-4 max-w-xs">
                      <p className="arabic-text text-xl mb-1">
                        {shuffledVocab[cardIdx].example}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shuffledVocab[cardIdx].exampleTranslation}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tap to reveal meaning
                </p>
              )}
            </div>

            {showBack && (
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleFlashcardUnknown}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  size="lg"
                  data-testid="button-dont-know"
                >
                  <X className="w-4 h-4 mr-2" />
                  Still learning
                </Button>
                <Button
                  onClick={handleFlashcardKnown}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                  data-testid="button-know"
                >
                  <Check className="w-4 h-4 mr-2" />
                  I know this
                </Button>
              </div>
            )}
          </div>
        )}

        {/* SRS SMART REVIEW MODE */}
        {mode === "srs-review" && srsCards[srsIdx] && (
          <div className="flex-1 flex flex-col">
            <ProgressBar
              value={((srsIdx + 1) / srsCards.length) * 100}
              className="h-1.5 mb-6"
            />

            <div
              className="flex-1 flex flex-col items-center justify-center"
              onClick={() => setSrsShowBack(true)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakArabic(srsCards[srsIdx].word.arabic);
                }}
                className="mb-3 p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Listen"
              >
                <Volume2 className="w-5 h-5 text-primary" />
              </button>

              <p className="arabic-display text-4xl font-bold mb-4" data-testid="text-srs-arabic">
                {srsCards[srsIdx].word.arabic}
              </p>

              <p className="text-sm text-muted-foreground italic mb-6">
                {srsCards[srsIdx].word.transliteration}
              </p>

              {srsShowBack ? (
                <div className="text-center">
                  <p className="text-lg font-semibold mb-3" data-testid="text-srs-english">
                    {srsCards[srsIdx].word.english}
                  </p>
                  {srsCards[srsIdx].word.example && (
                    <div className="bg-card border border-card-border rounded-xl p-4 max-w-xs">
                      <p className="arabic-text text-xl mb-1">
                        {srsCards[srsIdx].word.example}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {srsCards[srsIdx].word.exampleTranslation}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tap to reveal meaning
                </p>
              )}
            </div>

            {srsShowBack && (
              <div className="flex gap-2 mt-6">
                <Button
                  onClick={handleSrsHard}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  size="lg"
                  data-testid="button-srs-hard"
                >
                  <X className="w-4 h-4 mr-1" />
                  Hard
                </Button>
                <Button
                  onClick={handleSrsKnown}
                  variant="outline"
                  className="flex-1 border-green-300 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                  size="lg"
                  data-testid="button-srs-good"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Good
                </Button>
                <Button
                  onClick={handleSrsEasy}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                  data-testid="button-srs-easy"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Easy
                </Button>
              </div>
            )}
          </div>
        )}

        {/* QUIZ MODE */}
        {mode === "quiz" && shuffledQuestions[questionIdx] && (
          <div className="flex-1 flex flex-col">
            <ProgressBar
              value={
                ((questionIdx + (isAnswered ? 1 : 0)) /
                  shuffledQuestions.length) *
                100
              }
              className="h-1.5 mb-6"
            />

            <div className="mb-6">
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                {shuffledQuestions[questionIdx].type === "fill-blank"
                  ? "Fill in the blank"
                  : "Choose the correct answer"}
              </span>
            </div>

            <div className="mb-6">
              {shuffledQuestions[questionIdx].arabicPrompt && (
                <div className="flex items-center justify-center gap-2 mb-3">
                  <button
                    onClick={() =>
                      speakArabic(
                        shuffledQuestions[questionIdx].arabicPrompt!
                      )
                    }
                    className="p-1.5 rounded-full hover:bg-muted transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-primary" />
                  </button>
                  <p className="arabic-display text-3xl">
                    {shuffledQuestions[questionIdx].arabicPrompt}
                  </p>
                </div>
              )}
              <h2 className="text-base font-semibold text-center">
                {shuffledQuestions[questionIdx].prompt}
              </h2>
            </div>

            <div className="space-y-2.5 flex-1">
              {shuffledQuestions[questionIdx].options.map((option, idx) => {
                const q = shuffledQuestions[questionIdx];
                let optionStyle =
                  "bg-card border-card-border hover:border-primary/40";
                if (isAnswered) {
                  if (idx === q.correctIndex) {
                    optionStyle =
                      "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400";
                  } else if (idx === selectedOption && idx !== q.correctIndex) {
                    optionStyle =
                      "bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400";
                  } else {
                    optionStyle = "bg-muted/50 border-transparent opacity-50";
                  }
                }
                const isArabicOption = /[\u0600-\u06FF]/.test(option);

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    disabled={isAnswered}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all ${optionStyle} ${
                      isAnswered ? "cursor-default" : "cursor-pointer"
                    }`}
                    data-testid={`quiz-option-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 ${
                          isAnswered && idx === q.correctIndex
                            ? "bg-green-500 border-green-500 text-white"
                            : isAnswered &&
                              idx === selectedOption &&
                              idx !== q.correctIndex
                            ? "bg-red-500 border-red-500 text-white"
                            : "border-border"
                        }`}
                      >
                        {isAnswered && idx === q.correctIndex ? (
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

            {isAnswered && shuffledQuestions[questionIdx].explanation && (
              <div
                className={`mt-4 p-3.5 rounded-xl text-sm ${
                  selectedOption ===
                  shuffledQuestions[questionIdx].correctIndex
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-orange-500/10 border border-orange-500/20"
                }`}
              >
                <p className="font-semibold mb-1">
                  {selectedOption ===
                  shuffledQuestions[questionIdx].correctIndex
                    ? "Correct!"
                    : "Not quite"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {shuffledQuestions[questionIdx].explanation}
                </p>
              </div>
            )}

            {isAnswered && (
              <Button
                onClick={handleNextQuizQuestion}
                className="w-full mt-4"
                size="lg"
                data-testid="button-quiz-next"
              >
                {questionIdx < shuffledQuestions.length - 1
                  ? "Continue"
                  : "See Results"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* RESULTS */}
        {mode === "results" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Revision Complete</h2>

              {/* Flashcard / SRS results */}
              {knownCount + unknownCount > 0 && (
                <div className="space-y-3 w-full max-w-xs mt-6">
                  <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-card-border">
                    <span className="text-sm text-muted-foreground">
                      Words reviewed
                    </span>
                    <span className="font-bold">
                      {knownCount + unknownCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-500/5 rounded-xl border border-green-500/20">
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Known
                    </span>
                    <span className="font-bold text-green-700 dark:text-green-400">
                      {knownCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-500/5 rounded-xl border border-orange-500/20">
                    <span className="text-sm text-orange-700 dark:text-orange-400">
                      Still learning
                    </span>
                    <span className="font-bold text-orange-700 dark:text-orange-400">
                      {unknownCount}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {knownCount > unknownCount
                      ? "Great recall! Keep revising to maintain your knowledge."
                      : "Keep practising — revision strengthens memory."}
                  </p>
                </div>
              )}

              {/* Quiz results */}
              {totalAnswered > 0 && knownCount + unknownCount === 0 && (
                <div className="space-y-3 w-full max-w-xs mt-6">
                  <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-card-border">
                    <span className="text-sm text-muted-foreground">Score</span>
                    <span className="font-bold">
                      {Math.round((correctCount / totalAnswered) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-card-border">
                    <span className="text-sm text-muted-foreground">
                      Correct
                    </span>
                    <span className="font-bold text-green-600">
                      {correctCount} / {totalAnswered}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {correctCount === totalAnswered
                      ? "Perfect score! You've mastered this material."
                      : correctCount / totalAnswered >= 0.7
                      ? "Strong understanding! Review the ones you missed."
                      : "Good effort! Revisit those lessons for a stronger foundation."}
                  </p>
                </div>
              )}
            </div>

            <div className="w-full max-w-xs space-y-2.5">
              <Button
                onClick={() => setMode("select")}
                variant="outline"
                className="w-full"
                size="lg"
                data-testid="button-revise-again"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Revise Again
              </Button>
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
