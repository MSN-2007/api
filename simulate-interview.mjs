// Native fetch is available in Node.js 18+

const API_BASE = 'http://localhost:3001/api/v1';

// Simulation of a User answering questions
const SIMULATED_USER_ANSWERS = [
    {
        type: "GOOD_HUMAN",
        text: "I used a custom hook here because I needed to share the state logic between the sidebar and the main view, but I didn't want to lift state up to the global context to avoid unnecessary re-renders."
    },
    {
        type: "OBVIOUS_AI",
        text: "In summary, the implementation of the authentication flow utilizes industry-standard best practices to ensure security and scalability. Furthermore, specifically, the JWT tokens are stored in HttpOnly cookies to prevent XSS attacks."
    },
    {
        type: "CLUELESS",
        text: "I'm not sure, I think I just copied that part from StackOverflow."
    }
];

async function simulateInterview() {
    console.log('\n🚀 STARTING INTERVIEW SIMULATION...\n');

    // 1. Analyze Repo to get questions
    // Try Port 3000 first, then 3001
    let port = 3000;
    let analyzeRes;

    try {
        console.log(`1️⃣  Analyzing Repository (trying port ${port})...`);
        analyzeRes = await fetch(`http://localhost:${port}/api/v1/analyze-repo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_url: 'https://github.com/axios/axios' })
        });
    } catch (e) {
        if (e.cause?.code === 'ECONNREFUSED') {
            port = 3001;
            console.log(`⚠️  Port 3000 failed, trying port ${port}...`);
            analyzeRes = await fetch(`http://localhost:${port}/api/v1/analyze-repo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_url: 'https://github.com/axios/axios' })
            });
        } else {
            throw e;
        }
    }

    // Update API_BASE for subsequent calls
    const CURRENT_API = `http://localhost:${port}/api/v1`;

    if (!analyzeRes.ok) {
        const errText = await analyzeRes.text();
        throw new Error(`Analysis failed: ${analyzeRes.status} ${analyzeRes.statusText}\n${errText}`);
    }
    const analysis = await analyzeRes.json();

    const questions = analysis.technical_questions;
    console.log(`\n✅ Generated ${questions.length} questions.`);

    // 2. Loop through questions and answer them
    console.log('\n2️⃣  Starting Q&A Session...\n');

    for (let i = 0; i < Math.min(3, questions.length); i++) {
        const question = questions[i];
        const simulatedAnswer = SIMULATED_USER_ANSWERS[i % SIMULATED_USER_ANSWERS.length];

        console.log(`\n❓ QUESTION ${i + 1}: ${question}`);
        console.log(`\n👤 USER ANSWER (${simulatedAnswer.type}):\n"${simulatedAnswer.text}"`);

        // 3. Evaluate the answer
        console.log('\n🤖 Analyzing Answer...');
        const evalRes = await fetch(`${CURRENT_API}/evaluate-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                readme: "Simulated README context", // In real app, pass actual context
                question: question,
                answer: simulatedAnswer.text
            })
        });

        const evaluation = await evalRes.json();

        // 4. Report Results
        console.log('\n📊 EVALUATION RESULT:');
        console.log(`   - Understanding Score: ${evaluation.understanding_score}/100`);
        console.log(`   - AI Probability:      ${evaluation.ai_generated_probability}%`);
        console.log(`   - Notes:               ${evaluation.notes.join(', ')}`);

        if (evaluation.ai_generated_probability > 70) {
            console.log('   🚨 AI DETECTED!');
        }
        console.log('-'.repeat(50));
    }

    console.log('\n✅ Simulation Complete.');
}

simulateInterview().catch(console.error);
