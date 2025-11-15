const DASH_PATTERN = /[-‐‑‒–—−-]/;

type ConfidenceLike =
  | number
  | string
  | null
  | undefined
  | {
      confidenceValue?: number;
      confidenceScore?: number;
      overallAnalysis?: string;
      analysis?: string;
    };

export interface ConfidenceParseResult {
  score: number;
  lower?: number;
  upper?: number;
}

const clampScore = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const extractNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampScore(value);
  }
  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value);
    if (!Number.isNaN(numeric)) {
      return clampScore(numeric);
    }
  }
  return undefined;
};

const parseInterval = (text: string): { lower: number; upper: number } | undefined => {
  const intervalPatterns = [
    new RegExp(
      `Confidence\\s*(?:Interval|Range|Level)?[^0-9]{0,10}(\\d{1,3})\\s*${DASH_PATTERN.source}\\s*(\\d{1,3})`,
      'i'
    ),
    /Confidence\s*(?:Interval|Range|Level)?[^0-9]{0,10}(\d{1,3})\s*(?:to)\s*(\d{1,3})/i,
  ];

  for (const pattern of intervalPatterns) {
    const match = text.match(pattern);
    if (match?.[1] && match?.[2]) {
      const lower = extractNumber(match[1]);
      const upper = extractNumber(match[2]);
      if (typeof lower === 'number' && typeof upper === 'number') {
        return { lower, upper };
      }
    }
  }
  return undefined;
};

const parseScoreAnchors = (text: string): number | undefined => {
  const scorePatterns = [
    /Score\s*S?\s*[:=]\s*(\d{1,3})/i,
    /Final\s+Score\s*[:=]\s*(\d{1,3})/i,
    /Confidence\s*Score\s*[:=]\s*(\d{1,3})/i,
    /Overall\s+Score\s*[:=]\s*(\d{1,3})/i,
  ];

  for (const pattern of scorePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = extractNumber(match[1]);
      if (typeof value === 'number') {
        return value;
      }
    }
  }

  return undefined;
};

const normalizeText = (value?: string): string =>
  value ? value.replace(/\s+/g, ' ').trim() : '';

export const deriveConfidenceScore = (
  source: ConfidenceLike,
  fallback = 50
): ConfidenceParseResult => {
  const directValue =
    typeof source === 'number'
      ? extractNumber(source)
      : typeof source === 'object' && source !== null
      ? extractNumber(source.confidenceValue) ?? extractNumber(source.confidenceScore)
      : undefined;

  const text =
    typeof source === 'string'
      ? source
      : typeof source === 'object' && source !== null
      ? source.overallAnalysis || source.analysis || ''
      : '';

  const normalizedText = normalizeText(text);
  const interval = normalizedText ? parseInterval(normalizedText) : undefined;
  const scoreFromText =
    normalizedText && !directValue ? parseScoreAnchors(normalizedText) : undefined;

  const computedScore =
    directValue ??
    (interval ? clampScore((interval.lower + interval.upper) / 2) : undefined) ??
    scoreFromText ??
    clampScore(fallback);

  return {
    score: computedScore,
    lower: interval?.lower,
    upper: interval?.upper,
  };
};
