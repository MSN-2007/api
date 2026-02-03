export default function Home() {
  return (
    <div className="min-h-screen p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">GitHub Repository Analyzer API</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Production-ready REST API for analyzing GitHub repositories
        </p>

        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-bold mb-4">Endpoint</h2>
          <code className="text-sm">POST /api/v1/analyze-repo</code>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Example Request</h2>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
            {`curl -X POST http://localhost:3000/api/v1/analyze-repo \\
  -H "Content-Type: application/json" \\
  -d '{"repo_url": "https://github.com/vercel/next.js"}'`}
          </pre>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Response Structure</h2>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
            {`{
  "repo": {
    "owner": "string",
    "name": "string"
  },
  "summary": ["string"],
  "technical_questions": ["string", "string", "string"],
  "scorecard": {
    "overall": number,
    "breakdown": {
      "documentation": number,
      "structure": number,
      "completeness": number,
      "engineering_maturity": number
    }
  },
  "notes": ["string"]
}`}
          </pre>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Configure your API keys in <code>.env.local</code></p>
        </div>
      </div>
    </div>
  );
}
