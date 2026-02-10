import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VocabWord } from '../types';

// --- API Key Management (Round Robin) ---
const API_KEYS = [
    import.meta.env.VITE_GEMINI_API_KEY_1,
    import.meta.env.VITE_GEMINI_API_KEY_2,
    import.meta.env.VITE_GEMINI_API_KEY_3,
    import.meta.env.VITE_GEMINI_API_KEY_4, // Original key as fallback/final option
].filter(Boolean) as string[];

let currentKeyIndex = 0;

console.log(`[Gemini] Loaded ${API_KEYS.length} API Keys.`);

const getGenAI = () => new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);

const rotateKey = () => {
    const prevIndex = currentKeyIndex;
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    console.warn(`[Gemini] API Key Rotation: ${prevIndex} -> ${currentKeyIndex}`);
};

/**
 * Generic Wrapper for Gemini API calls with specific Error Handling for 429/Quota.
 */
async function executeWithRetry<T>(
    operation: (model: any) => Promise<T>,
    modelNameCallback: () => Promise<string>,
    systemInstruction?: string,
    jsonMode: boolean = true
): Promise<T> {
    let lastError: any;

    // Try each key once (total attempts = number of keys)
    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
        try {
            const modelName = await modelNameCallback();
            const genAI = getGenAI();
            const modelParams: any = {
                model: modelName,
            };
            if (jsonMode) {
                modelParams.generationConfig = { responseMimeType: "application/json" };
            }
            if (systemInstruction) {
                modelParams.systemInstruction = systemInstruction;
            }

            const model = genAI.getGenerativeModel(modelParams);

            return await operation(model);

        } catch (error: any) {
            lastError = error;
            const msg = error.message || '';
            const isQuotaError = msg.includes('429') ||
                msg.includes('Resource has been exhausted') ||
                msg.includes('Too Many Requests');

            if (isQuotaError) {
                console.warn(`[Gemini] Quota exhausted on Key ${currentKeyIndex}. Retrying with next key...`);
                rotateKey();
                // Continue loop to retry with new key
                continue;
            } else {
                // If it's not a quota error, throw immediately (e.g. 400 Bad Request)
                throw error;
            }
        }
    }

    throw new Error(`[Gemini] All API keys have been exhausted or failed. Last error: ${lastError?.message}`);
}


export interface QuestionData {
    type: string;
    question: string;
    answer: string;
    options?: string[]; // Multiple choice options
    explanation: string;
    page: number; // Inferred or passed
    concept?: string; // Grammar concept or reading skill
    question_number?: string; // Extracted number label (e.g. "1", "3-a")
    itemId: string; // [STABLE ID] Required for matching with grading
    page_topic?: string; // [NEW] Thematic topic for the entire page/passage
}

export interface AnswerMap {
    [questionNumber: string]: string; // "1": "3", "2": "5"
}

// --- Dynamic Model Discovery ---
let cachedModel: string | null = null;

