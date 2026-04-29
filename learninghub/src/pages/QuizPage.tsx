import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import { SEO } from '../components/SEO';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import ProgressRing from '../components/ui/ProgressRing';
import {
  Brain,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trophy,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Timer,
  Info,
  Flag
} from 'lucide-react';
import { useStore } from '../stores/useStore';
import { quizService, type Quiz, type QuizQuestion, type QuizResult } from '../services/quizService';

export default function QuizPage() {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  
  // Local state for quiz data
  const [quizInfo, setQuizInfo] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Connect to global quiz state
  const { 
    flaggedQuestions, 
    flagQuestion, 
    unflagQuestion, 
    navigateToQuestion,
    startQuizAttempt,
    setQuizQuestions,
    updateQuizTimer,
    submitQuiz,
    resetQuizState
  } = useStore(state => ({
    flaggedQuestions: state.quiz.flaggedQuestions,
    flagQuestion: state.flagQuestion,
    unflagQuestion: state.unflagQuestion,
    navigateToQuestion: state.navigateToQuestion,
    startQuizAttempt: state.startQuizAttempt,
    setQuizQuestions: state.setQuizQuestions,
    updateQuizTimer: state.updateQuizTimer,
    submitQuiz: state.submitQuiz,
    resetQuizState: state.resetQuizState
  }));

  const loadQuiz = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let sessionData;
      if (quizId) {
        // Load specific quiz
        const res = await quizService.startAttempt(quizId);
        sessionData = res.data;
        // Also fetch quiz info
        const infoRes = await quizService.getQuiz(quizId);
        setQuizInfo(infoRes.data.quiz);
        // Use the correct time limit from the quiz info we just fetched
        setTimeRemaining(infoRes.data.quiz.time_limit * 60);
      } else {
        // Fallback or general quiz if no ID provided - in a real app might redirect or load a default
        // For this app, let's try to find a general quiz or show error
        throw new Error('No quiz session specified.');
      }

      setAttemptId(sessionData.attempt_id);
      setQuestions(sessionData.questions);
      
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[QuizPage] Failed to load quiz:', err);
      }
      setError(err instanceof Error ? err.message : 'System unavailable. Could not generate quiz session.');

      // Fallback for development if no backend
      if (import.meta.env.DEV) {
          setQuestions([
            {
              id: '1',
              type: 'multiple_choice',
              question: 'What is the optimized time complexity of binary search on a sorted array?',
              options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
              correct_answer: 'O(log n)',
              explanation: 'Binary search uses a divide-and-conquer strategy, halving the search space each time.',
              points: 20,
            },
            {
              id: '2',
              type: 'multiple_choice',
              question: 'Which abstract data type follows the Last-In, First-Out (LIFO) protocol?',
              options: ['Queue', 'Stack', 'Circular Buffer', 'Hash Map'],
              correct_answer: 'Stack',
              explanation: 'The stack data structure only allows operations at one end, the top, adhering to LIFO.',
              points: 20,
            }
          ]);
          setQuizInfo({
              id: 'fallback',
              title: 'Core Programming Logic',
              description: 'Assess your understanding of fundamental data structures and algorithms.',
              time_limit: 10,
              total_questions: 2,
              course_id: '',
              course_title: '',
              passing_score: 60,
              max_attempts: 1,
              attempts_made: 0
          });
          setTimeRemaining(10 * 60);
          setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

    const handleSubmitClick = useCallback(() => {
      setShowConfirmDialog(true);
    }, []);

    const handleConfirmSubmit = useCallback(async () => {
      setShowConfirmDialog(false);
      if (!quizInfo || !attemptId || !quizId) return;

      setIsSubmitting(true);
      const timeTaken = quizInfo.time_limit * 60 - timeRemaining;

     try {
       const response = await quizService.submitQuiz(quizId, attemptId, answers);
       setResult(response.data);
     } catch (err) {
       if (import.meta.env.DEV) {
         console.error('[QuizPage] Submission failed:', err);
       }
       // Local fallback calculation if backend fails
       let correctCount = 0;
       questions.forEach(q => {
           if (answers[q.id] === q.correct_answer) correctCount++;
       });
       setResult({
           attempt_id: attemptId || 'local',
           score: Math.round((correctCount / questions.length) * 100),
           passed: (correctCount / questions.length) * 100 >= quizInfo.passing_score,
           total_questions: questions.length,
           correct_answers: correctCount,
           time_taken: timeTaken,
           percentage: Math.round((correctCount / questions.length) * 100)
       });
     } finally {
       setIsSubmitting(false);
     }
   }, [quizId, attemptId, questions, answers, timeRemaining, quizInfo]);

  useEffect(() => {
    if (!quizInfo || result || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleConfirmSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizInfo, result, timeRemaining, handleConfirmSubmit]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleRetry = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setResult(null);
    loadQuiz();
  }, [loadQuiz]);

  const quizProgress = useMemo(() => {
    if (questions.length === 0) return 0;
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  }, [questions.length, currentQuestionIndex]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-3xl flex items-center justify-center mb-6"
        >
          <Brain className="w-10 h-10 text-primary-500" />
        </motion.div>
        <p className="font-bold text-gray-500 tracking-widest uppercase text-xs">Generating Session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <AnimatedPage>
        <Card className="max-w-md mx-auto p-10 text-center mt-12 border-none shadow-2xl rounded-[2.5rem]">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-black mb-3 tracking-tight">Access Error</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">{error}</p>
          <Button onClick={loadQuiz} className="w-full py-4 rounded-2xl font-bold">Try Connection Again</Button>
        </Card>
      </AnimatedPage>
    );
  }

  if (!quizInfo || questions.length === 0) return null;

  if (result) {
    return (
      <AnimatedPage className="max-w-3xl mx-auto px-4 pb-12">
        <SEO title="Quiz Results" />
        <Card className="p-8 sm:p-12 text-center mb-10 border-none shadow-2xl rounded-[3rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none">
            <Trophy className="w-48 h-48" />
          </div>
          
          <div className="relative mb-10 flex flex-col items-center">
            <div className="relative">
              <ProgressRing 
                progress={result.percentage || result.score} 
                size={160} 
                strokeWidth={12} 
                className="text-primary-500"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black tabular-nums tracking-tighter">
                  {result.percentage || result.score}%
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Mastery
                </span>
              </div>
            </div>
            
            <motion.div 
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute -bottom-4 bg-white dark:bg-gray-800 px-6 py-2 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold">
                {result.passed ? 'Level Mastered!' : 'Keep Practicing'}
              </span>
            </motion.div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">Session Concluded</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-10 font-medium">
            {result.passed ? "Outstanding! You've mastered these concepts." : 
             "Focus on the course material and try again."}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Mastery', value: `${result.percentage || result.score}%`, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/10' },
              { label: 'Accuracy', value: `${result.correct_answers}/${result.total_questions}`, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
              { label: 'Duration', value: `${Math.floor(result.time_taken / 60)}m ${result.time_taken % 60}s`, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/10' }
            ].map((stat) => (
              <div key={stat.label} className={`${stat.bg} p-6 rounded-[2rem] border border-transparent`}>
                <p className={`text-2xl sm:text-3xl font-black ${stat.color} mb-1 tracking-tighter`}>{stat.value}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4 flex-col sm:flex-row">
            <Button 
              onClick={handleRetry} 
              variant="outline" 
              className="flex-1 py-4 rounded-2xl font-bold border-2"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Retake Quiz
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              className="flex-1 py-4 rounded-2xl font-bold shadow-xl shadow-primary-500/20"
            >
              Back to Dashboard <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <h2 className="text-xl font-black tracking-tight px-2 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary-500" />
            Detailed Breakdown
          </h2>
          {questions.map((q, index) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correct_answer;
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`p-6 sm:p-8 rounded-[2rem] border shadow-sm ${isCorrect ? 'border-emerald-100 dark:border-emerald-900/20' : 'border-red-100 dark:border-red-900/20'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1 ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Question {index + 1}</p>
                        <p className="font-bold text-lg leading-snug tracking-tight">{q.question}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Your Choice</p>
                          <p className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>{userAnswer || 'Timed Out'}</p>
                        </div>
                        {!isCorrect && (
                          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Correct Answer</p>
                            <p className="font-bold text-emerald-700 dark:text-emerald-400">{q.correct_answer}</p>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl italic text-sm text-gray-500 leading-relaxed border-l-4 border-primary-500">
                        "{q.explanation}"
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </AnimatedPage>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const displayOptions = currentQuestion.options || (currentQuestion.type === 'true_false' ? ['True', 'False'] : []);

  return (
    <AnimatedPage className="max-w-4xl mx-auto px-4 pb-12">
      <SEO title="Active Quiz" />
      
      {/* Session Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">{quizInfo.title}</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:pl-15">{quizInfo.description}</p>
        </div>
        
        <div className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] border-2 transition-all shadow-xl ${timeRemaining < 60 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
          <Timer className="w-5 h-5" />
          <span className="font-black text-xl tabular-nums tracking-tighter">
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="mb-10 px-2">
        <div className="flex justify-between items-end mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Current Progress</span>
            <span className="text-lg font-black text-primary-600">{currentQuestionIndex + 1} <span className="text-gray-300 font-medium text-sm">of {questions.length}</span></span>
          </div>
          <span className="text-xs font-black text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{Math.round(quizProgress)}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${quizProgress}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="absolute inset-0 shimmer opacity-30" />
          </motion.div>
        </div>
      </div>

      {/* Question Interaction Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 sm:p-12 rounded-[3rem] border-none shadow-2xl relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Sparkles className="w-32 h-32" />
            </div>
            
            {/* Question Navigation Grid */}
            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                  Question Navigator
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {Object.keys(answers).length} of {questions.length} answered
                </span>
              </div>
              <div className="grid grid-cols-10 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isFlagged = flaggedQuestions.includes(q.id);
                  const isCurrent = idx === currentQuestionIndex;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => navigateToQuestion(idx)}
                      className={`
                        relative w-10 h-10 rounded-xl text-sm font-bold transition-all duration-200
                        ${isCurrent 
                          ? 'bg-primary-500 text-white ring-2 ring-primary-300 ring-offset-2 dark:ring-offset-gray-800' 
                          : isAnswered
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }
                      `}
                      title={`Question ${idx + 1}${isFlagged ? ' (Flagged)' : ''}`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-block px-4 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 text-[10px] font-black uppercase tracking-widest rounded-xl">
                  Difficulty Award: {currentQuestion.points} XP
                </span>
                <button
                  onClick={() => {
                    if (flaggedQuestions.includes(currentQuestion.id)) {
                      unflagQuestion(currentQuestion.id);
                    } else {
                      flagQuestion(currentQuestion.id);
                    }
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200
                    ${flaggedQuestions.includes(currentQuestion.id)
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Flag className={`w-4 h-4 ${flaggedQuestions.includes(currentQuestion.id) ? 'fill-current' : ''}`} />
                  {flaggedQuestions.includes(currentQuestion.id) ? 'Flagged' : 'Flag for Review'}
                </button>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-gray-900 dark:text-white">
                {currentQuestion.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4" role="radiogroup">
              {displayOptions.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === option;
                return (
                  <motion.button
                    key={option}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleAnswer(currentQuestion.id, option)}
                    className={`group w-full text-left p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-center justify-between ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 shadow-lg shadow-primary-500/5'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-black transition-all ${
                        isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-400 group-hover:border-primary-200'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className={`font-bold text-lg tracking-tight ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        {option}
                      </span>
                    </div>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircle className="w-6 h-6 text-primary-500" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Control Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
        <button
          onClick={() => currentQuestionIndex > 0 && setCurrentQuestionIndex(prev => prev - 1)}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-3 font-black uppercase tracking-widest text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-all p-4"
        >
          <ChevronLeft className="w-5 h-5" /> Previous Logic
        </button>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          {isLastQuestion ? (
            <Button
              onClick={handleSubmitClick}
              isLoading={isSubmitting}
              disabled={Object.keys(answers).length < questions.length}
              className="w-full sm:w-64 py-6 rounded-[2rem] font-black text-lg shadow-2xl shadow-primary-500/30"
            >
              Submit Session
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              disabled={!answers[currentQuestion.id]}
              className="w-full sm:w-64 py-6 rounded-[2rem] font-black text-lg shadow-2xl shadow-primary-500/30"
            >
              Advance Next <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirm Submissi