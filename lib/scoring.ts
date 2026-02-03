/**
 * Deterministic scoring logic for repository analysis
 * NO LLM involvement - purely rule-based
 */

export interface Scorecard {
    overall: number;
    breakdown: {
        documentation: number;
        structure: number;
        completeness: number;
        engineering_maturity: number;
    };
}

/**
 * Calculate deterministic score based on README and file structure
 */
export function calculateScore(readme: string, files: string[]): Scorecard {
    const breakdown = {
        documentation: calculateDocumentationScore(readme),
        structure: calculateStructureScore(files),
        completeness: calculateCompletenessScore(files),
        engineering_maturity: calculateEngineeringMaturityScore(files)
    };

    const overall =
        breakdown.documentation +
        breakdown.structure +
        breakdown.completeness +
        breakdown.engineering_maturity;

    return {
        overall,
        breakdown
    };
}

/**
 * Documentation score (0-25)
 * Based on README presence and length
 */
function calculateDocumentationScore(readme: string): number {
    let score = 0;

    if (readme.length > 0) {
        score += 10; // README exists
    }

    if (readme.length > 500) {
        score += 5; // Decent length
    }

    if (readme.length > 2000) {
        score += 5; // Good length
    }

    if (readme.length > 5000) {
        score += 5; // Comprehensive
    }

    return score;
}

/**
 * Structure score (0-25)
 * Based on file count and presence of dependency files
 */
function calculateStructureScore(files: string[]): number {
    let score = 0;

    // File count scoring
    if (files.length > 5) {
        score += 5;
    }

    if (files.length > 20) {
        score += 5;
    }

    if (files.length > 50) {
        score += 5;
    }

    // Check for dependency/config files
    const hasDependencyFile = files.some(file =>
        file === 'package.json' ||
        file === 'requirements.txt' ||
        file === 'Cargo.toml' ||
        file === 'go.mod' ||
        file === 'pom.xml' ||
        file === 'build.gradle'
    );

    if (hasDependencyFile) {
        score += 10;
    }

    return score;
}

/**
 * Completeness score (0-20)
 * Based on presence of tests
 */
function calculateCompletenessScore(files: string[]): number {
    let score = 0;

    // Check for test files
    const testFiles = files.filter(file =>
        file.includes('/test/') ||
        file.includes('/__tests__/') ||
        file.includes('.test.') ||
        file.includes('.spec.') ||
        file.includes('_test.') ||
        file.endsWith('Test.java') ||
        file.endsWith('Test.kt')
    );

    if (testFiles.length > 0) {
        score += 10; // Has tests
    }

    if (testFiles.length > 3) {
        score += 10; // Multiple test files
    }

    return score;
}

/**
 * Engineering maturity score (0-30)
 * Based on CI/CD, config examples, license, and contributing docs
 */
function calculateEngineeringMaturityScore(files: string[]): number {
    let score = 0;

    // Check for CI/CD
    const hasCICD = files.some(file =>
        file.startsWith('.github/workflows/') ||
        file === '.gitlab-ci.yml' ||
        file === '.travis.yml' ||
        file === 'circle.yml' ||
        file === '.circleci/config.yml'
    );

    if (hasCICD) {
        score += 15;
    }

    // Check for config examples
    const hasConfigExample = files.some(file =>
        file === '.env.example' ||
        file === 'config.example.json' ||
        file === 'config.example.yml' ||
        file.includes('.example')
    );

    if (hasConfigExample) {
        score += 5;
    }

    // Check for LICENSE
    const hasLicense = files.some(file =>
        file.toUpperCase() === 'LICENSE' ||
        file.toUpperCase() === 'LICENSE.MD' ||
        file.toUpperCase() === 'LICENSE.TXT'
    );

    if (hasLicense) {
        score += 5;
    }

    // Check for contributing/changelog
    const hasContributing = files.some(file =>
        file.toUpperCase() === 'CONTRIBUTING.MD' ||
        file.toUpperCase() === 'CHANGELOG.MD' ||
        file.toUpperCase() === 'CHANGELOG.TXT'
    );

    if (hasContributing) {
        score += 5;
    }

    return score;
}
