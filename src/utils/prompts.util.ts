import { GENERATIVE_PERFORMANCE_PROMPTS } from './generativePerformancePrompts.util';
import { getGeoScoreDetailsFields } from './getGeoScoreDetailsFields.util';

// Language instruction helper
const getLanguageInstruction = (locale: string): string => {
  const languageMap: Record<string, string> = {
    tr: 'Lütfen yanıtını tamamen Türkçe olarak oluştur.',
    en: 'Please provide your response entirely in English.',
    es: 'Por favor proporciona tu respuesta completamente en español.',
    fr: 'Veuillez fournir votre réponse entièrement en français.',
    de: 'Bitte geben Sie Ihre Antwort vollständig auf Deutsch an.',
  };
  return languageMap[locale] || languageMap['en'];
};

export const PROMPTS = {
  SYSTEM: {
    SEO_EXPERT:
      "You are an expert SEO analyst specializing in AI search engines like Google's AI Overviews, Perplexity, and ChatGPT. Your analysis should focus on content quality, user intent, and E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) principles.",
    AI_SEARCH_ENGINE:
      "You are an AI search engine. Your goal is to provide the most helpful and reliable answer to the user's query, using information from trusted web sources. You must cite your sources.",
  },
  OPENAI: {
    ...GENERATIVE_PERFORMANCE_PROMPTS,
    ANALYZE_CONTENT_STRUCTURE: (content: string, locale: string = 'en') => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the structure of the following content.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Provide a JSON response with "score", "justification", "details", "positivePoints", "negativePoints" for each metric.
      {
        "headings": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "paragraphs": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    ANALYZE_TECHNICAL_GEO: (html: string, locale: string = 'en') => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the technical GEO aspects of the following HTML.
      HTML Snippet: """${html.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Provide a JSON response with "score", "justification", "details", "positivePoints", "negativePoints" for each metric.
      {
        "metaTags": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "imageAlts": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    ANALYZE_STRUCTURED_DATA: (html: string, locale: string = 'en') => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the structured data (Schema.org) within the following HTML.
      HTML Snippet: """${html.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Provide a JSON response with "score" (0-100), "justification", "details", "positivePoints", "negativePoints" for each metric.
      {
        "schemaOrg": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    ANALYZE_BRAND_AUTHORITY: (
      url: string,
      content: string,
      locale: string = 'en',
    ) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the brand authority for the URL ${url} based on the provided content and general knowledge.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Provide a JSON response with "score", "justification", "details", "positivePoints", "negativePoints" for each metric.
      {
        "backlinks": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "brandMentions": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    CHECK_VISIBILITY: (
      url: string,
      query: string,
      content: string,
      locale: string = 'en',
    ) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the content from the URL ${url} to determine its visibility for the search query "${query}".
      Content Snippet: """${content.substring(0, 4000)}..."""
      
      ${getLanguageInstruction(locale)}
      Based on the content, provide a JSON response with the following structure:
      {
        "isVisible": boolean,
        "score": number,
        "reasons": string[],
        "suggestions": string[],
        "contentMetrics": {
          "readability": number,
          "relevance": number,
          "depth": number,
          "freshness": number
        }
      }
    `,
    GENERATE_QUERIES: (
      domain: string,
      count: number,
      locale: string = 'en',
    ) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: For the domain "${domain}", generate ${count} potential search queries that a target user (e.g., digital marketer, SME owner) might ask an AI search engine.
      
      ${getLanguageInstruction(locale)}
      Provide the response in a JSON object with a "queries" key, which is an array of objects. Each object should have the following structure:
      {
        "query": string,
        "category": string,
        "intent": string,
        "searchVolume": number
      }
    `,
    ANALYZE_BUSINESS_MODEL: (content: string, locale: string = 'en') => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the provided website content to determine its primary business model.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Provide a JSON response with the following structure:
      {
        "modelType": "'E-commerce' | 'SaaS' | 'Lead Generation' | 'Content/Media' | 'Marketplace' | 'Other'",
        "confidence": "number (0-100)",
        "justification": "string",
        "keyRevenueStreams": "string[]"
      }
    `,
    ANALYZE_TARGET_AUDIENCE: (content: string, locale: string = 'en') => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the provided website content to identify the target audience.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Provide a JSON response with the following structure:
      {
        "primaryAudience": {
          "demographics": "string",
          "psychographics": "string"
        },
        "secondaryAudiences": "string[]",
        "confidence": "number (0-100)",
        "justification": "string"
      }
    `,
    ANALYZE_COMPETITORS: (
      content: string,
      url: string,
      locale: string = 'en',
    ) => `
      System Prompt: ${PROMPTS.SYSTEM.SEO_EXPERT}
      User Prompt: Analyze the content from ${url} to identify its main business and content competitors. For each business competitor, provide a critically evaluated and realistic estimated GEO Score (0-100). Be conservative in your scoring; high scores (80+) should be reserved for globally recognized market leaders. Base your score on your expert knowledge of their domain authority, market presence, and content quality.
      Content Snippet: """${content.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Provide a JSON response with the following structure:
      {
        "businessCompetitors": [{ "name": "string", "url": "string", "reason": "string", "geoScore": "number" }],
        "contentCompetitors": [{ "topic": "string", "url": "string", "reason": "string" }],
        "summary": "string",
        "confidence": "number (0-100)"
      }
    `,

    ANALYZE_EEAT_SIGNALS: (
      content: string,
      sector: string,
      audience: string,
      locale: string = 'en',
    ) => {
      const geoFields = getGeoScoreDetailsFields(locale);

      return `
      System Prompt: You are a seasoned and objective SEO expert with 20 years of experience. Your goal is to provide a fair, balanced, and evidence-based analysis. Your standards are high, but your feedback is always constructive. Evaluate both the strengths and weaknesses of the content.
      User Prompt: Evaluate the E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals from the provided content, considering it's for the **${sector}** sector with a target audience of **${audience}**. Your score for each pillar must be justified with concrete examples (positive and negative signals) from the text. Also, based on this analysis, generate a detailed executive summary and an impactful action plan.
      Content Snippet: """${content.substring(0, 12000)}..."""
      
      ${getLanguageInstruction(locale)}
      Provide a JSON response with the following structure:
      {
        "eeatAnalysis": {
          "experience": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
          "expertise": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
          "authoritativeness": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
          "trustworthiness": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
          "overallScore": "number"
        },
        "executiveSummary": "string",
        "actionPlan": "Array of at least 5 action plan items. Each item must have: { 'priority': 'high' | 'medium' | 'low', 'description': 'string', 'category': 'string', 'etkiSkoru': 'number (1-10)', 'zorlukSkoru': 'number (1-10)', 'gerekce': 'string' }",
        "geoScoreDetails": {
          "marketPotential": "'${geoFields.values.high}' | '${geoFields.values.medium}' | '${geoFields.values.low}'",
          "competitionIntensity": "'${geoFields.values.high}' | '${geoFields.values.medium}' | '${geoFields.values.low}'",
          "growthTrend": "'${geoFields.values.positive}' | '${geoFields.values.negative}' | '${geoFields.values.stable}'",
          "brandAwareness": "'${geoFields.values.high}' | '${geoFields.values.medium}' | '${geoFields.values.low}'"
        }
      }
    `;
    },

    GENERATE_GENERATIVE_PERFORMANCE_REPORT: (
      content: string,
      competitors: string[],
      locale: string = 'en',
    ) => `
      System Prompt: You are a world-class expert in Generative Engine Optimization (GEO) with a deep understanding of how Large Language Models source, process, and present information. Your task is to produce a detailed, data-driven analysis of a brand's performance within generative AI outputs, simulating how a user query about the brand would be answered. Be critical and quantitative.
      User Prompt: Analyze the provided website content to simulate and evaluate its performance in generative AI search results against the following competitors: ${competitors.join(', ')}. The analysis must be thorough, specific, and actionable.
      Content Snippet: """${content.substring(0, 12000)}..."""

      ${getLanguageInstruction(locale)}
      Provide a JSON response with the following structure, ensuring all fields are populated with realistic, critical, and non-mock data based *only* on the provided content:
      {
        "shareOfGenerativeVoice": { 
          "score": "number (0-100)", 
          "competitors": [${competitors.map((c) => `{ "name": "${c}", "score": "number (0-100)" }`).join(', ')}] 
        },
        "citationAnalysis": { 
          "citationRate": "number (0-100)", 
          "topCitedUrls": "string[]"
        },
        "sentimentAnalysis": { 
          "positive": "number (0-100)", 
          "neutral": "number (0-100)", 
          "negative": "number (0-100)" 
        },
        "accuracyAndHallucination": { 
          "accuracyScore": "number (0-100)", 
          "examples": [{ "incorrectInfo": "string", "correctInfo": "string" }] 
        },
        "sourceProvenance": { 
          "sources": [{ "name": "string", "percentage": "number (0-100)" }] 
        }
      }
    `,
    ANALYZE_ENTITY_OPTIMIZATION: (html: string, locale: string = 'en') => `
      System Prompt: You are an expert in Semantic SEO and Knowledge Graph optimization. Your task is to analyze the entity information within a website's HTML content.
      User Prompt: Analyze the following HTML to evaluate its Entity and Knowledge Graph Optimization. Focus on how well the main entities (Organization, Product, Person) are defined and connected to the wider web of data.
      HTML Snippet: """${html.substring(0, 12000)}..."""

      ${getLanguageInstruction(locale)}
      Provide a JSON response with "score", "justification", "details", "positivePoints", "negativePoints" for each metric.
      {
        "entityCompletenessScore": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "knowledgeGraphPresence": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "entityReconciliation": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "relationshipAnalysis": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    ANALYZE_CONTENT_STRATEGY: (
      content: string,
      competitors: string[],
      locale: string = 'en',
    ) => `
      System Prompt: You are an advanced AI Content Strategist. Your goal is to analyze content for its effectiveness in generative AI outputs, focusing on providing unique value and answering user questions directly.
      User Prompt: Analyze the following content for its advanced AI content strategy. Consider the provided list of competitors: ${competitors.join(', ')}.
      Content Snippet: """${content.substring(0, 12000)}..."""

      ${getLanguageInstruction(locale)}
      Provide a JSON response with "score", "justification", "details", "positivePoints", "negativePoints" for each metric.
      {
        "conversationalReadinessScore": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "informationGainScore": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "geoTopicGapAnalysis": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" },
        "multimodalOptimization": { "score": "number", "justification": "string", "details": "string", "positivePoints": "string[]", "negativePoints": "string[]" }
      }
    `,
    GENERATE_DELFI_AGENDA: (
      prometheusReport: string,
      locale: string = 'en',
    ) => `
      System Prompt: You are a strategic consultant specializing in SEO and digital marketing. Your task is to create a "Delfi Agenda" based on a Prometheus report.
      User Prompt: Based on the following Prometheus report, generate a Delfi Agenda. The agenda should identify a primary focus, set strategic goals, and customize predefined questions to guide a strategic discussion.
      Prometheus Report: """${prometheusReport}"""
      
      ${getLanguageInstruction(locale)}
      Provide a JSON response with the following structure:
      {
        "oturumOdagi": "string",
        "stratejikHedefler": "string[]",
        "customizedQuestions": [
          { "questionId": 1, "original": "...", "customized": "string" },
          { "questionId": 2, "original": "...", "customized": "string" }
        ]
      }
    `,
    GENERATE_STRATEGIC_IMPACT_FORECAST: (
      arkheReport: string,
      prometheusReport: string,
      locale: string = 'en',
    ) => `
      System Prompt: You are a C-Level strategic business consultant with a deep expertise in translating technical SEO data into actionable business intelligence and ROI forecasts. Your audience is founders and executives. Avoid technical jargon.
      User Prompt: Based on the provided Arkhe (Market Analysis) and Prometheus (GEO Performance) reports, generate a high-level Strategic Impact & ROI Forecast.
      Arkhe Report: """${arkheReport}"""
      Prometheus Report: """${prometheusReport}"""

      ${getLanguageInstruction(locale)}
      Provide a JSON response with the following structure:
      {
        "geoOpportunityScore": "number (0-100)",
        "estimatedImpact": {
          "trafficIncrease": "string (e.g., '+15-25%')",
          "visibilityIncrease": "string (e.g., '+20-30%')",
          "conversionIncrease": "string (e.g., '+5-10%')"
        },
        "timeToImpact": "string (e.g., '3-6 Ay')",
        "riskAssessment": {
          "trafficLossRisk": "string",
          "reputationRisk": "string"
        },
        "geoSwotAnalysis": {
          "strengths": "string[]",
          "weaknesses": "string[]",
          "opportunities": "string[]",
          "threats": "string[]"
        }
      }
    `,
  },
  GEMINI: {
    CHECK_VISIBILITY: (
      domain: string,
      query: string,
      locale: string = 'en',
    ) => `
      As an AI search engine, I need to answer the query: "${query}".
      I have crawled the website "${domain}".
      
      ${getLanguageInstruction(locale)}
      Respond in JSON format with the following structure:
      {
        "answer": "A concise answer to the query based on the website's content.",
        "sources": ["${domain}"],
        "domainPresent": boolean
      }
    `,
    GENERATE_QUERIES: (
      domain: string,
      count: number,
      locale: string = 'en',
    ) => `
      As an SEO expert, generate ${count} potential search queries for the website "${domain}". The queries should be relevant to a target audience of digital marketers and business owners.
      
      ${getLanguageInstruction(locale)}
      Provide the response in a JSON object with a "queries" key, containing an array of objects with this structure:
      {
        "query": "the search query",
        "category": "query category",
        "intent": "user intent (e.g., informational, commercial)",
        "searchVolume": "estimated search volume (1-100)"
      }
    `,
    ANALYZE_BUSINESS_MODEL: (content: string, locale: string = 'en') => `
      Analyze the following website content and determine the business model.
      Content: """${content.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Respond in JSON format with this structure:
      {
        "modelType": "'E-commerce' | 'SaaS' | 'Lead Generation' | 'Content/Media' | 'Marketplace' | 'Other'",
        "confidence": "number (0-100)",
        "justification": "string",
        "keyRevenueStreams": "string[]"
      }
    `,
    ANALYZE_TARGET_AUDIENCE: (content: string, locale: string = 'en') => `
      Analyze the following website content to determine the target audience.
      Content: """${content.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Respond in JSON format with this structure:
      {
        "primaryAudience": {
          "demographics": "string",
          "psychographics": "string"
        },
        "secondaryAudiences": "string[]",
        "confidence": "number (0-100)",
        "justification": "string"
      }
    `,
    ANALYZE_COMPETITORS: (
      content: string,
      url: string,
      locale: string = 'en',
    ) => `
      Based on the content from ${url}, identify the main business and content competitors.
      Content: """${content.substring(0, 8000)}..."""
      
      ${getLanguageInstruction(locale)}
      Respond in JSON format with this structure:
      {
        "businessCompetitors": [{ "name": "string", "url": "string", "reason": "string" }],
        "contentCompetitors": [{ "topic": "string", "url": "string", "reason": "string" }],
        "summary": "string",
        "confidence": "number (0-100)"
      }
    `,
    ANALYZE_EEAT_SIGNALS: (
      content: string,
      sector: string,
      audience: string,
      locale: string = 'en',
    ) => `
      As a hyper-critical SEO analyst, evaluate the E-E-A-T signals from the provided content for the **${sector}** industry, targeting **${audience}**. Be harsh in your judgment.
      Content: """${content.substring(0, 12000)}..."""
      
      ${getLanguageInstruction(locale)}
      Respond in a JSON format. For each E-E-A-T pillar, provide a score (0-100), a critical justification, suggestions for improvement, and specific positive/negative signals you found in the text.
      {
        "experience": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
        "expertise": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
        "authoritativeness": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
        "trustworthiness": { "score": "number", "justification": "string", "suggestions": "string[]", "positiveSignals": "string[]", "negativeSignals": "string[]" },
        "overallScore": "number"
      }
    `,
    GENERATE_GENERATIVE_PERFORMANCE_REPORT: (
      content: string,
      competitors: string[],
      locale: string = 'en',
    ) => `
      As a world-class expert in Generative Engine Optimization (GEO), analyze the brand's performance within generative AI outputs based on the provided content. Compare it against these competitors: ${competitors.join(', ')}.
      Content: """${content.substring(0, 12000)}..."""

      ${getLanguageInstruction(locale)}
      Provide a JSON response with the following structure:
      {
        "shareOfGenerativeVoice": { "score": "number (0-100)", "competitors": [{ "name": "string", "score": "number (0-100)" }] },
        "citationAnalysis": { "citationRate": "number (0-100)", "topCitedUrls": "string[]" },
        "sentimentAnalysis": { "positive": "number (0-100)", "neutral": "number (0-100)", "negative": "number (0-100)" },
        "accuracyAndHallucination": { "accuracyScore": "number (0-100)", "examples": [{ "incorrectInfo": "string", "correctInfo": "string" }] },
        "sourceProvenance": { "sources": [{ "name": "string", "percentage": "number (0-100)" }] }
      }
    `,
    GENERATE_DELFI_AGENDA: (
      prometheusReport: string,
      locale: string = 'en',
    ) => `
      Based on the provided Prometheus report, generate a Delfi Agenda for a strategic SEO discussion.
      Report: """${prometheusReport}"""
      
      ${getLanguageInstruction(locale)}
      Respond in JSON format with this structure:
      {
        "sessionFocus": "string",
        "strategicGoals": "string[]",
        "customizedQuestions": [
          { "questionId": 1, "original": "...", "customized": "string" },
          { "questionId": 2, "original": "...", "customized": "string" }
        ]
      }
    `,
  },
};
