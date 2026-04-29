/**
 * Learning Hub - Quiz System
 * Interactive quiz functionality with timer, scoring, results, and answer review
 */

// Quiz Data
const quizData = {
    python: {
        title: 'Python Fundamentals',
        questions: [
            {
                question: 'What is the correct way to declare a variable in Python?',
                options: ['var x = 5', 'let x = 5', 'x = 5', 'int x = 5'],
                correct: 2
            },
            {
                question: 'Which of the following is a valid Python list?',
                options: ['[1, 2, 3]', '{1, 2, 3}', '(1, 2, 3)', '<1, 2, 3>'],
                correct: 0
            },
            {
                question: 'What does the "len()" function return?',
                options: ['The type of an object', 'The length of an object', 'The last element', 'The first element'],
                correct: 1
            },
            {
                question: 'Which keyword is used to define a function in Python?',
                options: ['function', 'func', 'def', 'define'],
                correct: 2
            },
            {
                question: 'What is the output of print(2 ** 3)?',
                options: ['6', '8', '5', '9'],
                correct: 1
            },
            {
                question: 'Which method adds an element to the end of a list?',
                options: ['insert()', 'append()', 'add()', 'push()'],
                correct: 1
            },
            {
                question: 'What is the correct file extension for Python files?',
                options: ['.python', '.pyt', '.py', '.p'],
                correct: 2
            },
            {
                question: 'How do you start a comment in Python?',
                options: ['//', '/*', '#', '--'],
                correct: 2
            },
            {
                question: 'Which of these is a Python tuple?',
                options: ['[1, 2, 3]', '{1, 2, 3}', '(1, 2, 3)', '<1, 2, 3>'],
                correct: 2
            },
            {
                question: 'What is the output of bool(0)?',
                options: ['True', 'False', '0', 'None'],
                correct: 1
            }
        ]
    },
    javascript: {
        title: 'JavaScript Mastery',
        questions: [
            {
                question: 'Which company developed JavaScript?',
                options: ['Microsoft', 'Netscape', 'Google', 'Apple'],
                correct: 1
            },
            {
                question: 'What is the correct syntax for referring to an external script?',
                options: ['<script href="x.js">', '<script name="x.js">', '<script src="x.js">', '<script file="x.js">'],
                correct: 2
            },
            {
                question: 'How do you write "Hello World" in an alert box?',
                options: ['msg("Hello World")', 'alertBox("Hello World")', 'alert("Hello World")', 'msgBox("Hello World")'],
                correct: 2
            },
            {
                question: 'Which operator is used for strict equality?',
                options: ['==', '===', '=', '!='],
                correct: 1
            },
            {
                question: 'What is the output of typeof []?',
                options: ['array', 'object', 'list', 'undefined'],
                correct: 1
            },
            {
                question: 'Which method converts JSON to a JavaScript object?',
                options: ['JSON.parse()', 'JSON.stringify()', 'JSON.convert()', 'JSON.object()'],
                correct: 0
            },
            {
                question: 'What does "const" mean in JavaScript?',
                options: ['Constant variable', 'Constructor', 'Continue', 'Container'],
                correct: 0
            },
            {
                question: 'Which ES6 feature allows multi-line strings?',
                options: ['Single quotes', 'Double quotes', 'Template literals', 'Backticks'],
                correct: 2
            },
            {
                question: 'What is the result of 5 + "5"?',
                options: ['10', '55', 'Error', 'NaN'],
                correct: 1
            },
            {
                question: 'Which method adds elements to the beginning of an array?',
                options: ['push()', 'unshift()', 'shift()', 'pop()'],
                correct: 1
            }
        ]
    },
    ml: {
        title: 'Machine Learning Basics',
        questions: [
            {
                question: 'What type of learning uses labeled data?',
                options: ['Unsupervised', 'Supervised', 'Reinforcement', 'Semi-supervised'],
                correct: 1
            },
            {
                question: 'Which algorithm is used for classification?',
                options: ['Linear Regression', 'K-Means', 'Decision Tree', 'PCA'],
                correct: 2
            },
            {
                question: 'What does CNN stand for?',
                options: ['Computer Neural Network', 'Convolutional Neural Network', 'Connected Neural Network', 'Core Neural Network'],
                correct: 1
            },
            {
                question: 'What is overfitting?',
                options: ['Model performs poorly on training data', 'Model performs well on all data', 'Model memorizes training data', 'Model is too simple'],
                correct: 2
            },
            {
                question: 'Which metric is used for classification accuracy?',
                options: ['MSE', 'RMSE', 'F1 Score', 'R-squared'],
                correct: 2
            },
            {
                question: 'What is the purpose of a validation set?',
                options: ['Train the model', 'Test final performance', 'Tune hyperparameters', 'Store data'],
                correct: 2
            },
            {
                question: 'Which activation function is commonly used in output layer for binary classification?',
                options: ['ReLU', 'Tanh', 'Sigmoid', 'Softmax'],
                correct: 2
            },
            {
                question: 'What is gradient descent used for?',
                options: ['Data preprocessing', 'Model optimization', 'Feature selection', 'Data visualization'],
                correct: 1
            },
            {
                question: 'Which technique helps prevent overfitting?',
                options: ['Increasing model complexity', 'Regularization', 'Using more features', 'Training longer'],
                correct: 1
            },
            {
                question: 'What is a hyperparameter?',
                options: ['Learned from data', 'Set before training', 'Output of model', 'Type of layer'],
                correct: 1
            }
        ]
    },
    dsa: {
        title: 'Data Structures & Algorithms',
        questions: [
            {
                question: 'What is the time complexity of binary search?',
                options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
                correct: 1
            },
            {
                question: 'Which data structure uses LIFO?',
                options: ['Queue', 'Stack', 'Array', 'Tree'],
                correct: 1
            },
            {
                question: 'What is the worst-case time complexity of quicksort?',
                options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
                correct: 2
            },
            {
                question: 'Which traversal visits root first?',
                options: ['Inorder', 'Preorder', 'Postorder', 'Level order'],
                correct: 1
            },
            {
                question: 'What data structure is used for BFS?',
                options: ['Stack', 'Queue', 'Array', 'Heap'],
                correct: 1
            },
            {
                question: 'What is the space complexity of merge sort?',
                options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
                correct: 2
            },
            {
                question: 'Which data structure is best for priority scheduling?',
                options: ['Array', 'Stack', 'Heap', 'Queue'],
                correct: 2
            },
            {
                question: 'What is a hash collision?',
                options: ['Hash table overflow', 'Two keys map to same index', 'Empty hash bucket', 'Hash function error'],
                correct: 1
            },
            {
                question: 'Which algorithm finds shortest path?',
                options: ['DFS', 'Bubble Sort', 'Dijkstra', 'Binary Search'],
                correct: 2
            },
            {
                question: 'What is the height of a balanced BST with n nodes?',
                options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
                correct: 1
            }
        ]
    }
};

