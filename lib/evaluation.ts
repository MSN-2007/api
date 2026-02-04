/**
 * Answer Evaluation System
 * Detects whether answers demonstrate REAL UNDERSTANDING vs shallow knowledge
 */

export interface EvaluationResult {
    understanding_score: number; // 0-100
    ai_generated_probability: number; // 0-100%
    breakdown: {
        consistency_with_readme: number; // 0-25
        specificity: number; // 0-25
        depth_of_reasoning: number; // 0-25
        honesty_and_limitations: number; // 0-25
    };
    flags: string[];
    notes: string[];
    confidence_level: 'low' | 'medium' | 'high';
}

/**
 * Evaluate a technical answer against README and question
 */
export async function evaluateAnswer(
    readme: string,
    question: string,
    answer: string
): Promise<EvaluationResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return createFallbackEvaluation('Gemini API key not configured');
    }

    const prompt = buildEvaluationPrompt(readme, question, answer);

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 2000
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) throw new Error('No response from Gemini');

        const parsed = parseEvaluationResponse(content);
        return validateEvaluation(parsed);
    } catch (error) {
        console.error('Answer evaluation failed:', error);
        const msg = error instanceof Error ? error.message : String(error);
        return createFallbackEvaluation(`Evaluation system error: ${msg}`);
    }
}

function buildEvaluationPrompt(readme: string, question: string, answer: string): string {
    return `You are a hostile technical interviewer.
You are evaluating an answer from a candidate.
Your goal is to detect if the candidate is FAKING understanding or using AI to generate the answer.

CONTEXT:
README: ${readme.slice(0, 10000)}
QUESTION: ${question}
CANDIDATE ANSWER: ${answer}

TASKS:
1. **AI DETECTOR**: Does this answer smell like AI?
   - Signs: "In summary", "However", "In conclusion", bullet points for everything, neutral tone, repeating the question.
   - Assign a probability (0-100%).

2. **BRUTAL GRADING**: Score the understanding (0-100).
   - If they are just paraphrasing the README: Score < 40.
   - If they are using generic "best practices" fluff: Score < 50.
   - If they show deep insight into TRADEOFFS: Score > 80.

OUTPUT JSON (STRICT):
{
  "understanding_score": number,
  "ai_generated_probability": number, // 0-100
  "breakdown": {
    "consistency_with_readme": number, // 0-25
    "specificity": number, // 0-25
    "depth_of_reasoning": number, // 0-25
    "honesty_and_limitations": number // 0-25
  },
  "flags": ["list", "of", "detected", "issues"],
  "notes": ["Brutally honest feedback 1", "Feedback 2"]
}`;
}

function parseEvaluationResponse(content: string): any {
    try {
        let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return {};
    }
}

function validateEvaluation(parsed: any): EvaluationResult {
    return {
        understanding_score: typeof parsed.understanding_score === 'number' ? parsed.understanding_score : 0,
        ai_generated_probability: typeof parsed.ai_generated_probability === 'number' ? parsed.ai_generated_probability : 0,
        breakdown: {
            consistency_with_readme: parsed.breakdown?.consistency_with_readme || 0,
            specificity: parsed.breakdown?.specificity || 0,
            depth_of_reasoning: parsed.breakdown?.depth_of_reasoning || 0,
            honesty_and_limitations: parsed.breakdown?.honesty_and_limitations || 0
        },
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        confidence_level: 'high'
    };
}

function createFallbackEvaluation(reason: string): EvaluationResult {
    return {
        understanding_score: 0,
        ai_generated_probability: 0,
        breakdown: {
            consistency_with_readme: 0,
            specificity: 0,
            depth_of_reasoning: 0,
            honesty_and_limitations: 0
        },
        flags: ['error'],
        notes: [reason],
        confidence_level: 'low'
    };
}
