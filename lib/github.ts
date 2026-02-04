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
 * Fetch generic file content from GitHub repository
 */
export async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
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
            `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
            { headers }
        );

        if (response.status === 404) {
            return ''; // File not found
        }

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('GitHub API rate limit exceeded or repository is private');
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();

        // Handle case where path is a directory
        if (Array.isArray(data)) {
            return '';
        }

        // Decode base64 content
        return decodeBase64(data.content);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        return '';
    }
}

/**
 * Fetch package.json content
 */
export async function fetchPackageJson(owner: string, repo: string): Promise<any> {
    const content = await fetchFileContent(owner, repo, 'package.json');
    if (!content) return null;

    try {
        return JSON.parse(content);
    } catch {
        return null;
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
                .map((item: any) => item.path);

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

/**
 * Fetch context from multiple files for AI analysis
 */
export async function fetchRepoContext(owner: string, repo: string, files: string[]): Promise<string> {
    // Priority patterns to fetch first
    const PRIORITY_PATTERNS = [
        /package\.json$/,
        /tsconfig\.json$/,
        /next\.config\./,
        /src\/.*\.(ts|tsx|js|jsx)$/,
        /app\/.*\.(ts|tsx|js|jsx)$/,
        /lib\/.*\.(ts|tsx|js|jsx)$/,
        /components\/.*\.(ts|tsx|js|jsx)$/
    ];

    // Filter and sort files by priority
    const priorityFiles = files.filter(file =>
        PRIORITY_PATTERNS.some(pattern => pattern.test(file))
    ).slice(0, 30); // Limit to top 30 prioritized files

    const contextParts = [];

    // Fetch content for each file (in parallel with concurrency limit)
    const BATCH_SIZE = 5;
    for (let i = 0; i < priorityFiles.length; i += BATCH_SIZE) {
        const batch = priorityFiles.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(async (file) => {
                try {
                    const content = await fetchFileContent(owner, repo, file);
                    return content ? `\n\n--- FILE: ${file} ---\n${content.slice(0, 5000)}` : null;
                } catch {
                    return null;
                }
            })
        );
        contextParts.push(...results.filter(Boolean));
    }

    return contextParts.join('\n');
}
