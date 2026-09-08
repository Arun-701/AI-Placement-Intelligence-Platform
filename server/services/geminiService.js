const OpenAI = require("openai");
const { aiProviders } = require("../config/aiProviders");

const DEFAULT_SYSTEM_PROMPT =
    "You are an expert AI career assistant for the Placement Intelligence Platform. " +
    "Answer accurately, concisely, and with valid JSON when the user requests a structured output.";

const callOpenAICompatible = async (provider, prompt, systemPrompt = DEFAULT_SYSTEM_PROMPT, attempt = 1) => {
    const client = new OpenAI({
        baseURL: provider.baseUrl.replace(/\/+$/, ""),
        apiKey: provider.apiKey,
        timeout: provider.timeoutMs,
        maxRetries: provider.retries || 2
    });

    try {
        const response = await client.chat.completions.create({
            model: provider.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            max_tokens: 1500,
            temperature: 0.3
        });

        const content = response?.choices?.[0]?.message?.content;

        if (!content || !content.trim()) {
            throw new Error(`${provider.name} returned empty content.`);
        }

        return content.trim();
    } catch (error) {
        if (error?.status === 429 || error?.code === "rate_limit_exceeded") {
            if (attempt <= (provider.retries || 2)) {
                const waitMs = 5000 * attempt;
                console.log(`[AI] ${provider.name} rate limited. Retrying in ${waitMs}ms (attempt ${attempt + 1})...`);
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                return callOpenAICompatible(provider, prompt, systemPrompt, attempt + 1);
            }
        }
        throw new Error(`${provider.name} failed: ${error?.message || error}`);
    }
};

const callGemini = async (provider, prompt, systemPrompt = DEFAULT_SYSTEM_PROMPT) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`,
            {
                method: "POST",
                signal: controller.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 1500, temperature: 0.3 }
                })
            }
        );

        if (!response.ok) {
            const errorText = (await response.text()).slice(0, 300);
            throw new Error(`${provider.name} HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts
            ?.map((part) => part?.text || "")
            .join("")
            .trim();

        if (!text) {
            throw new Error(`${provider.name} returned empty content.`);
        }

        return text;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(`${provider.name} request timed out after ${provider.timeoutMs}ms.`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

const generateAIResponse = async (prompt, systemPrompt = DEFAULT_SYSTEM_PROMPT) => {
    const normalizedPrompt = prompt?.trim();

    if (!normalizedPrompt) {
        throw new Error("Prompt cannot be empty.");
    }

    const errors = [];

    const providerAttempts = [
        aiProviders.primary,
        aiProviders.fallback,
        aiProviders.nvidia
    ].filter((provider) => provider?.apiKey).map((provider) => ({
        name: provider.name,
        run: () => provider.name === "Gemini"
            ? callGemini(provider, normalizedPrompt, systemPrompt)
            : callOpenAICompatible(provider, normalizedPrompt, systemPrompt),
        model: provider.model
    }));

    for (const attempt of providerAttempts) {
        try {
            const text = await attempt.run();
            if (text) {
                console.log(`[AI] Response generated via ${attempt.name} (model: ${attempt.model})`);
                return text;
            }
        } catch (error) {
            console.error(`[AI] ${attempt.name} failed: ${error.message}`);
            errors.push(`${attempt.name}: ${error.message}`);
        }
    }

    throw new Error(`All AI providers failed. ${errors.join(" | ")}`);
};

module.exports = {
    generateAIResponse
};
