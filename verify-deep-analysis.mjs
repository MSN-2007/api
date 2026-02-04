import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/v1';

async function testAnalyzeRepo() {
    console.log('\n--- Testing Deep Repo Analysis ---');
    try {
        const response = await fetch(`${API_BASE}/analyze-repo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // Use the repo itself as a test case
                repo_url: 'https://github.com/vercel/next.js'
                // Using a large popular repo to test context fetching limits and AI analysis
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log('Status: OK');
        console.log('AI Score:', data.scorecard?.ai_score);
        console.log('AI Probability:', data.scorecard?.ai_probability);
        console.log('Tech Questions Count:', data.technical_questions?.length);

        if (data.scorecard?.ai_score !== undefined && data.scorecard?.ai_probability !== undefined && data.technical_questions?.length >= 3) {
            console.log('✅ Deep Analysis Verification Passed');
        } else {
            console.error('❌ Deep Analysis Verification Failed: Missing fields');
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

async function testEvaluateAnswer() {
    console.log('\n--- Testing Answer Evaluation with AI Detection ---');
    try {
        const response = await fetch(`${API_BASE}/evaluate-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                readme: "# Test Project\n This is a simple test project.",
                question: "What is the purpose of this project?",
                answer: "The purpose of this project is to be a test project. However, in conclusion, it is important to note that testing is crucial for software engineering best practices." // Deliberately sounding vague/AI-like
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log('Status: OK');
        console.log('Understanding Score:', data.understanding_score);
        console.log('AI Generated Probability:', data.ai_generated_probability);

        if (data.ai_generated_probability !== undefined) {
            console.log('✅ Answer Evaluation Verification Passed');
        } else {
            console.error('❌ Answer Evaluation Verification Failed: Missing AI probability');
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

async function main() {
    await testAnalyzeRepo();
    await testEvaluateAnswer();
}

main();
