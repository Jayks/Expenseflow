import { NextResponse } from 'next/server';
import { askAI } from '@/lib/chat';

export async function POST(request: Request) {
  const { question } = await request.json();
  
  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  const answer = await askAI(question);
  return NextResponse.json({ answer });
}
