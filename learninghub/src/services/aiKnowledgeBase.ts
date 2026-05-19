/**
 * AI Knowledge Base for LearningHub AI Tutor
 * Rule-based responses for MVP - no API costs
 */

export interface KnowledgeEntry {
  keywords: string[]
  response: string
  followUp?: string[]
  codeExample?: string
}

export const KNOWLEDGE_BASE: Record<string, KnowledgeEntry[]> = {
  greetings: [
    {
      keywords: [
        'hello',
        'hi',
        'hey',
        'greetings',
        'good morning',
        'good afternoon',
        'good evening',
      ],
      response: `👋 Welcome to LearningHub AI Tutor! 

I can help you with:
• Programming concepts (JavaScript, Python, React, etc.)
• Code debugging and problem-solving
• Learning path recommendations
• Interview preparation
• Project guidance

What would you like to learn about today?`,
      followUp: [
        'What programming language should I start with?',
        'How do I debug errors?',
        'Help me with a project idea',
      ],
    },
    {
      keywords: ['how are you', "what's up", 'how is it going'],
      response: `I'm ready to help you learn! 🤖

As your AI tutor, I'm here 24/7 to:
• Explain complex concepts simply
• Provide code examples
• Answer your coding questions
• Guide your learning journey

What topic are you studying right now?`,
    },
  ],

  javascript: [
    {
      keywords: ['javascript', 'js', 'what is javascript'],
      response: `**JavaScript** is the programming language of the web! 🌐

**Key Concepts:**
1. **Variables**: 
   - \`let\` — block-scoped, reassignable
   - \`const\` — block-scoped, cannot be reassigned
   - \`var\` — function-scoped (legacy, avoid)
2. **Functions**: 
   - Regular: \`function name() {}\`
   - Arrow: \`const name = () => {}\`
3. **Arrays**: Ordered lists with methods like map, filter, reduce
4. **Objects**: Key-value pairs for structured data
5. **Async**: Promises, async/await for non-blocking code

**Why Learn JavaScript?**
• Runs in every browser
• Full-stack (frontend + backend with Node.js)
• Huge ecosystem (React, Vue, Angular)
• High job demand

Want me to explain any of these concepts deeper?`,
      codeExample: `// Variables
let name = "Alice";
const age = 25;

// Function
const greet = (name) => {
  return \`Hello, \${name}!\`;
};

// Array methods
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]`,
      followUp: [
        'Explain async/await',
        'How do closures work?',
        'Show me array methods',
        'What is the DOM?',
      ],
    },
    {
      keywords: ['async', 'await', 'promise', 'asynchronous', 'callback'],
      response: `**Asynchronous JavaScript** handles operations that take time (API calls, file reading). ⏱️

**The Problem:**
JavaScript is single-threaded. Without async, long operations block everything.

**The Solution - 3 Approaches:**

1. **Callbacks** (Old way):
   \`\`\`javascript
   getData(function(result) {
     console.log(result);
   });
   \`\`\`

2. **Promises** (Better):
   \`\`\`javascript
   getData()
     .then(result => console.log(result))
     .catch(error => console.error(error));
   \`\`\`

3. **Async/Await** (Modern & Clean):
   \`\`\`javascript
   async function fetchData() {
     try {
       const result = await getData();
       console.log(result);
     } catch (error) {
       console.error(error);
     }
   }
   \`\`\`

**Key Points:**
• \`await\` can only be used inside \`async\` functions
• \`async\` functions always return a Promise
• Use \`try/catch\` for error handling with async/await
• Multiple awaits run sequentially — use \`Promise.all()\` for parallel execution`,
      codeExample: `// Real-world example: Fetching API data
async function getUserProfile(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    
    if (!response.ok) {
      throw new Error('User not found');
    }
    
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

// Usage
getUserProfile(123).then(user => {
  if (user) {
    console.log(\`Welcome, \${user.name}!\`);
  }
});`,
      followUp: [
        'Show me Promise.all()',
        'How to handle multiple API calls?',
        'Explain error handling',
        'What is event loop?',
      ],
    },
    {
      keywords: ['array', 'array methods', 'map', 'filter', 'reduce', 'forEach'],
      response: `**JavaScript Array Methods** - Essential tools for data manipulation 🛠️

**Most Important Methods:**

1. **map()** - Transform each item
   \`\`\`javascript
   const doubled = [1, 2, 3].map(x => x * 2);
   // [2, 4, 6]
   \`\`\`

2. **filter()** - Keep items that match condition
   \`\`\`javascript
   const evens = [1, 2, 3, 4].filter(x => x % 2 === 0);
   // [2, 4]
   \`\`\`

3. **reduce()** - Combine all items into one value
   \`\`\`javascript
   const sum = [1, 2, 3, 4].reduce((acc, x) => acc + x, 0);
   // 10
   \`\`\`

4. **find()** - Get first matching item
   \`\`\`javascript
   const user = users.find(u => u.id === 123);
   \`\`\`

5. **some()/every()** - Test conditions
   \`\`\`javascript
   const hasAdults = people.some(p => p.age >= 18);
   const allAdults = people.every(p => p.age >= 18);
   \`\`\``,
      codeExample: `// Practical example: Processing user data
const users = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 17, active: false },
  { name: 'Carol', age: 30, active: true }
];

// Get names of active adult users
const activeAdults = users
  .filter(u => u.active && u.age >= 18)
  .map(u => u.name);

console.log(activeAdults); // ['Alice', 'Carol']

// Calculate average age
const avgAge = users
  .reduce((sum, u) => sum + u.age, 0) / users.length;

console.log(\`Average age: \${avgAge}\`); // 24`,
      followUp: [
        'When to use reduce vs for loop?',
        'Explain array destructuring',
        'How to flatten arrays?',
        'Show me findIndex method',
      ],
    },
  ],

  react: [
    {
      keywords: ['react', 'what is react', 'reactjs', 'react.js'],
      response: `**React** is a JavaScript library for building user interfaces - developed by Facebook! ⚛️

**Core Concepts:**

1. **Components** - Reusable UI building blocks
   \`\`\`jsx
   function Welcome({ name }) {
     return <h1>Hello, {name}!</h1>;
   }
   \`\`\`

2. **JSX** - HTML-like syntax in JavaScript
    - Looks like HTML, but it's JavaScript
    - Must return single parent element (or fragment \`<>\`)
    - Use \`className\` instead of \`class\`

3. **Props** - Pass data to components
   - Read-only (immutable)
   - Flows parent → child
   
4. **State** - Manage dynamic data
   - useState hook for functional components
   - Triggers re-render when changed
   
5. **Hooks** - Functions that hook into React features
   - useState, useEffect, useContext, etc.

**Why React?**
• Component-based architecture
• Virtual DOM = fast updates
• Huge ecosystem & community
• React Native for mobile apps
• Used by Netflix, Airbnb, Instagram`,
      codeExample: `// Complete React Component Example
import { useState, useEffect } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);
  
  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}

export default Counter;`,
      followUp: [
        'Explain useEffect hook',
        'What are React hooks?',
        'How to pass data between components?',
        'Explain React Router',
        'Show me useContext example',
      ],
    },
    {
      keywords: ['useEffect', 'effect hook', 'side effects', 'lifecycle'],
      response: `**useEffect** - Handle side effects in functional components 🔄

**What are side effects?**
• Data fetching
• DOM manipulation
• Subscriptions
• Timers

**Basic Syntax:**
\`\`\`javascript
useEffect(() => {
  // Side effect code here
  
  return () => {
    // Cleanup (optional)
  };
}, [dependencies]);
\`\`\`

**Dependency Array Rules:**
• **[]** (empty) = Run once on mount
• **[prop]** = Run when prop changes
• **No array** = Run on every render

**Common Patterns:**

1. **Data Fetching:**
\`\`\`javascript
useEffect(() => {
  fetchUser(userId).then(setUser);
}, [userId]);
\`\`\`

2. **Event Listeners:**
\`\`\`javascript
useEffect(() => {
  const handler = () => console.log('resize');
  window.addEventListener('resize', handler);
  
  return () => window.removeEventListener('resize', handler);
}, []);
\`\`\`

3. **Subscriptions:**
\`\`\`javascript
useEffect(() => {
  const subscription = api.subscribe(data);
  
  return () => subscription.unsubscribe();
}, []);
\`\`\``,
      codeExample: `// Complete useEffect Example
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch user when ID changes
  useEffect(() => {
    let cancelled = false;
    
    async function loadUser() {
      setLoading(true);
      const data = await fetchUser(userId);
      
      if (!cancelled) {
        setUser(data);
        setLoading(false);
      }
    }
    
    loadUser();
    
    // Cleanup: prevent state updates if unmounted
    return () => {
      cancelled = true;
    };
  }, [userId]);
  
  if (loading) return <p>Loading...</p>;
  return <div>Welcome, {user.name}!</div>;
}`,
      followUp: [
        'Explain useState hook',
        'When to use useLayoutEffect?',
        'How to optimize useEffect?',
        'Explain custom hooks',
      ],
    },
  ],

  python: [
    {
      keywords: ['python', 'what is python', 'python basics'],
      response: `**Python** is a beginner-friendly, powerful programming language! 🐍

**Why Python?**
• Clean, readable syntax
• Huge standard library
• Popular for: Web, Data Science, AI/ML, Automation
• Strong community support

**Basic Syntax:**
\`\`\`python
# Variables (no type declarations!)
name = "Alice"
age = 25
pi = 3.14159
is_student = True

# Lists (like arrays)
fruits = ["apple", "banana", "cherry"]
fruits.append("orange")

# Dictionaries (key-value pairs)
user = {
    "name": "Bob",
    "age": 30,
    "city": "New York"
}

# Functions
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))  # Hello, World!

# List comprehension
squares = [x**2 for x in range(10)]
print(squares)  # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
\`\`\``,
      codeExample: `# Practical Python Example: File Processor
import json
from datetime import datetime

def process_data(filename):
    """Read JSON, analyze, save results"""
    
    # Read data
    with open(filename, 'r') as f:
        data = json.load(f)
    
    # Analyze
    total = sum(item['price'] for item in data)
    average = total / len(data)
    
    # Results
    results = {
        'processed_at': datetime.now().isoformat(),
        'total_items': len(data),
        'total_value': total,
        'average_price': round(average, 2),
        'high_value_items': [
            item for item in data 
            if item['price'] > average
        ]
    }
    
    # Save
    with open('results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return results

# Usage
stats = process_data('sales_data.json')
print(f"Processed {stats['total_items']} items")`,
      followUp: [
        'Explain list comprehensions',
        'Show me Python classes',
        'How to handle files?',
        'Explain Python decorators',
        'What is PEP 8?',
      ],
    },
    {
      keywords: ['flask', 'django', 'python web', 'web framework python'],
      response: `**Python Web Frameworks** - Flask vs Django 🌐

**Flask** (Micro Framework)
• Minimal, flexible
• You add what you need
• Great for small apps, APIs
• Learning curve: Easy

\`\`\`python
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/users/<id>')
def get_user(id):
    return jsonify({'id': id, 'name': 'Alice'})

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

**Django** (Full-Featured)
• "Batteries included"
• ORM, Auth, Admin built-in
• Great for large applications
• Learning curve: Steeper

\`\`\`python
# Django views.py
from django.http import JsonResponse

def get_user(request, user_id):
    user = User.objects.get(id=user_id)
    return JsonResponse({
        'id': user.id,
        'name': user.name
    })
\`\`\`

**Choose Flask if:**
• Small/medium project
• Want control over components
• Building REST API
• Learning web development

**Choose Django if:**
• Large application
• Need admin interface
• Want built-in security features
• Building content management system`,
      followUp: [
        'Show me Flask SQLAlchemy',
        'Explain Django ORM',
        'How to deploy Python web apps?',
        'Python vs Node.js backend?',
      ],
    },
  ],

  css: [
    {
      keywords: ['css', 'css3', 'styling', 'styles', 'cascading style sheets'],
      response: `**CSS** - Style and layout for web pages 🎨

**Core Concepts:**

1. **Selectors** - Target HTML elements
   \`\`\`css
   /* Element */
   p { color: blue; }
   
   /* Class */
   .highlight { background: yellow; }
   
   /* ID */
   #header { font-size: 24px; }
   
   /* Attribute */
   [type="text"] { border: 1px solid gray; }
   \`\`\`

2. **Box Model** - Every element is a box
    - **content** → the actual text/image
    - **padding** → space between content and border
    - **border** → line around padding
    - **margin** → space outside border

3. **Flexbox** - 1D layout
   \`\`\`css
   .container {
     display: flex;
     justify-content: center; /* horizontal */
     align-items: center;      /* vertical */
     gap: 20px;
   }
   \`\`\`

4. **Grid** - 2D layout
   \`\`\`css
   .grid {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     gap: 20px;
   }
   \`\`\`

5. **Responsive Design**
   \`\`\`css
   @media (max-width: 768px) {
     .sidebar { display: none; }
   }
   \`\`\``,
      codeExample: `/* Modern CSS Example */
.card {
  /* Layout */
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  /* Box model */
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  
  /* Visual */
  background: white;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  
  /* Animation */
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .card {
    background: #1f2937;
    border-color: #374151;
    color: white;
  }
}`,
      followUp: [
        'Explain CSS Grid',
        'Show me Flexbox examples',
        'What is CSS specificity?',
        'How to center a div?',
        'Explain CSS animations',
      ],
    },
    {
      keywords: ['tailwind', 'tailwindcss', 'utility css'],
      response: `**Tailwind CSS** - Utility-first CSS framework 🎯

**What is utility-first?**
Instead of writing CSS classes like 

**Basic Example:**
\`\`\`html
<!-- Without Tailwind -->
<style>
  .btn {
    background: blue;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
  }
</style>
<button class="btn">Click me</button>

<!-- With Tailwind -->
<button class="bg-blue-500 text-white px-4 py-2 rounded">
  Click me
</button>
\`\`\`

**Common Utilities:**
• Layout: \`flex\`, \`grid\`, \`block\`, \`inline-block\`
• Spacing: \`p-4\` (padding), \`m-2\` (margin), \`gap-3\`
• Colors: \`bg-blue-500\`, \`text-white\`, \`border-gray-300\`
• Typography: \`text-lg\`, \`font-bold\`, \`tracking-wide\`
• Effects: \`shadow-lg\`, \`rounded-xl\`, \`opacity-75\`

**Responsive Prefixes:**
\`\`\`html
<div class="w-full md:w-1/2 lg:w-1/3">
  <!-- Full width mobile, half tablet, third desktop -->
</div>
\`\`\`

**Why Tailwind?**
✅ Faster development
✅ Consistent design system
✅ Smaller bundle (purges unused styles)
✅ Easy customization
✅ Great documentation`,
      codeExample: `<!-- Complete Tailwind Component -->
<div class="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden md:max-w-2xl">
  <div class="md:flex">
    <div class="md:shrink-0">
      <img class="h-48 w-full object-cover md:h-full md:w-48" 
           src="/img/building.jpg" alt="Building">
    </div>
    <div class="p-8">
      <div class="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
        Case Study
      </div>
      <h2 class="block mt-1 text-lg leading-tight font-medium text-black">
        Finding customers for your new business
      </h2>
      <p class="mt-2 text-slate-500">
        Getting a new business off the ground is a lot of hard work...
      </p>
      <button class="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg 
                     hover:bg-indigo-600 transition-colors">
        Read More
      </button>
    </div>
  </div>
</div>`,
      followUp: [
        'How to customize Tailwind?',
        'Tailwind vs Bootstrap?',
        'Explain JIT mode',
        'Show me dark mode with Tailwind',
      ],
    },
  ],

  html: [
    {
      keywords: ['html', 'html5', 'hypertext markup language'],
      response: `**HTML** - Structure of web pages 🏗️

**Essential Elements:**

1. **Document Structure**
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
</head>
<body>
    <!-- Content goes here -->
</body>
</html>
\`\`\`

2. **Common Tags**
• \`<h1>\` to \`<h6>\` - Headings (h1 = largest)
• \`<p>\` - Paragraph
• \`<div>\` - Division (block container)
• \`<span>\` - Span (inline container)
• \`<ul>\` / \`<ol>\` - Unordered/Ordered list
• \`<img>\` - Image
• \`<a>\` - Anchor (link)
• \`<form>\` / \`<input>\` - Form inputs

3. **Semantic HTML5**
\`\`\`html
<header>  <!-- Page/section header -->
<nav>     <!-- Navigation links -->
<main>    <!-- Main content -->
<article> <!-- Self-contained content -->
<section> <!-- Thematic grouping -->
<aside>   <!-- Sidebar content -->
<footer>  <!-- Footer content -->
\`\`\`

**Best Practices:**
✅ Use semantic elements
✅ Always include alt text for images
✅ Use proper heading hierarchy (h1 → h2 → h3)
✅ Make forms accessible with labels`,
      codeExample: `<!-- Semantic HTML Example -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Blog</title>
</head>
<body>
    <header>
        <h1>My Tech Blog</h1>
        <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
        </nav>
    </header>
    
    <main>
        <article>
            <header>
                <h2>Learning HTML</h2>
                <time datetime="2024-01-15">Jan 15, 2024</time>
            </header>
            
            <p>HTML is the foundation of the web...</p>
            
            <figure>
                <img src="html-diagram.png" alt="HTML structure diagram">
                <figcaption>Figure 1: HTML Document Structure</figcaption>
            </figure>
        </article>
    </main>
    
    <footer>
        <p>&copy; 2024 My Blog</p>
    </footer>
</body>
</html>`,
      followUp: [
        'Explain semantic HTML',
        'What are data attributes?',
        'How to make accessible forms?',
        'Explain meta tags',
        'HTML vs JSX?',
      ],
    },
  ],

  general: [
    {
      keywords: ['debug', 'debugging', 'error', 'fix error', 'troubleshoot'],
      response: `**Debugging Strategies** 🐛

**1. Read Error Messages Carefully**
• Line number
• Error type (SyntaxError, TypeError, ReferenceError)
• Stack trace

**2. Console.log() Debugging**
\`\`\`javascript
console.log('Value:', value);
console.log('Type:', typeof value);
console.log('Keys:', Object.keys(obj));
console.table(array);  // Nice table format
\`\`\`

**3. Use Debugger**
\`\`\`javascript
function calculate(x) {
  debugger;  // Execution pauses here
  return x * 2;
}
\`\`\`

**4. Common Errors & Fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| undefined is not a function | Calling non-function | Check variable type |
| Cannot read property 'x' of undefined | Accessing property on null/undefined | Add null checks |
| ReferenceError: x is not defined | Variable doesn't exist | Declare variable |
| SyntaxError | Missing bracket/paren | Check syntax carefully |

**5. Binary Search Method**
• Comment out half the code
• If error persists, problem is in other half
• Repeat until isolated

**6. Rubber Duck Debugging**
• Explain code line by line to an object
• Often you'll spot the issue yourself!`,
      followUp: [
        'Show me Chrome DevTools tips',
        'How to debug React?',
        'Explain error boundaries',
        'What are linters?',
      ],
    },
    {
      keywords: ['learn', 'learning path', 'where to start', 'roadmap', 'career'],
      response: `**Programming Learning Path** 🗺️

**Phase 1: Fundamentals (2-3 months)**
1. HTML & CSS (2 weeks)
   - Semantic HTML
   - CSS basics + Flexbox/Grid
   - Build static websites

2. JavaScript Basics (4 weeks)
   - Variables, functions, loops
   - Arrays and objects
   - DOM manipulation
   - Events

3. Version Control (1 week)
   - Git basics
   - GitHub

**Phase 2: Frontend (2-3 months)**
1. Advanced JavaScript
   - ES6+ features
   - Async programming
   - Fetch API

2. React
   - Components & JSX
   - Props & State
   - Hooks (useState, useEffect)
   - React Router

3. Build Projects
   - Todo app
   - Weather app
   - Movie search app

**Phase 3: Backend (2-3 months)**
1. Node.js & Express
2. Databases (MongoDB/PostgreSQL)
3. Authentication
4. REST API design

**Phase 4: Full Stack (Ongoing)**
1. Connect frontend + backend
2. Deploy applications
3. Learn TypeScript
4. Testing (Jest, Cypress)

**Practice Tips:**
• Code daily (even 30 minutes)
• Build projects, don't just watch tutorials
• Read others' code on GitHub
• Join coding communities
• Teach what you learn`,
      followUp: [
        'Best JavaScript resources?',
        'How to build a portfolio?',
        'Freelance vs job?',
        'Explain Git workflow',
        'Show me project ideas',
      ],
    },
    {
      keywords: ['project idea', 'project ideas', 'what to build', 'portfolio project'],
      response: `**Project Ideas by Skill Level** 💡

**Beginner (HTML/CSS/JS):**
• Personal portfolio website
• Calculator
• Weather app (API)
• Todo list
• Quiz application
• Countdown timer
• Memory card game
• Currency converter

**Intermediate (React):**
• Movie/TV show database
• Recipe finder with filters
• Chat application (Socket.io)
• E-commerce cart
• Budget tracker
• Notes app with categories
• Password generator
• Pomodoro timer

**Advanced (Full Stack):**
• Blog with CMS
• Social media dashboard
• Job board
• Video conferencing app
• Real-time collaborative editor
• E-commerce platform
• Fitness tracker
• Online code editor

**Portfolio Tips:**
✅ 3-4 quality projects > 10 basic ones
✅ Make them responsive
✅ Deploy and include live links
✅ Write README with screenshots
✅ Include code on GitHub
✅ Show problem-solving process

**Unique Project Angles:**
• Solve a problem YOU have
• Clone a popular app (simplified)
• Combine two unrelated ideas
• Add AI integration (OpenAI API)
• Focus on accessibility
• Build for a specific niche`,
      followUp: [
        'How to deploy projects?',
        'What makes a good README?',
        'How to add OpenAI to projects?',
        'Show me GitHub portfolio tips',
      ],
    },
    {
      keywords: ['interview', 'interview prep', 'coding interview', 'technical interview'],
      response: `**Coding Interview Preparation** 🎯

**Data Structures to Know:**
• Arrays & Strings
• Hash Maps (Objects/Sets)
• Stacks & Queues
• Linked Lists
• Trees & Graphs
• Heaps

**Common Algorithms:**
• Binary Search
• Breadth-First Search (BFS)
• Depth-First Search (DFS)
• Dynamic Programming
• Sorting (QuickSort, MergeSort)
• Two Pointers
• Sliding Window

**Practice Platforms:**
• LeetCode (most popular)
• HackerRank
• CodeSignal
• AlgoExpert
• Pramp (free mock interviews)

**Interview Strategy:**
1. **Understand** - Ask clarifying questions
2. **Examples** - Walk through with sample input
3. **Approach** - Explain your plan before coding
4. **Code** - Write clean, modular code
5. **Test** - Walk through with examples
6. **Optimize** - Discuss time/space complexity

**Behavioral Questions (STAR Method):**
• Situation - Set the context
• Task - Your responsibility
• Action - What you did
• Result - Outcome (quantify!)

**Example:**
"Tell me about a challenging bug"
→ Situation: Production crash
→ Task: Fix within 2 hours
→ Action: Used binary search debugging
→ Result: Fixed in 1 hour, prevented $10k loss`,
      followUp: [
        'Common interview questions?',
        'Explain Big O notation',
        'How to practice whiteboard coding?',
        'System design basics?',
      ],
    },
  ],
}

