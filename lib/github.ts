/**
 * GitHub API utilities for fetching repository data
 */

const GITHUB_API_BASE = 'https://api.github.com';

export interface RepoInfo {
    owner: string;
    name: string;
}

/**
 * Decode base64 string (works in both Node.js and Edge runtime)
 */
function decodeBase64(base64: string): string {
    // Remove whitespace and newlines
    const cleaned = base64.replace(/\s/g, '');

    // Use atob for browser/edge compatibility
    if (typeof atob !== 'undefined') {
        return atob(cleaned);
    }

    // Fallback to Buffer for Node.js
    return Buffer.from(cleaned, 'base64').toString('utf-8');
}

/**
 * Parse GitHub URL and extract owner and repo name
 */
export function parseGitHubUrl(url: string): RepoInfo {
    try {
        // Remove trailing slashes and .git
        const cleanUrl = url.replace(/\.git$/, '').replace(/\/$/, '');

        // Match github.com/owner/repo pattern
        const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);

        if (!match) {
            throw new Error('Invalid GitHub URL format');
        }

        return {
            owner: match[1],
            name: match[2]
        };
    } catch (error) {
        throw new Error('Failed to parse GitHub URL. Expected format: https://github.com/owner/repo');
    }
}

/**
 * Fetch README content from GitHub repository
 */
export async function fetchReadme(owner: string, repo: string): Promise<string> {
    const token = process.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'repo-analyzer'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(
            `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
            { headers }
        );

        if (response.status === 404) {
            return ''; // No README found
        }

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('GitHub API rate limit exceeded or repository is private');
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();

        // Decode base64 content
        const content = decodeBase64(data.content);

        // Trim to max 10,000 characters for safety
        return content.slice(0, 10000);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to fetch README');
    }
}

/**
 * Fetch file tree from GitHub repository
 */
export async function fetchFileTree(owner: string, repo: string): Promise<string[]> {
    const token = process.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'repo-analyzer'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Try main branch first, then master
    const branches = ['main', 'master'];

    for (const branch of branches) {
        try {
            const response = await fetch(
                `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
                { headers }
            );

            if (response.status === 404) {
                continue; // Try next branch
            }

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('GitHub API rate limit exceeded or repository is private');
                }
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();

            // Extract file paths (not directories)
            const files = data.tree
                .filter((item: any) => item.type === 'blob')
                .map((item: any) => item.path)
                .slice(0, 500); // Limit to first 500 files

            return files;
        } catch (error) {
            if (error instanceof Error && error.message.includes('rate limit')) {
                throw error;
            }
            // Continue to next branch
        }
    }

    throw new Error('Repository not found or no accessible branches');
}
