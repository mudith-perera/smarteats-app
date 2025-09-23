const DEFAULT_MODEL =
  process.env.AI_MEAL_PLAN_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_TEMPERATURE = Number(
  process.env.AI_MEAL_PLAN_TEMPERATURE ?? "0.2"
);

let OpenAIConstructor = null;
try {
  ({ OpenAI: OpenAIConstructor } = require("openai"));
} catch (err) {
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "[aiMealPlanRanker] OpenAI SDK is not available. Install 'openai' to enable AI ranking."
    );
  }
}

let cachedClient = null;

function getClient() {
  if (!OpenAIConstructor) {
    throw new Error("OpenAI SDK is not installed.");
  }

  if (!cachedClient) {
    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.AI_OPENAI_API_KEY ||
      process.env.AI_API_KEY;

    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable.");
    }

    cachedClient = new OpenAIConstructor({
      apiKey,
      baseURL:
        process.env.OPENAI_BASE_URL ||
        process.env.AI_OPENAI_BASE_URL ||
        process.env.AI_API_BASE_URL,
    });
  }

  return cachedClient;
}

function buildProfileSummary(profile = {}) {
  if (!profile) return "- No active profile found.";

  const segments = [];
  if (profile.name) segments.push(`Name: ${profile.name}`);
  if (profile.age != null) segments.push(`Age: ${profile.age}`);
  if (profile.gender) segments.push(`Gender: ${profile.gender}`);
  if (profile.goal) segments.push(`Goal: ${profile.goal}`);
  if (profile.calorieTarget)
    segments.push(`Calorie target: ${profile.calorieTarget}`);

  const preferences = Array.isArray(profile.dietaryPreferences)
    ? profile.dietaryPreferences.filter(Boolean)
    : [];
  if (preferences.length) {
    segments.push(`Dietary preferences: ${preferences.join(", ")}`);
  }

  if (profile.allergies?.length) {
    segments.push(`Allergies: ${profile.allergies.join(", ")}`);
  }

  if (!segments.length) {
    return "- Minimal profile information available.";
  }

  return `- ${segments.join("; ")}.`;
}

function describeMealPlan(plan, index) {
  const macros = [];
  if (plan.calories != null) macros.push(`Calories: ${plan.calories}`);
  if (plan.protein != null) macros.push(`Protein: ${plan.protein}g`);
  if (plan.fat != null) macros.push(`Fat: ${plan.fat}g`);
  if (plan.carbs != null) macros.push(`Carbs: ${plan.carbs}g`);

  const description = [
    `${index + 1}. ID: ${plan._id}`,
    `Title: ${plan.title || "Untitled"}`,
    `Goal type: ${plan.goalType || "unspecified"}`,
    `Diet tags: ${(plan.dietTags || []).join(", ") || "none"}`,
    `Macros: ${macros.join(", ") || "not provided"}`,
    `Description: ${plan.description || "No description."}`,
  ];

  return description.join("\n");
}

function buildPrompt({ profile, candidates }) {
  const profileSummary = buildProfileSummary(profile);
  const plansSummary = candidates
    .map((plan, index) => describeMealPlan(plan, index))
    .join("\n\n");

  return `You are an expert nutrition coach. Rank the following meal plans for the user profile provided. Respond with strict JSON matching this schema:\n\n{\n  "rankings": [\n    { "id": "<mealPlanId>", "rationale": "<why this plan suits the user>" }\n  ]\n}\n\nOnly include IDs from the candidate list. Provide succinct rationales (1-2 sentences).\n\nUser profile:\n${profileSummary}\n\nMeal plans:\n${plansSummary}`;
}

function extractTextFromResponse(response) {
  if (!response) return "";

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = Array.isArray(response.output) ? response.output : [];
  const textChunks = output
    .flatMap((item) => item?.content || [])
    .filter((piece) => piece?.type === "output_text" || piece?.type === "text")
    .map((piece) => piece.text || piece.value)
    .filter(Boolean);

  return textChunks.join("\n");
}

function safeParseRankings(text) {
  if (!text) return [];

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    if (!parsed || !Array.isArray(parsed.rankings)) return [];

    return parsed.rankings
      .map((entry) => {
        if (typeof entry === "string") {
          return { id: entry };
        }
        if (!entry || !entry.id) return null;
        return { id: entry.id, rationale: entry.rationale || null };
      })
      .filter(Boolean);
  } catch (err) {
    return [];
  }
}

async function rankMealPlans({ profile, candidates } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const client = getClient();
  const prompt = buildPrompt({ profile, candidates });

  const response = await client.responses.create({
    model: DEFAULT_MODEL,
    input: [
      {
        role: "system",
        content:
          "You provide structured JSON responses and never include additional commentary.",
      },
      { role: "user", content: prompt },
    ],
    temperature: DEFAULT_TEMPERATURE,
    max_output_tokens: Number(process.env.AI_MEAL_PLAN_MAX_OUTPUT ?? "600"),
  });

  const text = extractTextFromResponse(response);
  const rankings = safeParseRankings(text);

  if (!rankings.length) {
    throw new Error("AI response did not contain any rankings.");
  }

  return rankings;
}

module.exports = {
  rankMealPlans,
  __private: {
    buildPrompt,
    safeParseRankings,
    extractTextFromResponse,
  },
};
