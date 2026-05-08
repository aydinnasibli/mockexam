'use server';

import OpenAI from 'openai';
import type { WritingTaskType } from '@/lib/models/Question';

export interface WritingCriterionResult {
  criterion: string;
  score: number;
  comment: string;
}

export interface WritingEvalResult {
  bandScore: number;
  wordCount: number;
  criteriaFeedback: WritingCriterionResult[];
  overallComment: string;
}

const FALLBACK_RESULT: WritingEvalResult = {
  bandScore: 0,
  wordCount: 0,
  criteriaFeedback: [],
  overallComment: 'AI qiymətləndirmə hazırda əlçatan deyil. Cavabınız qeydə alınıb.',
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildSystemPrompt(taskType: WritingTaskType | undefined): string {
  if (taskType === 'task1') {
    return `You are an expert IELTS examiner evaluating IELTS Academic Writing Task 1 responses.
Score on four criteria (each 0–9):
- Task Achievement (TA): Does the response cover all key features of the data/diagram?
- Coherence and Cohesion (CC): Is it well-organised with logical progression?
- Lexical Resource (LR): Range and accuracy of vocabulary.
- Grammatical Range and Accuracy (GRA): Range and accuracy of grammar.
The overall band score is the average of the four criteria, rounded to the nearest 0.5.`;
  }
  if (taskType === 'task2') {
    return `You are an expert IELTS examiner evaluating IELTS Academic Writing Task 2 essays.
Score on four criteria (each 0–9):
- Task Response (TR): Does the response fully address all parts of the task with well-developed ideas?
- Coherence and Cohesion (CC): Is it logically organised with effective paragraphing?
- Lexical Resource (LR): Range and accuracy of vocabulary.
- Grammatical Range and Accuracy (GRA): Range and accuracy of grammar.
The overall band score is the average of the four criteria, rounded to the nearest 0.5.`;
  }
  if (taskType === 'integrated') {
    return `You are an expert TOEFL examiner evaluating TOEFL Integrated Writing responses.
Score on three criteria (each 0–5, then convert average to 0–30):
- Content (C): Does the response accurately reflect the key points from the lecture and reading?
- Organisation (O): Is information logically structured and connected?
- Language Use (LU): Accuracy and range of grammar and vocabulary.
Report each criterion score out of 5. The overall band score should be the sum out of 30, but also express it as a 0–30 value.`;
  }
  if (taskType === 'independent') {
    return `You are an expert TOEFL examiner evaluating TOEFL Independent Writing responses.
Score on three criteria (each 0–5, then sum to 0–30, also report 0–9 band equivalent):
- Development (D): Are ideas well-developed with clear reasons and examples?
- Organisation (O): Is the essay well-organised with a clear introduction, body, and conclusion?
- Language Use (LU): Accuracy and range of grammar and vocabulary.
Report each criterion score out of 5. For the overall band score, use a 0–9 scale equivalent.`;
  }
  // general / default
  return `You are an expert English writing examiner. Evaluate the writing response.
Score on three criteria (each 0–9):
- Task Completion (TC): Does the response address the prompt fully?
- Organisation and Cohesion (OC): Is the writing logically structured?
- Language Accuracy (LA): Grammar and vocabulary accuracy and range.
The overall band score is the average of the three criteria, rounded to the nearest 0.5.`;
}

export async function evaluateWriting(params: {
  essay: string;
  prompt: string;
  rubric?: string;
  taskType?: WritingTaskType;
  examType?: string;
}): Promise<WritingEvalResult> {
  const { essay, prompt: writingPrompt, rubric, taskType, examType } = params;

  const wordCount = countWords(essay);

  if (wordCount < 10) {
    return { ...FALLBACK_RESULT, wordCount, overallComment: 'Cavab çox qısa yazılıb.' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[evaluateWriting] OPENAI_API_KEY not set');
    return { ...FALLBACK_RESULT, wordCount };
  }

  try {
    const client = new OpenAI({ apiKey });

    const systemPrompt = buildSystemPrompt(taskType);

    const userMessage = [
      `**Writing Task (${examType ?? 'General'} — ${taskType ?? 'general'}):**`,
      writingPrompt,
      rubric ? `\n**Evaluation Rubric:**\n${rubric}` : '',
      `\n**Student Response (${wordCount} words):**`,
      essay,
      `\n**Instructions:**
Evaluate the response and return ONLY valid JSON (no markdown, no explanation outside the JSON) in this exact format:
{
  "bandScore": <number 0-9>,
  "criteriaFeedback": [
    { "criterion": "<name>", "score": <number>, "comment": "<1-2 sentence comment>" }
  ],
  "overallComment": "<2-3 sentence overall feedback paragraph>"
}`,
    ].filter(Boolean).join('\n\n');

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as {
      bandScore?: number;
      criteriaFeedback?: { criterion: string; score: number; comment: string }[];
      overallComment?: string;
    };

    return {
      bandScore:        Math.min(9, Math.max(0, Number(parsed.bandScore ?? 0))),
      wordCount,
      criteriaFeedback: Array.isArray(parsed.criteriaFeedback) ? parsed.criteriaFeedback : [],
      overallComment:   parsed.overallComment ?? '',
    };
  } catch (err) {
    console.error('[evaluateWriting] OpenAI error:', err);
    return { ...FALLBACK_RESULT, wordCount };
  }
}