// Quiz State
let currentQuiz = null;
let currentQuestion = 0;
let userAnswers = [];
let timerInterval = null;
let timeRemaining = 0;
let startTime = null;

// Start Quiz
function startQuiz(quizId) {
    currentQuiz = quizData[quizId];
    if (!currentQuiz) return;

    currentQuestion = 0;
    userAnswers = new Array(currentQuiz.questions.length).fill(null);
    timeRemaining = currentQuiz.questions.length * 60; // 1 min per question
    startTime = Date.now();

    // Show modal
    document.getElementById('quizModal').style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Start timer
    startTimer();

    // Render first question
    renderQuestion();
}

// Render Question
function renderQuestion() {
    const question = currentQuiz.questions[currentQuestion];
    const questionEl = document.getElementById('quizQuestion');

    // Update progress
    document.getElementById('questionNumber').textContent =
        `Question ${currentQuestion + 1}/${currentQuiz.questions.length}`;
    document.getElementById('progressFill').style.width =
        `${((currentQuestion + 1) / currentQuiz.questions.length) * 100}%`;

    // Render question and options
    questionEl.innerHTML = `
        <h3>${question.question}</h3>
        <div class="quiz-options">
            ${question.options.map((opt, i) => `
                <div class="quiz-option ${userAnswers[currentQuestion] === i ? 'selected' : ''}"
                     onclick="selectOption(this, ${i})">
                    <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                    <span>${opt}</span>
                </div>
            `).join('')}
        </div>
    `;

    // Update buttons
    document.getElementById('prevBtn').disabled = currentQuestion === 0;

    const nextBtn = document.getElementById('nextBtn');
    if (currentQuestion === currentQuiz.questions.length - 1) {
        nextBtn.innerHTML = 'Submit <i class="fas fa-check"></i>';
    } else {
        nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
    }
}

// Select Option
function selectOption(element, index) {
    // Remove previous selection
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // Add new selection
    element.classList.add('selected');
    userAnswers[currentQuestion] = index;
}

// Navigate Questions
function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
}

function nextQuestion() {
    if (currentQuestion < currentQuiz.questions.length - 1) {
        currentQuestion++;
        renderQuestion();
    } else {
        // Submit quiz
        submitQuiz();
    }
}

// Timer
function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            submitQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        // Warning color when low time
        display.style.color = timeRemaining < 60 ? '#ef4444' : '';
    }
}

