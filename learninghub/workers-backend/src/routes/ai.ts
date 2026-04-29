import { createJSONResponse, createErrorResponse } from '../utils/helpers';
import { verifyToken } from '../middleware/auth';
import { fetchWithTimeout, TIMEOUTS, TimeoutError } from '../utils/timeout';
import { Env } from '../types';

export async function handleAI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Check if AI service is configured
  if (!env.HUGGINGFACE_API_KEY) {
    return createErrorResponse(
      'AI service not configured. Please set HUGGINGFACE_API_KEY.',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }
  const apiKey = env.HUGGINGFACE_API_KEY; // Type is now string

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // Analyze quiz performance
  if (path === '/ai/analyze' && method === 'POST') {
    return handleAnalyze(request, env, apiKey);
  }

  // Get course recommendations
  if (path === '/ai/recommend' && method === 'POST') {
    return handleRecommend(request, env, apiKey);
  }

  // Summarize content
  if (path === '/ai/summarize' && method === 'POST') {
    return handleSummarize(request, env, apiKey);
  }

  return createErrorResponse('Not found', 404);
}

async function handleAnalyze(request: Request, env: Env, apiKey: string): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, env.JWT_SECRET);

    if (!payload) {
      return createErrorResponse('Invalid token', 401);
    }

    const body = await request.json();
    const { quizTitle, score, totalPossible, incorrectAnswers, topics } = body;

    // Build prompt for analysis
    const prompt = `As an AI tutor, analyze this quiz performance and provide constructive feedback:

Quiz: ${quizTitle || 'Recent Quiz'}
Score: ${score}/${totalPossible} (${Math.round((score/totalPossible)*100)}%)
Incorrect Topics: ${topics?.join(', ') || 'Various topics'}

Based on this performance, provide:
1. Strengths (what they did well)
2. Areas for improvement
3. Specific study recommendations
4. Encouraging words

Keep it concise (3-4 sentences) and motivating.`;

    // Call Hugging Face API
    const analysis = await callHuggingFace(prompt, apiKey);

    return createJSONResponse({
      analysis: analysis || 'Great effort! Review the topics you missed and try again.',
      score,
      totalPossible,
      percentage: Math.round((score/totalPossible)*100)
    });

  } catch (error) {
    console.error('AI analyze error:', error);
    // Return fallback response
    return createJSONResponse({
      analysis: 'Keep practicing! Every attempt helps you improve.',
      fallback: true
    });
  }
}

async function handleRecommend(request: Request, env: Env, apiKey: string): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, env.JWT_SECRET);

    if (!payload) {
      return createErrorResponse('Invalid token', 401);
    }

    const body = await request.json();
    const { completedCourses, interests, skillLevel } = body;

    const prompt = `As a learning advisor, recommend 3-5 courses based on:

Completed: ${completedCourses?.join(', ') || 'None'}
Interests: ${interests?.join(', ') || 'Programming'}
Skill Level: ${skillLevel || 'Beginner'}

Suggest specific next courses to take. Format as a simple list.`;

    const recommendations = await callHuggingFace(prompt, apiKey);

    return createJSONResponse({
      recommendations: recommendations || 'Try exploring courses in your areas of interest.',
      basedOn: { completedCourses, interests, skillLevel }
    });

  } catch (error) {
    console.error('AI recommend error:', error);
    return createJSONResponse({
      recommendations: 'Explore our course catalog to find your next learning path!',
      fallback: true
    });
  }
}

async function handleSummarize(request: Request, env: Env, apiKey: string): Promise<Response> {
  try {
    const body = await request.json();
    const { content, maxLength = 100 } = body;

    if (!content || content.length < 50) {
      return createErrorResponse('Content too short to summarize', 400);
    }

    const prompt = `Summarize this learning content in ${maxLength} words or less:

${content.substring(0, 2000)}

Provide key points only.`;

    const result = await callHuggingFace(prompt, apiKey);

    return createJSONResponse({
      result: result || 'No response from AI',
      type: 'chat'
    });

  } catch (error) {
    console.error('AI summarize error:', error);
    return createErrorResponse('Failed to generate summary', 500);
  }
}

async function callHuggingFace(prompt: string, apiKey: string): Promise<string | null> {
  try {
    // Using Hugging Face Inference API with a smaller, faster model
    // For production, consider using a dedicated endpoint
    const response = await fetchWithTimeout(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: `<s>[INST] ${prompt} [/INST]`,
          parameters: {
            max_new_tokens: 200,
            temperature: 0.7,
            return_full_text: false
          }
        })
      },
      TIMEOUTS.HUGGING_FACE
    );

    if (!response.ok) {
      // If model is loading or rate limited, return null
      if (response.status === 503 || response.status === 429) {
        console.log('Hugging Face API temporarily unavailable');
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text.trim();
    }
    
    return null;

  } catch (error) {
    console.error('Hugging Face API error:', error);
    return null;
  }
}
