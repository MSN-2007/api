import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchReadme, fetchFileTree, fetchPackageJson, fetchRepoContext } from '@/lib/github';
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
        let readme: string = '';
        let files: string[] = [];
        let packageJson: any = null;
        let repoContext: string = '';

        try {
            // 1. Fetch metadata
            [readme, files, packageJson] = await Promise.all([
                fetchReadme(owner, name),
                fetchFileTree(owner, name),
                fetchPackageJson(owner, name)
            ]);

            // 2. Fetch file contents for deep analysis
            repoContext = await fetchRepoContext(owner, name, files);

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

        // Calculate deterministic scores (Baseline)
        const heuristicScorecard = calculateScore(readme, files);

        // Get AI Deep Analysis
        const analysis = await analyzeRepository(readme, files, repoContext, owner, name, packageJson);

        // Build enhanced response
        const response = {
            repo: {
                owner,
                name
            },
            summary: analysis.summary,
            scorecard: {
                ai_score: analysis.scorecard.score,
                ai_reasoning: analysis.scorecard.reasoning,
                ai_probability: analysis.scorecard.ai_probability_score,
                ai_forensics: analysis.scorecard.ai_probability_reasoning,
                heuristic_score: heuristicScorecard.overall,
                breakdown: {
                    documentation: heuristicScorecard.breakdown.documentation,
                    structure: heuristicScorecard.breakdown.structure,
                    completeness: heuristicScorecard.breakdown.completeness,
                    engineering_maturity: heuristicScorecard.breakdown.engineering_maturity
                }
            },
            technical_questions: analysis.technical_questions,
            notes: analysis.technical_notes
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
