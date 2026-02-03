/**
 * LLM integration for generating repository analysis
 * LLM is ONLY used for: summary, technical questions, and notes
 * LLM must NOT generate scores
 */

export interface LLMAnalysis {
    summary: string[];
    technical_questions: string[];
    notes: string[];
}

/**
 * Analyze repository using Gemini API
 */
export async function analyzeRepository(
    readme: string,
    files: string[],
    owner: string,
    repo: string,
    packageJson: any = null
): Promise<LLMAnalysis> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        // Return fallback if no API key
        return {
            summary: ['Repository analysis unavailable - Gemini API key not configured'],
            technical_questions: [
                'What is the primary purpose of this repository?',
                'What are the main technologies used?',
                'How is the project structured?'
            ],
            notes: ['LLM analysis unavailable']
        };
    }

    const techStack = extractTechStack(packageJson);
    const prompt = buildPrompt(readme, files, owner, repo, techStack);

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
                        temperature: 0.2, // Lower temperature for factual analysis
                        maxOutputTokens: 1000
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
        const parsed = parseJSONResponse(content);

        // Validate and return
        return validateAnalysis(parsed);
    } catch (error) {
        console.error('LLM analysis failed:', error);

        // Return fallback analysis
        return {
            summary: [
                `Repository: ${owner}/${repo}`,
                `Files: ${files.length}`,
                'Detailed analysis unavailable'
            ],
            technical_questions: [
                'What is the primary purpose of this repository?',
                'What are the main dependencies and technologies?',
                'How is testing and CI/CD configured?'
            ],
            notes: ['Automated analysis failed - using fallback']
        };
    }
}

/**
 * Extract tech stack from package.json
 */
function extractTechStack(packageJson: any): string {
    if (!packageJson) return 'Unknown (No package.json found)';

    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const stack = Object.keys(dependencies).join(', ');

    return stack || 'No dependencies found';
}

/**
 * Build prompt for LLM
 */
function buildPrompt(readme: string, files: string[], owner: string, repo: string, techStack: string): string {
    const fileList = files.slice(0, 100).join('\n'); // Limit to 100 files for prompt

    return `You are a senior engineer reviewing a GitHub project.

KNOWN TECH STACK:
${techStack}

README (truncated):
${readme.slice(0, 15000) || 'No README found'}

FILE STRUCTURE (context):
${fileList}

TASKS:
1. Summarize the project in 5 factual bullet points.
2. Ask exactly 3 deep technical questions that test understanding of the detected tech stack.
   - Questions must reference the stack explicitly.
   - No generic questions like "How to install?".
   - Focus on architecture, integration patterns, or specific library usage.
3. Provide 3 specific notes/observations about the codebase maturity or structure.

Return STRICT JSON format:
{
  "summary": ["point 1", "point 2", ...],
  "technical_questions": ["question 1", "question 2", "question 3"],
  "notes": ["note 1", "note 2", "note 3"]
}`;
}

/**
 * Parse JSON response from LLM
 */
function parseJSONResponse(content: string): any {
    try {
        // Remove markdown code blocks if present
        let cleaned = content.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
        }

        return JSON.parse(cleaned);
    } catch (error) {
        throw new Error('Failed to parse LLM response as JSON');
    }
}

/**
 * Validate and normalize LLM analysis
 */
function validateAnalysis(parsed: any): LLMAnalysis {
    const summary = Array.isArray(parsed.summary)
        ? parsed.summary.slice(0, 5).filter((s: any) => typeof s === 'string')
        : ['Analysis unavailable'];

    const technical_questions = Array.isArray(parsed.technical_questions)
        ? parsed.technical_questions.slice(0, 3).filter((q: any) => typeof q === 'string')
        : ['What is this project?', 'How does it work?', 'What are the key features?'];

    // Ensure exactly 3 questions
    while (technical_questions.length < 3) {
        technical_questions.push('Additional technical details needed');
    }

    const notes = Array.isArray(parsed.notes)
        ? parsed.notes.slice(0, 4).filter((n: any) => typeof n === 'string')
        : ['No additional notes'];

    return {
        summary: summary.length > 0 ? summary : ['Analysis unavailable'],
        technical_questions: technical_questions.slice(0, 3),
        notes: notes.length > 0 ? notes : ['No additional notes']
    };
}
