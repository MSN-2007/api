// Test script to debug the API
import { parseGitHubUrl, fetchReadme, fetchFileTree } from './lib/github.js';
import { calculateScore } from './lib/scoring.js';

async function test() {
    try {
        console.log('Testing GitHub URL parsing...');
        const repo = parseGitHubUrl('https://github.com/sindresorhus/is');
        console.log('Repo:', repo);

        console.log('\nFetching README...');
        const readme = await fetchReadme(repo.owner, repo.name);
        console.log('README length:', readme.length);
        console.log('README preview:', readme.slice(0, 200));

        console.log('\nFetching file tree...');
        const files = await fetchFileTree(repo.owner, repo.name);
        console.log('Files count:', files.length);
        console.log('First 10 files:', files.slice(0, 10));

        console.log('\nCalculating score...');
        const score = calculateScore(readme, files);
        console.log('Score:', JSON.stringify(score, null, 2));

        console.log('\n✅ All tests passed!');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

test();
