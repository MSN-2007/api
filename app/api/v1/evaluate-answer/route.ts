import { NextRequest, NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/evaluation';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request
        const { readme, question, answer } = body;

        if (!readme || typeof readme !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid "readme" field' },
                { status: 400 }
            );
        }

        if (!question || typeof question !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid "question" field' },
                { status: 400 }
            );
        }

        if (!answer || typeof answer !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid "answer" field' },
                { status: 400 }
            );
        }

        // Evaluate answer
        const evaluation = await evaluateAnswer(readme, question, answer);

        return NextResponse.json(evaluation);
    } catch (error) {
        console.error('Evaluation endpoint error:', error);

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
