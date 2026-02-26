// ─── Tongue Twister Data ─────────────────────────────────────────────
// 5 twisters per level, curated by difficulty

const TONGUE_TWISTERS = {
  1: [
    "She sells seashells by the seashore.",
    "Red lorry yellow lorry red lorry yellow lorry.",
    "A proper copper coffee pot.",
    "Toy boat toy boat toy boat.",
    "Fresh French fried fish."
  ],
  2: [
    "How much wood would a woodchuck chuck if a woodchuck could chuck wood.",
    "Peter Piper picked a peck of pickled peppers.",
    "Betty Botter bought some butter but she said the butter is bitter.",
    "I scream you scream we all scream for ice cream.",
    "Fuzzy Wuzzy was a bear Fuzzy Wuzzy had no hair."
  ],
  3: [
    "The sixth sick sheik's sixth sheep's sick.",
    "She stood on the balcony inexplicably mimicking him hiccupping and amicably welcoming him in.",
    "Pad kid poured curd pulled cod pad kid poured curd pulled cod.",
    "Brisk brave brigadiers brandished broad bright blades and blunderbusses.",
    "If you must cross a course cross cow across a crowded cow crossing cross the cross coarse cow across the crowded cow crossing carefully."
  ]
};

// ─── Evaluation Thresholds ───────────────────────────────────────────
const LEVEL_CONFIG = {
  1: {
    name: "Easy",
    label: "Level 1 – Easy",
    cerThreshold: 0.40,      // CER ≤ 0.40 → PASS
    cerAffectsResult: true,
    wpmMin: 100,
    wpmMax: 300,
  },
  2: {
    name: "Medium",
    label: "Level 2 – Medium",
    cerThreshold: 0.30,      // CER ≤ 0.30 → PASS
    cerAffectsResult: true,
    wpmMin: 100,
    wpmMax: 300,
  },
  3: {
    name: "Hard",
    label: "Level 3 – Hard",
    cerThreshold: 0.20,      // CER ≤ 0.20 → PASS (Very strict)
    cerAffectsResult: true,
    wpmMin: 130,
    wpmMax: 300,
  }
};

// Pick a random twister for a given level (avoid repeating the same one)
let _lastPicked = {};
function getRandomTwister(level) {
  const list = TONGUE_TWISTERS[level];
  let idx;
  do {
    idx = Math.floor(Math.random() * list.length);
  } while (idx === _lastPicked[level] && list.length > 1);
  _lastPicked[level] = idx;
  return list[idx];
}

// ─── Evaluate Result ─────────────────────────────────────────────────
// Takes CER and WPM from ASR API, returns structured evaluation
function evaluateAttempt(level, cer, wpm) {
  const config = LEVEL_CONFIG[level];

  // Speed label
  let speedLabel;
  if (wpm < config.wpmMin) speedLabel = "Too Slow";
  else if (wpm > config.wpmMax) speedLabel = "Too Fast";
  else speedLabel = "Good Speed";

  // CER label
  const cerLabel = cer <= 0.40 ? "Good" : "Bad";

  // Pass / Fail
  let pass = false;
  const speedOk = wpm >= config.wpmMin && wpm <= config.wpmMax;

  if (config.cerAffectsResult) {
    pass = cer <= config.cerThreshold && speedOk;
  } else {
    // Hard level — only WPM matters
    pass = speedOk;
  }

  return {
    level: config.name,
    cer: cer,
    cerLabel: cerLabel,
    wpm: wpm,
    speedLabel: speedLabel,
    result: pass ? "PASS" : "FAIL"
  };
}