// Submit Quiz
function submitQuiz() {
    clearInterval(timerInterval);

    // Calculate score
    let correct = 0;
    currentQuiz.questions.forEach((q, i) => {
        if (userAnswers[i] === q.correct) {
            correct++;
        }
    });

    const total = currentQuiz.questions.length;
    const percentage = Math.round((correct / total) * 100);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;

    // Update results
    const resultsIcon = document.getElementById('resultsIcon');
    const resultsTitle = document.getElementById('resultsTitle');
    const resultsMessage = document.getElementById('resultsMessage');

    if (percentage >= 80) {
        resultsIcon.textContent = '🎉';
        resultsTitle.textContent = 'Excellent!';
        resultsMessage.textContent = `You scored ${correct} out of ${total}! Outstanding performance!`;
    } else if (percentage >= 60) {
        resultsIcon.textContent = '👍';
        resultsTitle.textContent = 'Good Job!';
        resultsMessage.textContent = `You scored ${correct} out of ${total}. Keep practicing!`;
    } else {
        resultsIcon.textContent = '📚';
        resultsTitle.textContent = 'Keep Learning!';
        resultsMessage.textContent = `You scored ${correct} out of ${total}. Review the material and try again!`;
    }

    document.getElementById('scorePercent').textContent = `${percentage}%`;
    document.getElementById('timeTaken').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('correctCount').textContent = `${correct}/${total}`;

    // Hide quiz, show results
    document.getElementById('quizModal').style.display = 'none';
    document.getElementById('resultsModal').style.display = 'block';
}

// Review Answers
function reviewAnswers() {
    const reviewModal = document.getElementById('reviewModal');
    const reviewContent = document.getElementById('reviewContent');
    if (!reviewModal || !reviewContent || !currentQuiz) return;

    let html = '';
    currentQuiz.questions.forEach((q, i) => {
        const userAnswer = userAnswers[i];
        const isCorrect = userAnswer === q.correct;
        const statusClass = isCorrect ? 'review-correct' : 'review-incorrect';
        const statusIcon = isCorrect ? 'fa-check-circle' : 'fa-times-circle';
        const statusColor = isCorrect ? '#10b981' : '#ef4444';

        html += `
            <div class="review-question ${statusClass}" style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-lg); margin-bottom: var(--space-md); border-left: 4px solid ${statusColor};">
                <div style="display: flex; align-items: flex-start; gap: var(--space-md); margin-bottom: var(--space-md);">
                    <i class="fas ${statusIcon}" style="color: ${statusColor}; font-size: 1.25rem; margin-top: 2px;"></i>
                    <div>
                        <strong style="font-size: 0.875rem; color: var(--text-muted);">Question ${i + 1}</strong>
                        <p style="margin: var(--space-xs) 0 0; font-weight: 600;">${q.question}</p>
                    </div>
                </div>
                <div style="margin-left: 2rem;">
                    ${q.options.map((opt, j) => {
                        let optStyle = 'padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-xs); font-size: 0.9rem;';
                        if (j === q.correct) {
                            optStyle += ' background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 600;';
                        } else if (j === userAnswer && j !== q.correct) {
                            optStyle += ' background: rgba(239, 68, 68, 0.15); color: #dc2626; text-decoration: line-through;';
                        } else {
                            optStyle += ' color: var(--text-secondary);';
                        }
                        const letter = String.fromCharCode(65 + j);
                        const icon = j === q.correct ? ' ✓' : (j === userAnswer && j !== q.correct ? ' ✗' : '');
                        return `<div style="${optStyle}">${letter}. ${opt}${icon}</div>`;
                    }).join('')}
                    ${userAnswer === null ? '<div style="color: #f59e0b; font-size: 0.85rem; margin-top: var(--space-sm);"><i class="fas fa-exclamation-triangle"></i> Not answered</div>' : ''}
                </div>
            </div>
        `;
    });

    reviewContent.innerHTML = html;
    document.getElementById('resultsModal').style.display = 'none';
    reviewModal.style.display = 'block';
}

// Close Review
function closeReview() {
    document.getElementById('reviewModal').style.display = 'none';
    document.body.style.overflow = '';
}

// Close Quiz
function closeQuiz() {
    clearInterval(timerInterval);
    document.getElementById('quizModal').style.display = 'none';
    document.body.style.overflow = '';
    currentQuiz = null;
}

// Close Results
function closeResults() {
    document.getElementById('resultsModal').style.display = 'none';
    document.body.style.overflow = '';
}

// Retry Quiz
function retryQuiz() {
    document.getElementById('resultsModal').style.display = 'none';

    // Find quiz id
    const quizId = Object.keys(quizData).find(key => quizData[key] === currentQuiz);
    if (quizId) {
        startQuiz(quizId);
    }
}

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    if (!currentQuiz) return;

    if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        const options = document.querySelectorAll('.quiz-option');
        if (options[index]) {
            selectOption(options[index], index);
        }
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextQuestion();
    } else if (e.key === 'ArrowLeft') {
        prevQuestion();
    } else if (e.key === 'Escape') {
        closeQuiz();
        closeResults();
        closeReview();
    }
});
