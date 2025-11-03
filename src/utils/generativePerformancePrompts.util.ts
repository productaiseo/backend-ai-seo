export const GENERATIVE_PERFORMANCE_PROMPTS = {
  ANALYZE_SENTIMENT: (text: string) => `
    System Prompt: You are an AI specialized in sentiment analysis. Your task is to evaluate the sentiment of the provided text.
    User Prompt: Analyze the sentiment of the following text and provide a score for positive, neutral, and negative sentiments.
    Text: """${text.substring(0, 4000)}..."""
    
    Lütfen yanıtını Türkçe olarak oluştur. Provide a JSON response with the following structure:
    {
      "positive": "number (0-100)",
      "neutral": "number (0-100)",
      "negative": "number (0-100)"
    }
  `,
  EXTRACT_CLAIMS: (text: string) => `
    System Prompt: You are an AI specialized in information extraction. Your task is to identify and extract factual claims from the provided text.
    User Prompt: Extract all factual claims from the following text. A factual claim is a statement that can be verified with evidence.
    Text: """${text.substring(0, 8000)}..."""
    
    Lütfen yanıtını Türkçe olarak oluştur. Provide a JSON response with a "claims" key, which is an array of strings.
    {
      "claims": "string[]"
    }
  `,
  VERIFY_CLAIMS: (claims: string[], groundTruth: string) => `
    System Prompt: You are an AI specialized in fact-checking. Your task is to verify a list of claims against a provided ground truth text.
    User Prompt: For each claim in the list, verify it against the ground truth text. Determine if the claim is verified, unverified, or contradictory.
    Ground Truth Text: """${groundTruth.substring(0, 8000)}..."""
    Claims: """${JSON.stringify(claims)}"""
    
    Lütfen yanıtını Türkçe olarak oluştur. Provide a JSON response with an "examples" key, which is an array of objects. Each object should have the following structure:
    {
      "claim": "string",
      "sourceText": "string (the relevant part of the ground truth text)",
      "verificationResult": "'verified' | 'unverified' | 'contradictory'",
      "explanation": "string (a brief explanation of the verification result)"
    }
  `,
};
