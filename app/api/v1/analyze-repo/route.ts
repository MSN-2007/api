import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchReadme, fetchFileTree } from '@/lib/github';
import { calculateScore } from '@/lib/scoring';
import { analyzeRepository } from '@/lib/llm';

// Force Node.js runtime for Buffer support
export const runtime = 'nodejs';

/**
 * POST /api/v1/analyze-repo
 * Analyzes a GitHub repository and returns structured engineering analysis
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { repo_url } = body;

        // Validate input
        if (!repo_url || typeof repo_url !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid repo_url field' },
                { status: 400 }
            );
        }

        // Parse GitHub URL
        let repoInfo;
        try {
            repoInfo = parseGitHubUrl(repo_url);
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : 'Invalid GitHub URL' },
                { status: 400 }
            );
        }

        const { owner, name } = repoInfo;

        // Fetch repository data from GitHub
        let readme: string;
        let files: string[];

        try {
            [readme, files] = await Promise.all([
                fetchReadme(owner, name),
                fetchFileTree(owner, name)
            ]);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch repository';

            if (message.includes('not found')) {
                return NextResponse.json(
                    { error: 'Repository not found or is private' },
                    { status: 404 }
                );
            }

            if (message.includes('rate limit')) {
                return NextResponse.json(
                    { error: 'GitHub API rate limit exceeded. Please add GITHUB_TOKEN to .env.local' },
                    { status: 429 }
                );
            }

            return NextResponse.json(
                { error: message },
                { status: 500 }
            );
        }

        // Calculate deterministic scores
        const scorecard = calculateScore(readme, files);

        // Get LLM analysis
        const analysis = await analyzeRepository(readme, files, owner, name);

        // Build response
        const response = {
            repo: {
                owner,
                name
            },
            summary: analysis.summary,
            technical_questions: analysis.technical_questions,
            scorecard: {
                overall: scorecard.overall,
                breakdown: {
                    documentation: scorecard.breakdown.documentation,
                    structure: scorecard.breakdown.structure,
                    completeness: scorecard.breakdown.completeness,
                    engineering_maturity: scorecard.breakdown.engineering_maturity
                }
            },
            notes: analysis.notes
        };

        return NextResponse.json(response, { status: 200 });

    } catch (error) {
        console.error('API error:', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
