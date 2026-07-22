const env = require('../config/env');
const logger = require('../config/logger');
const { ApiError } = require('../middleware/errorHandler');
const { capText } = require('../utils/textChunker');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Gemini's 429 error can report the wait time two different ways: a structured
// RetryInfo detail like "retryDelay": "13s", OR plain text in the message itself
// like "Please retry in 59.354236279s." Check both, since relying on only one
// pattern meant some rate-limit responses fell through to an unhelpfully short
// default wait and immediately failed again on retry.
function parseRetryDelayMs(errBody) {
  const structuredMatch = errBody.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  const textMatch = errBody.match(/retry in ([\d.]+)\s*s/i);
  const seconds = structuredMatch?.[1] ?? textMatch?.[1];
  if (!seconds) return null;
  return Math.ceil(parseFloat(seconds) * 1000) + 250; // small buffer
}

// Only worth auto-retrying within the same request if the wait is short - otherwise
// we'd hold the HTTP connection open for a long time for no benefit (the client may
// time out anyway). Above this, just surface the clear error and let the user retry
// manually once the quota window resets.
const MAX_AUTO_RETRY_WAIT_MS = 10000;

// Low-level wrapper around Google AI Studio's Gemini generateContent API.
// `systemPrompt` steers task behavior; `userPrompt` carries the document/task content.
// Set `jsonMode: true` to ask Gemini to strictly return a JSON object.
// Automatically retries once on HTTP 429 (rate limit / quota exhausted), since Google
// AI Studio's free tier has fairly low requests-per-minute limits.
async function callGemini(systemPrompt, userPrompt, { maxTokens = 1500, jsonMode = false } = {}) {
  if (!env.gemini.apiKey) {
    throw new ApiError(500, 'AI service is not configured (missing GEMINI_API_KEY)');
  }

  const url = `${GEMINI_BASE_URL}/${env.gemini.model}:generateContent`;

  const makeRequest = () =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.gemini.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });

  let response = await makeRequest();

  if (response.status === 429) {
    const firstErrBody = await response.text();
    const waitMs = parseRetryDelayMs(firstErrBody);

    if (waitMs !== null && waitMs <= MAX_AUTO_RETRY_WAIT_MS) {
      logger.warn(`Gemini rate limited, retrying once after ${waitMs}ms`);
      await sleep(waitMs);
      response = await makeRequest();
    } else {
      // Wait is long (or unknown) - don't hold the request open guessing; surface
      // the real error immediately so the user sees exactly how long to wait.
      logger.warn(`Gemini rate limited, wait (${waitMs}ms) exceeds auto-retry threshold; failing fast`);
      let detail = firstErrBody;
      try {
        detail = JSON.parse(firstErrBody).error?.message || firstErrBody;
      } catch {
        // not JSON, use as-is
      }
      throw new ApiError(429, `AI service is rate-limited: ${detail}`);
    }
  }

  if (!response.ok) {
    const errBody = await response.text();
    logger.error(`Gemini API error ${response.status}: ${errBody}`);

    // Try to extract Gemini's actual error message (e.g. "API key not valid",
    // "quota exceeded", model not found, etc.) so the failure is self-diagnosing
    // instead of a generic 502 with no clue what went wrong.
    let detail = errBody;
    try {
      const parsed = JSON.parse(errBody);
      detail = parsed.error?.message || errBody;
    } catch {
      // errBody wasn't JSON; use as-is
    }

    throw new ApiError(502, `AI service request failed: ${detail}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return text;
}

// Strips markdown code fences if the model wraps JSON in them (defensive - responseMimeType
// json mode should already prevent this, but kept as a safety net).
function parseJsonResponse(raw) {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Most common cause: the model's output got cut off before finishing (hit the
    // maxOutputTokens limit), leaving an unterminated JSON string. Surface a clear,
    // actionable message instead of a raw "Unexpected end of JSON input" error.
    throw new ApiError(
      502,
      'AI response was incomplete or malformed (likely cut off mid-generation). Please try again.'
    );
  }
}

const summarize = async (text) => {
  const system =
    'You are a precise document summarization assistant. Respond ONLY with a JSON object: ' +
    '{"summary": string, "keyPoints": string[]}. No preamble, no markdown fences.';
  const raw = await callGemini(system, capText(text), { jsonMode: true, maxTokens: 1500 });
  return parseJsonResponse(raw);
};

const rewrite = async (text, style = 'professional') => {
  const system =
    `You are a writing assistant. Rewrite the given text in a ${style} tone/style while preserving meaning. ` +
    'Respond ONLY with JSON: {"rewritten": string}. No preamble, no markdown fences.';
  // Rewritten output can be roughly as long as the (capped) input, so give it a
  // generous budget rather than the default.
  const raw = await callGemini(system, capText(text), { jsonMode: true, maxTokens: 4096 });
  return parseJsonResponse(raw);
};

const translate = async (text, targetLanguage) => {
  const system =
    `You are a professional translator. Translate the given text into ${targetLanguage}, preserving formatting and meaning. ` +
    'Respond ONLY with JSON: {"translated": string, "targetLanguage": string}. No preamble, no markdown fences.';
  // Non-Latin scripts (Hindi, Chinese, Arabic, etc.) often need more tokens than the
  // Latin-script source text for the same content, so this needs a larger budget too.
  const raw = await callGemini(system, capText(text), { jsonMode: true, maxTokens: 4096 });
  return parseJsonResponse(raw);
};

const extractKeywords = async (text) => {
  const system =
    'Extract the most important keywords/key phrases and named entities from the text. ' +
    'Respond ONLY with JSON: {"keywords": string[], "entities": string[]}. No preamble, no markdown fences.';
  const raw = await callGemini(system, capText(text), { jsonMode: true, maxTokens: 1200 });
  return parseJsonResponse(raw);
};

const analyzeSentiment = async (text) => {
  const system =
    'Analyze the overall sentiment and tone of the text. ' +
    'Respond ONLY with JSON: {"sentiment": "positive"|"negative"|"neutral"|"mixed", "score": number between -1 and 1, "explanation": string}. ' +
    'No preamble, no markdown fences.';
  const raw = await callGemini(system, capText(text), { jsonMode: true, maxTokens: 800 });
  return parseJsonResponse(raw);
};

// Chat with a document: keeps a short rolling history for context.
const chatWithDocument = async (documentText, history, question) => {
  const system =
    'You are a helpful assistant answering questions strictly based on the provided document. ' +
    'If the answer is not in the document, say so clearly. Be concise and cite relevant parts when useful. ' +
    'Respond in plain text (not JSON).';

  const historyText = history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const userPrompt =
    `DOCUMENT CONTENT:\n${capText(documentText)}\n\n` +
    (historyText ? `CONVERSATION SO FAR:\n${historyText}\n\n` : '') +
    `NEW QUESTION: ${question}`;

  return callGemini(system, userPrompt, { maxTokens: 1000 });
};


// Streaming version of chatWithDocument - yields text chunks as they arrive from Gemini
async function* chatWithDocumentStream(documentText, history, question) {
  if (!env.gemini.apiKey) {
    throw new ApiError(500, 'AI service is not configured (missing GEMINI_API_KEY)');
  }

  const system =
    'You are a helpful assistant answering questions strictly based on the provided document. ' +
    'If the answer is not in the document, say so clearly. Be concise and cite relevant parts when useful. ' +
    'Respond in plain text (not JSON).';

  const historyText = history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const userPrompt =
    `DOCUMENT CONTENT:\n${capText(documentText)}\n\n` +
    (historyText ? `CONVERSATION SO FAR:\n${historyText}\n\n` : '') +
    `NEW QUESTION: ${question}`;

  const url = `${GEMINI_BASE_URL}/${env.gemini.model}:streamGenerateContent?alt=sse`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.gemini.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    logger.error(`Gemini stream API error ${response.status}: ${errBody}`);
    throw new ApiError(502, `AI service request failed: ${errBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const textPiece = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
        if (textPiece) yield textPiece;
      } catch {
        // skip malformed/partial SSE line
      }
    }
  }
}

module.exports = {
  summarize,
  rewrite,
  translate,
  extractKeywords,
  analyzeSentiment,
  chatWithDocument,
  chatWithDocumentStream,
};
