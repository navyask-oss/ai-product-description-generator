import cases from "./cases.json" assert { type: "json" };

const apiUrl = process.env.API_URL ?? "http://localhost:8080";

type EvalCase = {
  productName: string;
  productNotes: string;
  category: string;
  tone: string;
  requiredWords: string[];
};

type Generation = {
  title: string;
  description: string;
  tags: string[];
  metaDescription: string;
};

function scoreCase(generation: Generation, testCase: EvalCase) {
  const combined = `${generation.title} ${generation.description} ${generation.tags.join(" ")} ${generation.metaDescription}`.toLowerCase();
  const matched = testCase.requiredWords.filter((word) => combined.includes(word.toLowerCase()));
  const hasTags = generation.tags.length >= 5;
  const metaLengthOk = generation.metaDescription.length <= 160;
  return {
    matched,
    hasTags,
    metaLengthOk,
    passed: matched.length === testCase.requiredWords.length && hasTags && metaLengthOk
  };
}

async function run() {
  let failures = 0;

  for (const testCase of cases as EvalCase[]) {
    const response = await fetch(`${apiUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(testCase)
    });

    if (!response.ok) {
      failures++;
      console.log(`FAIL ${testCase.productName}: API returned ${response.status}`);
      continue;
    }

    const generation = (await response.json()) as Generation;
    const score = scoreCase(generation, testCase);
    console.log(`${score.passed ? "PASS" : "FAIL"} ${testCase.productName}: matched ${score.matched.length}/${testCase.requiredWords.length}`);
    if (!score.passed) failures++;
  }

  if (failures > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