const getDynamicModel = async (): Promise<string> => {
    // 1. Return cached model if available
    if (cachedModel) return cachedModel;

    try {
        // Query models using the CURRENT key
        const currentKey = API_KEYS[currentKeyIndex];
        console.log(`[Gemini] Querying available models with Key Index ${currentKeyIndex}...`);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentKey}`);

        if (!response.ok) {
            console.warn(`[Gemini] Failed to fetch models (${response.status}). Using safe fallback.`);
            // Fallback: 2.5 Flash -> 2.0 Flash
            return 'gemini-2.0-flash';
        }

        const data = await response.json();
        const availableModels = (data.models || [])
            .map((m: any) => m.name.replace('models/', ''));

        console.log("[Gemini] Available models:", availableModels);

        const priorityList = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            // User explicitly requested to remove 1.5-flash and Pro models.
        ];

        for (const model of priorityList) {
            if (availableModels.includes(model)) {
                console.log(`[Gemini] Best model selected: ${model}`);
                cachedModel = model;
                return model;
            }
        }

        console.warn(`[Gemini] No preferred Flash model found. Fallback to gemini-2.0-flash.`);
        cachedModel = 'gemini-2.0-flash';
        return cachedModel;

    } catch (error) {
        console.error("[Gemini] Model discovery error:", error);
        return 'gemini-2.0-flash';
    }
};

// --- Step 1: Fast Answer Key Extraction (OMR Mode) ---
export const extractAnswerMap = async (text: string): Promise<AnswerMap> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    const prompt = `
     You are a precise data extractor.
     Your ONLY task is to extract Question Numbers and their Correct Answers from the provided text.
     
     **Input Text** contains questions and answers (or just answer key).
     
     **Instructions**:
     1. Find every question number (1, 2, 3...) and its answer.
     2. Return a simple JSON map: {"1": "3", "2": "5", "3": "A", ...}
     3. Strict JSON only.
     
     **Input Content**:
     ${text.substring(0, 25000)}
     `;

    return executeWithRetry(async (model) => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text());
    }, getDynamicModel);
};

// --- Step 3: Deep Analysis with Verified Answers ---
export const analyzeDeepWithVerifiedAnswers = async (questionText: string, verifiedAnswers: AnswerMap, bookId: string = "book"): Promise<QuestionData[]> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    const verifiedAnswersStr = JSON.stringify(verifiedAnswers, null, 2);

    const prompt = `
    You are an expert English teacher.
    Perform a DEEP ANALYSIS of the provided English textbook content.
    
    **CRITICAL**: You are provided with a **VERIFIED ANSWER KEY**.
    You MUST use this key. Do NOT attempt to solve the questions yourself.
    match the Question Number in the verification key to the content.
    
    **Verified Answer Key**:
    ${verifiedAnswersStr}

    **Task**:
    1. Extract Question Text and Options.
    2. **Concept [CRITICAL]**: Identify the highly granular grammatical concept. 
       - Bad: "Grammar", "Be-verb"
       - Good: "be-verb (negative sentence)", "relative pronoun 'who' (subjective)", "present continuous (question form)". 
       - This is critical for generating "Twin Questions" later.
    3. **itemId [STABLE ID]**: Generate a globally unique ID using the format '${bookId}_\${page}_\${question_number}' (e.g., '${bookId}_14_q1', '${bookId}_15_q2-a'). 
       This is mandatory to prevent data collisions across different chapters and books.
    4. **Explanation**: Write a detailed explanation in Korean explaining WHY the verified answer is correct.
    5. **Type**: Classify (GRAMMAR, READING, VOCABULARY, LISTENING).
    6. **Page**: meaningful page number.
    7. **Review Mode**: This is for a "Review Test". Ensure explanations are helpful for students reviewing their wrong answers.
    
    Output: JSON Array of QuestionData objects.
    
    **Content**:
    ${questionText.substring(0, 30000)}
    `;

    return executeWithRetry(async (model) => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (!Array.isArray(parsed)) throw new Error('AI response is not a valid array');
        return parsed;
    }, getDynamicModel);
};

// --- Legacy / Direct Analysis ---
export const analyzeText = async (questionText: string, answerKeyText: string | null, bookId: string = "book"): Promise<QuestionData[]> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    const prompt = `
    You are an expert English teacher.
    Analyze the following English textbook content and extract questions specifically from **Assessment Sections**.
    You are provided with the **Question File Content** and an optional **Answer Key Content**.
    
    Target Sections:
    - Review Tests, Unit Tests, Chapter Tests
    - Comprehensive Tests (단원 종합 문제), Actual Tests (실전 모의고사)
    
    **CRITICAL GOAL**:
    - We need to generate a "Student Weakness Report" later. 
    - Therefore, for EVERY question, you MUST identify the specific **Sub-Concept** (e.g., "to-infinitive (adjective)", "relative pronoun who vs which", "topic sentence").
    - Group questions by **Page Number** exactly as they appear in the text (look for [Page N] markers).
    
    **INSTRUCTIONS**:
    1. **Page Number**: Extract the page number for every question. If a question spans pages, use the starting page.
    2. **Concept [HIGH PRECISION]**: Identify the granular concept or skill. 
       - Grammar Example: "to-infinitive (adjectival use)", "relatives (who vs. whom)", "subjunctive mood (past)"
       - Reading Example: "topic inference", "detail detection", "logical sequence"
    3. **itemId [STABLE ID]**: Generate a globally unique ID using the format '${bookId}_\${page}_\${question_number}' (e.g., '${bookId}_14_q1', '${bookId}_15_q2-a').
    4. **Answer**: Use the provided 'Answer Key Content' to find the correct answer. If not found, solve it yourself but mark it as tentative.
    5. **Explanation**: Provide a clear, helpful explanation in **Korean**. Focus on WHY the answer is correct and why others are wrong.
    6. **Type**: Classify into 'GRAMMAR', 'READING', 'VOCABULARY', 'LISTENING'.
    7. **Page Topic [NEW]**: Identify the overarching **Theme or Topic** of the passage on this page (e.g., "A Great Teacher (Helen Keller)", "The Solar System").
    
    Output Format: JSON Array of objects.
    
    Structure:
    [
      {
        "type": "GRAMMAR" | "READING" | "VOCABULARY",
        "question_number": "number or label like '1', 'A-1'",
        "itemId": "${bookId}_14_q1",
        "question": "Question text...",
        "answer": "Correct answer",
        "options": ["Option A", "Option B", "Option C", "Option D"], (or null)
        "explanation": "Detailed explanation in Korean...",
        "concept": "Specific concept (e.g. '투부정사의 형용사적 용법', '관계대명사 what')",
        "page_topic": "Page-level theme/topic",
        "page": 1
      }
    ]

    ---
    **Answer Key Content**:
    ${answerKeyText ? answerKeyText.substring(0, 10000) : 'No answer key provided.'}

    ---
    **Question File Content**:
    ${questionText.substring(0, 30000)}
    `;

    return executeWithRetry(async (model) => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (!Array.isArray(parsed)) throw new Error('AI response is not a valid array');
        return parsed;
    }, getDynamicModel);
};

export const analyzeImages = async (images: string[], answerKeyText: string | null = null, bookId: string = "book"): Promise<QuestionData[]> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    const prompt = `
    You are an expert English teacher.
    Analyze the following IMAGES of an English textbook and extract questions specifically from **Assessment Sections**.
    
    Target Sections:
    - Review Tests, Unit Tests, Chapter Tests
    - Comprehensive Tests, Actual Tests 

    **REFERENCE DATA**:
    The user has provided an ANSWER KEY (text format) below. 
    You MUST search this key for the matching question number and use the provided answer as the "Correct Answer".
    If the key is provided but you cannot find the number, solve it yourself.
    
    [Answer Key Content]:
    ${answerKeyText ? answerKeyText.substring(0, 10000) : 'No answer key provided.'}
    
    **CRITICAL GOAL**:
    - Identify specific **Sub-Concepts** for Weakness Analysis.
    - Group by **Page Number**.
    
    **INSTRUCTIONS**:
    1. **Page Number**: Infer page number from the image content (look for page markers).
    2. **Concept [HIGH PRECISION]**: Identify the granular concept or reading skill. 
       - Use Korean terms for grammar concepts if appropriate (e.g., "관계대명사", "가정법 과거").
    3. **itemId [STABLE ID]**: Generate a globally unique ID using the format '${bookId}_\${page}_\${question_number}' (e.g., '${bookId}_14_q1', '${bookId}_15_q2-a').
    4. **Answer**: Solve the question yourself accurately (since answer key is not provided in images usually).
    5. **Explanation**: Provide a detailed explanation in **Korean**.
    6. **Type**: Classify into 'GRAMMAR', 'READING', 'VOCABULARY', 'LISTENING'.
    7. **Page Topic [NEW]**: Identify the overarching **Theme or Topic** of the passage on this page.
    
    Output Format: JSON Array of objects.
    
    Structure:
    [
      {
        "type": "GRAMMAR" | "READING" | "VOCABULARY",
        "question_number": "number or label like '1', 'A-1'",
        "itemId": "${bookId}_14_q1",
        "question": "Question text...",
        "answer": "Correct answer",
        "options": ["Option A", "Option B", "Option C", "Option D"], (or null)
        "explanation": "Detailed explanation in Korean",
        "concept": "Specific concept (Korean preferred)",
        "page_topic": "Page-level theme/topic",
        "page": 1
      }
    ]
    `;

    const imageParts = images.map(img => ({
        inlineData: {
            data: img,
            mimeType: "image/jpeg",
        },
    }));

    return executeWithRetry(async (model) => {
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (!Array.isArray(parsed)) throw new Error('AI response is not a valid array');
        return parsed;
    }, getDynamicModel);
};

// --- Step 4: Regenerate Explanations for Verified Questions ---
export const regenerateExplanations = async (questions: QuestionData[]): Promise<QuestionData[]> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    // Limit batch size to avoid token limits.
    const BATCH_SIZE = 10;
    const resultQuestions: QuestionData[] = [];

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questions.slice(i, i + BATCH_SIZE);
        const batchContent = JSON.stringify(batch.map(q => ({
            itemId: q.itemId, // Use stable ID for matching
            question: q.question,
            answer: q.answer,
            options: q.options
        })), null, 2);

        const prompt = `
        You are an expert English teacher.
        The user has MANUALLY VERIFIED the answers for the following questions.
        However, the current 'explanation' and 'concept' might be outdated or incorrect.
        
        **YOUR TASK**:
        1. Read each Question and its **VERIFIED ANSWER**.
        2. Generate a NEW, ACCURATE **Explanation** explaining why this answer is correct.
        3. Identify the specific **Grammar Concept** (Weakness Point).
        
        **INPUT DATA**:
        ${batchContent}
        
        **OUTPUT FORMAT**:
        Return a JSON Array of objects with:
        - "itemId": (must match input itemId)
        - "explanation": (NEW detailed explanation in Korean)
        - "concept": (NEW specific concept)
        `;

        try {
            const analyzedBatch = await executeWithRetry(async (model) => {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                const cleanJson = text.replace(/```json\n?|```/g, '').trim();
                return JSON.parse(cleanJson);
            }, getDynamicModel);

            // Merge back
            batch.forEach((q) => {
                const analyzed = Array.isArray(analyzedBatch)
                    ? analyzedBatch.find((a: any) => a.itemId === q.itemId)
                    : null;

                if (analyzed) {
                    resultQuestions.push({
                        ...q,
                        explanation: analyzed.explanation || q.explanation,
                        concept: analyzed.concept || q.concept
                    });
                } else {
                    resultQuestions.push(q);
                }
            });

        } catch (error) {
            console.error(`Batch regeneration failed for ${i}~${i + BATCH_SIZE}:`, error);
            resultQuestions.push(...batch);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    return resultQuestions;
};

// --- Step 5: Generate Comprehensive Learning Report ---
export interface ReportInputData {
    studentName: string;
    period: string;
    totalQuestions: number;
    accuracy: number;
    weaknessConcepts: { concept: string; errorRate: number }[];
    strengthConcepts: { concept: string; accuracy: number }[];
    recentTopics: string[]; // Topics found in questions
    topicsByCategory?: Record<string, string[]>; // New: breakdown by category
    conceptsByCategory?: Record<string, { strong: any[], weak: any[] }>; // [NEW] Per-category performance
    // Trend Context
    prevAccuracy?: number;
    prevWeakness?: string;
}

export interface CategoryAnalysisData {
    category: string;
    themes: string[];
    performance: { strong: any[], weak: any[] };
    accuracy: number;
}

export const generateLearningReport = async (data: ReportInputData): Promise<any> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    const prompt = `
    You are an expert academic counselor at a premium English academy ("JEUS Academy").
    Write a "Monthly Learning Report" for a student.

    **Student Data**:
    - Name: ${data.studentName}
    - Period: ${data.period}
    - Accuracy: ${data.accuracy}% (Total ${data.totalQuestions} questions)
    - Strong Points: ${data.strengthConcepts.map(s => `${s.concept} (${s.accuracy}%)`).join(', ')}
    - Covered Topics: ${data.recentTopics.join(', ')}
    - Breakdown by Category (Themes & Performance):
      ${Object.entries(data.topicsByCategory || {}).filter(([_, v]) => v.length > 0).map(([k, v]) => {
        const perf = data.conceptsByCategory?.[k] || { strong: [], weak: [] };
        return `* ${k}:
          - Themes: ${v.join(', ')}
          - Strengths: ${perf.strong.map(s => s.concept).join(', ')}
          - Weaknesses: ${perf.weak.map(w => w.concept).join(', ')}`;
    }).join('\n      ')}

    **Category Performance** (Concepts and Accuracy):
    - Strength Concepts: ${data.strengthConcepts.map(s => `${s.concept} (${s.accuracy}%)`).join(', ')}
    - Weakness Concepts: ${data.weaknessConcepts.map(w => `${w.concept} (${w.errorRate}% Error)`).join(', ')}

    **Historical Trends** (Comparison with previous report):
    ${data.prevAccuracy !== undefined ? `- Previous Accuracy: ${data.prevAccuracy}%` : '- No previous report found.'}
    ${data.prevWeakness ? `- Previous Major Weakness: ${data.prevWeakness}` : ''}

    **Your Task**:
    Generate a JSON object with the following fields.
    **IMPORTANT**: Field 1-4 MUST be in **KOREAN (Hangul)**. Field 5 is Numeric.

    1. **learned_content**: A concise summary of what was studied this month (Korean).
    2. **categories**: A detailed analysis for each category present in "Breakdown by Category".
       Structure: { 
         "GRAMMAR": { "themes": "...", "strengths": "...", "weaknesses": "...", "prescription": "..." },
         "READING": { "themes": "...", "strengths": "...", "weaknesses": "...", "prescription": "..." },
         ... 
       }
       - **themes**: Major topics/titles covered. (Use the specific passage topics provided in the Breakdown like "Helen Keller" if available).
       - **strengths**: Specific types or skills the student mastered. **IMPORTANT**: Directly reference the specific themes/topics they worked on (e.g., "In the reading about Helen Keller, the student showed...").
       - **weaknesses**: Specific concepts or question types needing work. **IMPORTANT**: Relate these to the actual topics studied where possible.
       - **prescription**: Actionable advice.
    3. **teacher_comment**: A warm, encouraging overall letter.
    4. **radar**: Recommended scores (0-100) for Five-Sided Analysis.

    **Output JSON Structure**:
    {
        "learned_content": "...",
        "categories": { ... },
        "teacher_comment": "...",
        "radar": { "grammar": 85, ... }
    }
    `;

    return executeWithRetry(async (model) => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text());
    }, getDynamicModel);
};

export const generateCategoryAnalysis = async (data: CategoryAnalysisData): Promise<any> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    const prompt = `
    You are a specialized academic consultant for ${data.category} at JEUS Academy.
    Analyze the following student data for ONLY the ${data.category} section.

    **${data.category} Data**:
    - Accuracy: ${data.accuracy}%
    - Studied Themes/Passages: ${data.themes.join(', ')}
    - Mastery: ${data.performance.strong.map(s => s.concept).join(', ')}
    - Weak Areas: ${data.performance.weak.map(w => w.concept).join(', ')}

    **Your Task**:
    Generate a JSON object with strictly focused analysis for ${data.category}.
    **IMPORTANT**: Use KOREAN (Hangul). 
    - ${data.category === 'READING' ? 'Focus on passage themes and comprehension skills. DO NOT mention grammar rules unless they directly impede comprehension of these specific passages.' : 'Focus on logic, rules, and application accuracy.'}

    **Output Structure**:
    {
        "themes": "Summary of specific topics or book units covered",
        "strengths": "${data.category === 'READING' ? 'Narrative feedback about specific themes like \"' + (data.themes[0] || '...') + '\"' : 'Feedback on mastered concepts'}",
        "weaknesses": "Detailed explanation of what went wrong in this category",
        "prescription": "Actionable advice for this category"
    }
    `;

    try {
        return await executeWithRetry(async (model) => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return JSON.parse(response.text());
        }, getDynamicModel);
    } catch (error) {
        console.error(`Category analysis failed for ${data.category}:`, error);
        return {
            themes: data.themes.join(', '),
            strengths: "성실하게 학습에 참여하며 주요 개념을 익히고 있습니다.",
            weaknesses: "일부 심화 문항에서 다소 정답률이 떨어지는 모습이 관찰됩니다.",
            prescription: "오답 노트를 통해 틀린 이유를 복습하고 반복 학습할 것을 권장합니다."
        };
    }
};

/**
 * [OPTIMIZED] Single-call report generation for batch processing.
 * Combines all category analysis into ONE API call for maximum cost efficiency.
 * Uses Gemini 3.0 Flash directly for speed and low cost.
 */
export interface OptimizedReportInput {
    studentName: string;
    period: string;
    totalQuestions: number;
    accuracy: number;
    grammarData?: {
        themes: string[];
        strong: string[];
        weak: string[];
        accuracy: number;
    };
    readingData?: {
        themes: string[];
        strong: string[];
        weak: string[];
        accuracy: number;
    };
}

export const generateOptimizedReport = async (data: OptimizedReportInput): Promise<any> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    const grammarSection = data.grammarData ? `
    **문법(GRAMMAR)**:
    - 정답률: ${data.grammarData.accuracy}%
    - 학습 주제: ${data.grammarData.themes.join(', ')}
    - 강점: ${data.grammarData.strong.join(', ') || '없음'}
    - 약점: ${data.grammarData.weak.join(', ') || '없음'}` : '';

    const readingSection = data.readingData ? `
    **독해(READING)**:
    - 정답률: ${data.readingData.accuracy}%
    - 학습 지문: ${data.readingData.themes.join(', ')}
    - 강점: ${data.readingData.strong.join(', ') || '없음'}
    - 약점: ${data.readingData.weak.join(', ') || '없음'}` : '';

    const prompt = `당신은 JEUS 영어학원의 학습보고서 작성 전문가입니다.
아래 데이터를 기반으로 월간 학습보고서를 JSON 형식으로 작성해주세요.

**학생 정보**:
- 이름: ${data.studentName}
- 기간: ${data.period}
- 전체 정답률: ${data.accuracy}% (총 ${data.totalQuestions}문항)
${grammarSection}
${readingSection}

**출력 형식** (반드시 이 JSON 구조만 출력):
{
    "learned_content": "이번 달 학습 내용 요약 (2-3문장)",
    "categories": {
        ${data.grammarData ? `"GRAMMAR": {
            "themes": "학습한 문법 주제 요약",
            "strengths": "문법 강점 분석",
            "weaknesses": "문법 약점 분석",
            "prescription": "문법 학습 처방"
        }` : ''}${data.grammarData && data.readingData ? ',' : ''}
        ${data.readingData ? `"READING": {
            "themes": "학습한 독해 지문/주제 요약",
            "strengths": "독해 강점 분석",
            "weaknesses": "독해 약점 분석",
            "prescription": "독해 학습 처방"
        }` : ''}
    },
    "teacher_comment": "학부모님께 드리는 따뜻한 종합 소견문 (3-4문장)"
}

**중요 지침**:
1. 모든 분석 내용은 반드시 **한국어(Korean)**로 작성하세요.
2. 학습한 모든 단원/챕터명(themes)이 누락되지 않도록 **반드시 전체 목록을 반영**하여 요약하세요. (특정 단원 하나만 강조하지 말고, 전체 범위를 보여주세요)
3. 독해(READING) 섹션의 지문 제목이 영어라도, 분석 내용(strengths, weaknesses, prescription)은 **반드시 한국어**로 작성하세요.
4. JSON만 출력하세요.
5. 영어 단어나 문법 용어는 괄호 안에 병기할 수 있습니다. 예: "관계대명사(Relative Pronoun)"`;

    try {
        return await executeWithRetry(async (model) => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return JSON.parse(response.text());
        }, getDynamicModel);
    } catch (error) {
        console.error('Optimized Report Generation Failed:', error);
        // Return template fallback
        return {
            learned_content: `${data.period} 동안 영어 학습을 진행했습니다. 총 ${data.totalQuestions}문항 중 ${data.accuracy}%의 정답률을 기록했습니다.`,
            categories: {
                ...(data.grammarData && {
                    GRAMMAR: {
                        themes: data.grammarData.themes.join(', '),
                        strengths: data.grammarData.strong.length > 0 ? `${data.grammarData.strong.join(', ')} 개념을 잘 이해하고 있습니다.` : '기본 문법 개념을 성실하게 학습하고 있습니다.',
                        weaknesses: data.grammarData.weak.length > 0 ? `${data.grammarData.weak.join(', ')} 부분에서 추가 학습이 필요합니다.` : '전반적으로 고른 실력을 보이고 있습니다.',
                        prescription: '오답 노트를 활용하여 틀린 문제를 복습할 것을 권장합니다.'
                    }
                }),
                ...(data.readingData && {
                    READING: {
                        themes: data.readingData.themes.join(', '),
                        strengths: data.readingData.strong.length > 0 ? `${data.readingData.strong.join(', ')} 유형을 잘 풀고 있습니다.` : '지문 이해력이 향상되고 있습니다.',
                        weaknesses: data.readingData.weak.length > 0 ? `${data.readingData.weak.join(', ')} 유형에서 어려움을 보이고 있습니다.` : '전반적으로 안정적인 독해력을 보이고 있습니다.',
                        prescription: '매일 영어 지문 1개씩 읽고 핵심 내용을 요약하는 연습을 권장합니다.'
                    }
                })
            },
            teacher_comment: `${data.studentName} 학생은 이번 달 영어 학습에 성실하게 참여했습니다. 앞으로도 꾸준한 노력을 기대합니다.`
        };
    }
};

// --- Step 6: AI-Assisted Vocab Cleaning ---
export const cleanVocabData = async (rawData: any[]): Promise<Partial<VocabWord>[]> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    const prompt = `
    You are a professional English lexicographer. 
    The user provided a list of English words and meanings (possibly messy or incomplete).
    
    **TASK**:
    1. Clean the word and meaning (fix typos, normalize format).
    2. If the 'example_sentence' is missing or too simple, generate a HIGH-QUALITY, level-appropriate example sentence.
    3. Return a clean JSON Array of objects with: "word", "meaning", "example_sentence".
    
    **INPUT**:
    ${JSON.stringify(rawData.slice(0, 50))}
    `;

    try {
        return await executeWithRetry(async (model) => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleanJson = text.replace(/```json\n?|```/g, '').trim();
            return JSON.parse(cleanJson);
        }, getDynamicModel);
    } catch (error) {
        console.error('AI Vocab Cleaning Failed:', error);
        return rawData; // Fallback to raw if AI fails
    }
};

// --- Step 7: AI-Powered Vocab Extraction from Raw Text ---
export const extractVocabFromText = async (text: string): Promise<Partial<VocabWord>[]> => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API Keys provided.');

    const prompt = `
    You are an expert English teacher's assistant.
    Below is a raw text extracted from a Word or PDF document containing vocabulary lists.
    
    **TASK**:
    1. Identify all English words and their corresponding Korean meanings.
    2. Extract them into a clean JSON array of objects.
    3. If an example sentence is found in the text, include it. If not, leave it empty.
    4. Format: [{"word": "string", "meaning": "string", "example_sentence": "string"}]
    
    **TEXT**:
    ${text.slice(0, 10000)}
    `;

    try {
        return await executeWithRetry(async (model) => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            const cleanJson = responseText.replace(/```json\n?|```/g, '').trim();
            return JSON.parse(cleanJson);
        }, getDynamicModel);
    } catch (error) {
        console.error('AI Vocab Extraction Failed:', error);
        throw new Error('Failed to extract vocabulary from text using AI');
    }
};