// Helper function to find best matching response
export function findBestResponse(input: string): KnowledgeEntry | null {
  const normalizedInput = input.toLowerCase().trim()

  for (const category of Object.values(KNOWLEDGE_BASE)) {
    for (const entry of category) {
      // Check if any keyword matches
      const hasKeyword = entry.keywords.some(keyword =>
        normalizedInput.includes(keyword.toLowerCase())
      )

      if (hasKeyword) {
        return entry
      }
    }
  }

  return null
}

// Default fallback responses
export const FALLBACK_RESPONSES = [
  `I don't have specific information about that yet. Here are some topics I can help with:

• JavaScript (async/await, arrays, functions)
• React (hooks, components, state)
• Python (basics, Flask, Django)
• CSS/Tailwind (styling, layouts)
• HTML (structure, semantic elements)
• General (debugging, learning path, projects, interviews)

What would you like to explore?`,

  `That's an interesting question! I'm continuously learning. In the meantime, I can help with:

• Programming fundamentals
• Frontend development
• Backend development
• Career guidance
• Project ideas

What aspect of coding are you working on?`,

  `I want to make sure I give you accurate information. Could you rephrase or tell me more about:

• Which programming language?
• What you're trying to build?
• Where you're stuck?

This will help me provide the most helpful response!`,
]

export function getFallbackResponse(): string {
  const index = Math.floor(Math.random() * FALLBACK_RESPONSES.length)
  // eslint-disable-next-line security/detect-object-injection
  return FALLBACK_RESPONSES[index]
}
