/**
 * Answer Evaluation System
 * Detects whether answers demonstrate REAL UNDERSTANDING vs shallow knowledge
 */

export interface EvaluationResult {
    understanding_score: number; // 0-100
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
        // Return fallback if no API key
        return createFallbackEvaluation('Gemini API key not configured');
    }

    const prompt = buildEvaluationPrompt(readme, question, answer);

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.1, // Low temperature for consistent evaluation
                        maxOutputTokens: 2000,
                        topP: 0.95
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            throw new Error('No response from Gemini');
        }

        // Parse JSON response
        const parsed = parseEvaluationResponse(content);

        // Validate and return
        return validateEvaluation(parsed);
    } catch (error) {
        console.error('Answer evaluation failed:', error);
        return createFallbackEvaluation('Evaluation system error');
    }
}

/**
 * Build evaluation prompt
 */
function buildEvaluationPrompt(readme: string, question: string, answer: string): string {
    return `You are a senior technical interviewer and reviewer.

Your task is NOT to detect whether an answer was written by AI.
Your task IS to determine whether the answer demonstrates REAL UNDERSTANDING
of the project described in the README.

You are given:
1. The README file (ground truth)
2. A technical question generated from that README
3. A user-provided answer (which MAY be written using AI)

IMPORTANT TRUTH:
- Users are allowed to use AI.
- Fluent writing is NOT a signal of understanding.
- Generic explanations MUST be penalized.
- Overconfident answers MUST be penalized.
- Paraphrasing the README MUST be penalized.

You must evaluate ONLY the following vulnerabilities:

----------------------------------
VULNERABILITY CHECKS (MANDATORY)
----------------------------------

1. README CONSISTENCY
- Does the answer stay strictly within what is stated or implied in the README?
- Penalize if the answer introduces:
  - tools
  - databases
  - architectures
  - workflows
  that are NOT mentioned in the README.

2. SPECIFICITY VS GENERICITY
- Determine whether the answer contains concrete constraints, tradeoffs, or limitations.
- Penalize phrases such as:
  - "for scalability and performance"
  - "best practices"
  - "industry standard"
  unless explicitly justified.

3. DEPTH BEYOND PARAPHRASING
- Check if the answer merely rephrases the README content.
- If the answer does not go at least ONE LEVEL deeper than the README,
  it MUST receive a low depth score.

4. QUESTION–ANSWER ALIGNMENT
- Does the answer directly address the intent of the question?
- Penalize answers that:
  - drift into unrelated explanations
  - reframe the question
  - avoid tradeoffs

5. HONESTY SIGNALS
- Reward answers that acknowledge:
  - limitations
  - incomplete areas
  - known weaknesses
- Penalize answers that present the project as complete, perfect, or fully optimized
  when the README does not support this.

----------------------------------
SCORING RULES (STRICT)
----------------------------------

You MUST produce an understanding score from 0 to 100.
This score reflects DEPTH OF UNDERSTANDING, not writing quality.

Use these dimensions:
- consistency_with_readme (0–25)
- specificity (0–25)
- depth_of_reasoning (0–25)
- honesty_and_limitations (0–25)

The overall score is the sum of these values.

----------------------------------
IMPORTANT ENFORCEMENT RULES
----------------------------------

- If the answer could plausibly be written WITHOUT ever working on the project,
  the understanding_score MUST be below 50.
- If the answer introduces details not present in the README,
  consistency_with_readme MUST be below 10.
- If the answer contains no tradeoffs or limitations,
  honesty_and_limitations MUST be below 10.
- If the answer is concise, specific, and admits uncertainty where appropriate,
  reward it even if it is imperfect.

Your role is to PROTECT the SYSTEM from shallow but fluent answers.
Accuracy and fairness matter more than politeness.

Evaluate strictly.

----------------------------------
README CONTENT
----------------------------------

${readme.substring(0, 15000)}

----------------------------------
TECHNICAL QUESTION
----------------------------------

${question}

----------------------------------
USER'S ANSWER
----------------------------------

${answer}

----------------------------------
OUTPUT FORMAT (STRICT JSON ONLY)
----------------------------------

Return ONLY valid JSON.
Do NOT include explanations outside JSON.
Do NOT include markdown code blocks.

{
  "understanding_score": number,
  "breakdown": {
    "consistency_with_readme": number,
    "specificity": number,
    "depth_of_reasoning": number,
    "honesty_and_limitations": number
  },
  "flags": [
    "paraphrasing_detected",
    "generic_language",
    "hallucinated_details",
    "question_avoidance"
  ],
  "notes": [
    "Short factual observations about weaknesses or strengths"
  ],
  "confidence_level": "low | medium | high"
}`;
}

/**
 * Parse JSON response from Gemini
 */
function parseEvaluationResponse(content: string): any {
    try {
        // Remove markdown code blocks if present
        let cleaned = content.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
        }

        return JSON.parse(cleaned);
    } catch (error) {
        throw new Error('Failed to parse evaluation response as JSON');
    }
}

/**
 * Validate and normalize evaluation result
 */
function validateEvaluation(parsed: any): EvaluationResult {
    const breakdown = {
        consistency_with_readme: clamp(parsed.breakdown?.consistency_with_readme ?? 0, 0, 25),
        specificity: clamp(parsed.breakdown?.specificity ?? 0, 0, 25),
        depth_of_reasoning: clamp(parsed.breakdown?.depth_of_reasoning ?? 0, 0, 25),
        honesty_and_limitations: clamp(parsed.breakdown?.honesty_and_limitations ?? 0, 0, 25)
    };

    const understanding_score = clamp(
        parsed.understanding_score ??
        (breakdown.consistency_with_readme + breakdown.specificity +
            breakdown.depth_of_reasoning + breakdown.honesty_and_limitations),
        0,
        100
    );

    const flags = Array.isArray(parsed.flags)
        ? parsed.flags.filter((f: any) => typeof f === 'string')
        : [];

    const notes = Array.isArray(parsed.notes)
        ? parsed.notes.filter((n: any) => typeof n === 'string')
        : ['No additional notes'];

    const confidence_level = ['low', 'medium', 'high'].includes(parsed.confidence_level)
        ? parsed.confidence_level
        : 'medium';

    return {
        understanding_score,
        breakdown,
        flags,
        notes,
        confidence_level
    };
}

/**
 * Create fallback evaluation when API fails
 */
function createFallbackEvaluation(reason: string): EvaluationResult {
    return {
        understanding_score: 0,
        breakdown: {
            consistency_with_readme: 0,
            specificity: 0,
            depth_of_reasoning: 0,
            honesty_and_limitations: 0
        },
        flags: ['evaluation_failed'],
        notes: [reason],
        confidence_level: 'low'
    };
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
