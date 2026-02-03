/**
 * Test script for answer evaluation endpoint
 */

const API_URL = 'http://localhost:3000/api/v1/evaluate-answer';

// Sample README content
const README = `# GitHub Repository Analyzer API

A production-ready REST API that analyzes public GitHub repositories and returns structured engineering analysis with deterministic scoring.

## Features

- **Single API Endpoint**: \`POST /api/v1/analyze-repo\`
- **Deterministic Scoring**: Rule-based scoring (0-100) based on repository characteristics
- **LLM-Powered Analysis**: AI-generated summary, technical questions, and notes
- **No Auth Required**: Simple API for immediate use
- **Production Ready**: Clean error handling and validation

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **GitHub REST API**
- **Gemini API** (gemini-2.0-flash-exp)

## Scoring System

The API uses **deterministic, rule-based scoring** (no LLM involvement in scores):

### Documentation (0-25 points)
- README exists: +10
- README > 500 chars: +5
- README > 2000 chars: +5
- README > 5000 chars: +5

### Structure (0-25 points)
- File count > 5: +5
- File count > 20: +5
- File count > 50: +5
- Has dependency file (package.json, requirements.txt, etc.): +10
`;

// Test cases
const testCases = [
    {
        name: 'Good Answer - Specific and Honest',
        question: 'How does the scoring system work in this API?',
        answer: `The scoring system is deterministic and rule-based, explicitly avoiding LLM involvement in score calculation. It uses four categories:

1. Documentation (0-25): Scores based on README existence and length thresholds (500, 2000, 5000 chars)
2. Structure (0-25): Evaluates file count and presence of dependency files
3. Completeness (0-20): Checks for test files
4. Engineering Maturity (0-30): Looks for CI/CD, config examples, LICENSE, etc.

The total is capped at 100 points. This approach ensures consistent, reproducible scores without AI variability. However, it's limited to surface-level metrics and can't assess code quality or architectural decisions.`
    },
    {
        name: 'Paraphrasing Answer',
        question: 'What technologies does this project use?',
        answer: `This project uses Next.js 15 with the App Router, TypeScript, GitHub REST API, and Gemini API (gemini-2.0-flash-exp). It's a production-ready REST API that analyzes GitHub repositories.`
    },
    {
        name: 'Generic Answer',
        question: 'Why was Next.js chosen for this project?',
        answer: `Next.js was chosen because it provides excellent performance and scalability. It follows industry best practices and offers server-side rendering capabilities. The framework is widely adopted and has great developer experience. It's perfect for building modern web applications with optimal SEO and fast page loads.`
    },
    {
        name: 'Hallucinated Answer',
        question: 'How does the API handle authentication?',
        answer: `The API uses JWT tokens for authentication with a Redis-based session store. Users authenticate via OAuth2 with GitHub, and the tokens are stored in a PostgreSQL database. Rate limiting is implemented using Redis to prevent abuse.`
    },
    {
        name: 'Question Avoidance',
        question: 'What are the limitations of the deterministic scoring approach?',
        answer: `The project is well-designed with a clean architecture. It uses TypeScript for type safety and Next.js for modern web development. The scoring system provides consistent results and the API is production-ready with proper error handling.`
    },
    {
        name: 'Brief/Minimally Sufficient Answer',
        question: 'What is the purpose of the API?',
        answer: 'The API analyzes GitHub repositories. It provides a summary, technical questions, and a deterministic score based on the repo structure and content.'
    }
];

async function runTest(testCase) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Question: ${testCase.question}`);
    console.log(`Answer: ${testCase.answer.substring(0, 100)}...`);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                readme: README,
                question: testCase.question,
                answer: testCase.answer
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Error Status:', response.status);
            console.error('❌ Error Details:', JSON.stringify(error, null, 2));
            return;
        }

        const result = await response.json();

        console.log('\n📊 EVALUATION RESULTS:');
        console.log(`   Understanding Score: ${result.understanding_score}/100`);
        console.log(`   Confidence: ${result.confidence_level}`);
        console.log('\n   Breakdown:');
        console.log(`   - Consistency: ${result.breakdown.consistency_with_readme}/25`);
        console.log(`   - Specificity: ${result.breakdown.specificity}/25`);
        console.log(`   - Depth: ${result.breakdown.depth_of_reasoning}/25`);
        console.log(`   - Honesty: ${result.breakdown.honesty_and_limitations}/25`);

        if (result.flags.length > 0) {
            console.log(`\n   🚩 Flags: ${result.flags.join(', ')}`);
        }

        if (result.notes.length > 0) {
            console.log('\n   📝 Notes:');
            result.notes.forEach(note => console.log(`   - ${note}`));
        }

    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

async function runAllTests() {
    console.log('🧪 Starting Answer Evaluation Tests...\n');
    console.log('Make sure the dev server is running: npm run dev\n');

    for (const testCase of testCases) {
        await runTest(testCase);
        console.log('\nWaiting 2 seconds between tests...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased rate limit wait
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ All tests completed!');
    console.log(`${'='.repeat(60)}\n`);
}

runAllTests();
