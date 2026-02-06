import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

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
        console.log("[Gemini] Querying available models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);

        if (!response.ok) {
            console.warn(`[Gemini] Failed to fetch models (${response.status}). Using safe fallback.`);
            cachedModel = 'gemini-1.5-flash-latest';
            return cachedModel;
        }

        const data = await response.json();
        // Remove 'models/' prefix and filter for valid generation models
        const availableModels = (data.models || [])
            .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
            .map((m: any) => m.name.replace('models/', ''));

        console.log("[Gemini] Available models:", availableModels);

        if (availableModels.length === 0) {
            console.warn("[Gemini] No 'generateContent' models found. Using fallback.");
            return 'gemini-1.5-flash-latest';
        }

        // 2. Priority List (Updated for Gemini 3.0)
        const priorityList = [
            'gemini-3.0-flash',       // Newest, fastest, cost-effective
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-2.0-flash',
            'gemini-2.0-pro-exp',
            'gemini-1.5-pro-latest',
            'gemini-1.5-pro',
            'gemini-1.5-flash-latest',
        ];

        // 3. Find first match in priority list
        for (const model of priorityList) {
            if (availableModels.includes(model)) {
                console.log(`[Gemini] Best model selected: ${model}`);
                cachedModel = model;
                return model;
            }
        }

        // 4. Smart Fallback: Prefer "flash" then "pro" from valid list
        const fallbackFlash = availableModels.find((m: string) => m.includes('flash') && !m.includes('image'));
        if (fallbackFlash) {
            console.log(`[Gemini] Smart fallback (Flash): ${fallbackFlash}`);
            cachedModel = fallbackFlash;
            return fallbackFlash;
        }

        const fallbackPro = availableModels.find((m: string) => m.includes('pro') && !m.includes('image'));
        if (fallbackPro) {
            console.log(`[Gemini] Smart fallback (Pro): ${fallbackPro}`);
            cachedModel = fallbackPro;
            return fallbackPro;
        }

        // 5. Ultimate Fallback: Just grab the first valid one
        console.warn(`[Gemini] No preferred model found. Using first available: ${availableModels[0]}`);
        cachedModel = availableModels[0];
        return cachedModel as string;

    } catch (error) {
        console.error("[Gemini] Model discovery error:", error);
        cachedModel = 'gemini-1.5-flash-latest';
        return cachedModel;
    }
};

