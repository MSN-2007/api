// Test Gemini API with gemini-2.5-flash
const GEMINI_API_KEY = 'AIzaSyDg6NAPuvHTKkbu_XFW3He8oDTeA31NKUw';

async function testGemini() {
    try {
        console.log('Testing Gemini API with gemini-2.5-flash...\n');

        const prompt = `Return a JSON object with:
{
  "summary": ["This is a test repository", "It demonstrates JSON responses"],
  "technical_questions": ["How does this work?", "What is the architecture?", "What are the dependencies?"],
  "notes": ["Test note 1", "Test note 2"]
}

Return ONLY valid JSON, no markdown code blocks.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
                        temperature: 0.3,
                        maxOutputTokens: 500
                    }
                })
            }
        );

        console.log('Status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.log('Error Response:', JSON.stringify(errorData, null, 2));
            return;
        }

        const data = await response.json();
        console.log('\nFull API Response:');
        console.log(JSON.stringify(data, null, 2));

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('\n=== Extracted Content ===');
        console.log(content);
        console.log('=========================\n');

        if (content) {
            try {
                // Try to parse as JSON
                let cleaned = content.trim();
                if (cleaned.startsWith('```')) {
                    console.log('Removing markdown code blocks...');
                    cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
                }

                const parsed = JSON.parse(cleaned);
                console.log('\n✅ Successfully parsed JSON:');
                console.log(JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log('\n❌ Failed to parse as JSON');
                console.log('Error:', e.message);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testGemini();
