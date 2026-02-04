/**
 * LLM integration for generating repository analysis
 */

export interface LLMAnalysis {
    summary: string;
    scorecard: {
        score: number;
        reasoning: string;
        ai_probability_score: number;
        ai_probability_reasoning: string;
    };
    technical_questions: string[];
    technical_notes: string[];
}

/**
 * Analyze repository using Gemini API
 */
export async function analyzeRepository(
    readme: string,
    files: string[],
    repoContext: string,
    owner: string,
    repo: string,
    packageJson: any = null
): Promise<LLMAnalysis> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return createFallbackAnalysis();
    }

    const techStack = extractTechStack(packageJson);
    const prompt = buildPrompt(readme, files, repoContext, owner, repo, techStack);

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2500
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

        const parsed = parseJSONResponse(content);
        return validateAnalysis(parsed);
    } catch (error) {
        console.error('LLM analysis failed:', error);
        return createFallbackAnalysis();
    }
}

/**
 * Build prompt for LLM
 */
function buildPrompt(readme: string, files: string[], repoContext: string, owner: string, repo: string, techStack: string): string {
    return `You are a Principal Software Architect and Code Forensics Expert.
You are known for being BRUTALLY HONEST, cynicism, and high standards.

PROJECT CONTEXT:
Repo: ${owner}/${repo}
Tech Stack: ${techStack}

SOURCE CODE CONTEXT (Truncated):
${repoContext}

README CONTENT (Truncated):
${readme.slice(0, 5000) || 'No README found'}

YOUR MISSION:
Perform a deep forensic analysis of this codebase. Do not be polite. Be objective and critical.

1. **AI FORENSICS**: Detect if this code was written by a human, an AI, or a mix. Look for:
   - "Perfect" but generic comments.
   - Repetitive boilerplate.
   - Over-engineered solutions for simple problems.
   - Lack of idiosyncratic/messy human logic.

2. **ENGINEERING SCORECARD**: Rate this project from 0-100 based on:
   - **Architectural Integrity**: Is it spaghetti code or cleanly layered?
   - **Complexity**: Is it actually solving a hard problem, or just a CRUD wrapper?
   - **Production Readiness**: Would you deploy this?
   - **Code Quality**: Is it readable, idiomatic, and robust?
   *Scores > 90 are reserved for FAANG-level production libraries.*

3. **INTERVIEW PREPARATION**: Generate 5-6 TECHNICAL questions that prove whether someone *actually* wrote this code.
   - Questions must be based on *specific implementation details* found in the SOURCE CODE CONTEXT.
   - DO NOT ask generic questions ("How does authentication work?").
   - ASK specific questions ("Why did you use a reduce across the 'fetchContext' array instead of a simple loop in utils.ts?").

OUTPUT JSON FORMAT (STRICT):
{
  "summary": "A 3-sentence executive summary of what this project ACTUALLY does (not what the README claims).",
  "scorecard": {
    "score": number, // 0-100 (Be strict!)
    "reasoning": "One sentence explaining the score.",
    "ai_probability_score": number, // 0-100% probability it is AI-generated
    "ai_probability_reasoning": "Forensic evidence for why it looks Human vs AI."
  },
  "technical_questions": [
    "Question 1 (Reference specific file/function)",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5",
    "Question 6"
  ],
  "technical_notes": [
    "Specific observation 1",
    "Specific observation 2",
    "Specific observation 3",
    "Specific observation 4"
  ]
}`;
}

function parseJSONResponse(content: string): any {
    try {
        let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return {};
    }
}

function validateAnalysis(parsed: any): LLMAnalysis {
    const technical_questions = Array.isArray(parsed.technical_questions)
        ? parsed.technical_questions.slice(0, 6).filter((q: any) => typeof q === 'string')
        : [];

    // Fallback if no questions found or not enough
    if (technical_questions.length < 5) {
        const fallbacks = [
            "Explain the architectural patterns observed in the codebase.",
            "How does this project handle error scenarios and edge cases?",
            "What mechanisms are in place for performance optimization?",
            "Describe the data flow within the core components.",
            "How are external dependencies managed and isolated?",
            "What security measures are implemented in the current codebase?"
        ];
        // Fill up to 5 questions
        for (let i = technical_questions.length; i < 5; i++) {
            technical_questions.push(fallbacks[i]);
        }
    }

    return {
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Analysis unavailable.',
        scorecard: {
            score: typeof parsed.scorecard?.score === 'number' ? parsed.scorecard.score : 50,
            reasoning: typeof parsed.scorecard?.reasoning === 'string' ? parsed.scorecard.reasoning : 'No reasoning provided.',
            ai_probability_score: typeof parsed.scorecard?.ai_probability_score === 'number' ? parsed.scorecard.ai_probability_score : 0,
            ai_probability_reasoning: typeof parsed.scorecard?.ai_probability_reasoning === 'string' ? parsed.scorecard.ai_probability_reasoning : 'No forensics available.'
        },
        technical_questions: technical_questions,
        technical_notes: Array.isArray(parsed.technical_notes)
            ? parsed.technical_notes.slice(0, 5).filter((n: any) => typeof n === 'string')
            : []
    };
}

function createFallbackAnalysis(): LLMAnalysis {
    return {
        summary: 'Analysis failed due to missing API key or error.',
        scorecard: {
            score: 0,
            reasoning: 'Analysis failed.',
            ai_probability_score: 0,
            ai_probability_reasoning: 'Analysis failed.'
        },
        technical_questions: [
            "Explain the architectural patterns observed in the codebase.",
            "How does this project handle error scenarios and edge cases?",
            "What mechanisms are in place for performance optimization?",
            "Describe the data flow within the core components.",
            "How are external dependencies managed and isolated?"
        ],
        technical_notes: ["Analysis failed. Using fallback questions."]
    };
}

function extractTechStack(packageJson: any): string {
    if (!packageJson) return 'Unknown';
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return Object.keys(deps).join(', ');
}