// --- Step 1: Fast Answer Key Extraction (OMR Mode) ---
export const extractAnswerMap = async (text: string): Promise<AnswerMap> => {
    if (!API_KEY) throw new Error('Gemini API Key is missing');
    const modelName = await getDynamicModel();
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
     You are a precise data extractor.
     Your ONLY task is to extract Question Numbers and their Correct Answers from the provided text.
     
     **Input Text** contains questions and answers (or just answer key).
     
     **Instructions**:
     1. Find every question number (1, 2, 3...) and its answer.
     2. Return a simple JSON map: {"1": "3", "2": "5", "3": "A", ...}
     3. Strict JSON only. No markdown.
     
     **Input Content**:
     ${text.substring(0, 25000)}
     `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Cleanup JSON
        const cleaned = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Answer Map Extraction Failed:", e);
        return {};
    }
};

// --- Step 3: Deep Analysis with Verified Answers ---
export const analyzeDeepWithVerifiedAnswers = async (questionText: string, verifiedAnswers: AnswerMap): Promise<QuestionData[]> => {
    if (!API_KEY) throw new Error('Gemini API Key is missing');
    const modelName = await getDynamicModel();
    const model = genAI.getGenerativeModel({ model: modelName });

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
    3. **itemId [STABLE ID]**: Generate a stable ID based on the question number (e.g., "q1", "q2-a").
    4. **Explanation**: Write a detailed explanation in Korean explaining WHY the verified answer is correct.
    5. **Type**: Classify (GRAMMAR, READING, VOCABULARY, LISTENING).
    6. **Page**: meaningful page number.
    
    Output: JSON Array of QuestionData objects.
    
    **Content**:
    ${questionText.substring(0, 30000)}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanedText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error('Gemini Deep Analysis Error:', error);
        throw new Error('Failed to analyze content with AI');
    }
};

// --- Legacy / Direct Analysis ---
export const analyzeText = async (questionText: string, answerKeyText: string | null): Promise<QuestionData[]> => {
    // Legacy wrapper for direct analysis if needed
    // For now, let's keep it but ideally we use the 2-step flow.
    // We can simulate 2-step internally: extract map -> analyze deep.
    // But to save tokens/time, keeping the old prompt is fine for "Direct Mode".

    if (!API_KEY) throw new Error('Gemini API Key is missing');

    const modelName = await getDynamicModel();
    const model = genAI.getGenerativeModel({ model: modelName });

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
    2. **Concept [HIGH PRECISION]**: Identify the granular concept or skill. Be extremely specific (e.g., "past tense irregular verbs" instead of "past tense").
    3. **itemId**: Generate a stable id like 'q1', 'q5'.
    4. **Answer**: Use the provided 'Answer Key Content' to find the correct answer. If not found, solve it yourself but mark it as tentative.
    5. **Type**: Classify into 'GRAMMAR', 'READING', 'VOCABULARY', 'LISTENING'.
    6. **Page Topic [NEW]**: Identify the overarching **Theme or Topic** of the passage on this page (e.g., "A Great Teacher (Helen Keller)", "The Solar System"). This is crucial for reports.
    
    Output Format: JSON Array of objects.
    
    Structure:
    [
      {
        "type": "GRAMMAR" | "READING" | "VOCABULARY",
        "question_number": "number or label like '1', 'A-1'",
        "itemId": "stable unique id like 'q1', 'q3-a'",
        "question": "Question text...",
        "answer": "Correct answer",
        "options": ["Option A", "Option B", "Option C", "Option D"], (or null)
        "explanation": "Detailed explanation in Korean...",
        "concept": "Specific concept (e.g. '동명사 주어', '관계대명사 what')",
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

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResult = response.text();

        // Cleanup JSON markdown
        const cleanedText = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error('Gemini Analysis Error:', error);
        throw new Error('Failed to analyze content with AI');
    }
};

export const analyzeImages = async (images: string[], answerKeyText: string | null = null): Promise<QuestionData[]> => {
    if (!API_KEY) {
        throw new Error('Gemini API Key is missing');
    }

    const modelName = await getDynamicModel();
    const model = genAI.getGenerativeModel({ model: modelName });

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
    2. **Concept [HIGH PRECISION]**: Identify the granular concept or reading skill. Provide the level of detail required for practice question matching.
    3. **itemId**: Generate a stable id like 'q1', 'q5'.
    4. **Answer**: Solve the question yourself accurately (since answer key is not provided in images usually).
    5. **Type**: Classify into 'GRAMMAR', 'READING', 'VOCABULARY', 'LISTENING'.
    6. **Page Topic [NEW]**: Identify the overarching **Theme or Topic** of the passage on this page.
    
    Output Format: JSON Array of objects.
    
    Structure:
    [
      {
        "type": "GRAMMAR" | "READING" | "VOCABULARY",
        "question_number": "number or label like '1', 'A-1'",
        "itemId": "stable unique id like 'q1', 'q5'",
        "question": "Question text...",
        "answer": "Correct answer",
        "options": ["Option A", "Option B", "Option C", "Option D"], (or null)
        "explanation": "Detailed explanation in Korean...",
        "concept": "Specific concept",
        "page_topic": "Page-level theme/topic",
        "page": 1
      }
    ]
    `;

    try {
        const imageParts = images.map(img => ({
            inlineData: {
                data: img,
                mimeType: "image/jpeg",
            },
        }));

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const textResult = response.text();

        const cleanedText = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error('Gemini Vision Analysis Error:', error);
        throw new Error('Failed to analyze images with AI');
    }
};

// --- Step 4: Regenerate Explanations for Verified Questions ---
export const regenerateExplanations = async (questions: QuestionData[]): Promise<QuestionData[]> => {
    if (!API_KEY) throw new Error('Gemini API Key is missing');
    const modelName = await getDynamicModel();
    const model = genAI.getGenerativeModel({ model: modelName });

    // Limit batch size to avoid token limits.
    const BATCH_SIZE = 10;
    const resultQuestions: QuestionData[] = [];

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questions.slice(i, i + BATCH_SIZE);
        // Minimal context for regeneration
        const batchContent = JSON.stringify(batch.map((q, idx) => ({
            id: idx,
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
        - "id": (must match input id)
        - "explanation": (NEW detailed explanation in Korean)
        - "concept": (NEW specific concept)
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            const analyzedBatch = JSON.parse(text);

            // Merge back
            batch.forEach((q, idx) => {
                const analyzed = analyzedBatch.find((a: any) => a.id === idx);
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
    if (!API_KEY) throw new Error('Gemini API Key is missing');
    const modelName = await getDynamicModel();
    const model = genAI.getGenerativeModel({ model: modelName });

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

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error('Report Generation Failed:', error);
        throw new Error('Failed to generate report');
    }
};

/**
 * Fundamental Separation: Analyzes a SINGLE category (Reading or Grammar)
 * This prevents context leakage between unrelated subjects.
 */
export const generateCategoryAnalysis = async (data: CategoryAnalysisData): Promise<any> => {
    if (!API_KEY) throw new Error('Gemini API Key is missing');
    const modelName = await getDynamicModel();
    const model = genAI.getGenerativeModel({ model: modelName });

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
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
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
    if (!API_KEY) throw new Error('Gemini API Key is missing');

    // Use dynamic model discovery - it will prioritize Flash models automatically
    const modelName = await getDynamicModel();
    console.log(`[Optimized Report] Using model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

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
4. JSON만 출력하세요 (마크다운 코드블록 없이).
5. 영어 단어나 문법 용어는 괄호 안에 병기할 수 있습니다. 예: "관계대명사(Relative Pronoun)"`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
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
