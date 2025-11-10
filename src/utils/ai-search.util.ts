/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { Logger } from '@nestjs/common';
import * as geminiUtil from './gemini.util';

const logger = new Logger('AISearchUtil');

/**
 * AI arama sonuçları için arayüz
 */
interface AiSearchResult {
  exists: boolean;
  message: string;
  source: 'openai' | 'gemini' | 'error';
}

/**
 * Query interface (simplified version)
 */
export interface Query {
  id: number;
  query: string;
  category: string | null;
  visibility: string;
  searchVolume: number;
  chatgpt: string;
  gemini: string;
  perplexity: string;
  trafficPotential: number;
}

/**
 * Sorgu görünürlük analizi sonuçları için arayüz
 */
export interface QueryAnalysisResult {
  queries: Query[];
  errorMessage?: string;
}

/**
 * AI veri kaynakları
 */
export enum AISource {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  BING = 'bing',
  PERPLEXITY = 'perplexity',
}

/**
 * Yapay zeka arama sonucu
 */
export interface AISearchResult {
  query: string;
  present: boolean;
  references?: string[];
  score: number;
  content?: string;
}

// OpenAI API konfigürasyonu
const OPENAI_MODEL_NAME = 'gpt-3.5-turbo';
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key.trim().length === 0) {
      throw new Error('OpenAI API anahtarı eksik');
    }
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

/**
 * OpenAI API'si ile site hakkında bilgi sorgulama
 * @param query Sorgulanacak site domain
 * @param apiKey OpenAI API anahtarı (Bu parametre artık kullanılmayacak fakat imzayı koruyoruz)
 * @returns Sorgu sonucu
 */
export async function queryWithOpenAI(
  query: string,
  apiKey: string,
): Promise<AiSearchResult> {
  try {
    logger.log(`OpenAI sorgusu başlatılıyor: ${query}`);

    const startTime = Date.now();

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL_NAME,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        {
          role: 'user',
          content: `web search özelliğini kullanmadan bana tek kelime ile ${query} sitesi hakkında bilgin var ise var, yok ise yok der misin?`,
        },
      ],
      max_tokens: 1000,
    });

    const duration = Date.now() - startTime;
    logger.debug(`OpenAI query completed in ${duration}ms`);

    const content =
      response.choices[0]?.message?.content?.trim().toLowerCase() || '';
    const exists = content.includes('var');

    return {
      exists,
      message: exists
        ? `${query} sitesi OpenAI tarafından biliniyor.`
        : `${query} sitesi OpenAI tarafından bilinmiyor.`,
      source: 'openai',
    };
  } catch (error: any) {
    logger.error('OpenAI sorgusu sırasında hata oluştu', error?.stack);

    if (error instanceof Error) {
      if (
        error.message.includes('API key') ||
        error.message.includes('authentication')
      ) {
        throw new Error('OpenAI API anahtarı geçersiz veya eksik');
      }
    }

    return {
      exists: false,
      message:
        'OpenAI sorgusu sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
      source: 'error',
    };
  }
}

// Gemini API konfigürasyonu
const GEMINI_MODEL_NAME = 'gemini-pro';
let geminiModelInstance: ReturnType<
  GoogleGenerativeAI['getGenerativeModel']
> | null = null;

function getGeminiModelInstance() {
  if (!geminiModelInstance) {
    const key =
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY;
    if (!key || key.trim().length === 0) {
      throw new Error('Gemini API anahtarı eksik');
    }
    const genAI = new GoogleGenerativeAI(key);
    geminiModelInstance = genAI.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
    });
  }
  return geminiModelInstance;
}

/**
 * Google Gemini API'si ile site hakkında bilgi sorgulama
 * @param query Sorgulanacak site domain
 * @param apiKey Google Gemini API anahtarı
 * @returns Sorgu sonucu
 */
export async function queryWithGemini(
  query: string,
  apiKey: string,
): Promise<AiSearchResult> {
  try {
    logger.log(`Google Gemini sorgusu başlatılıyor: ${query}`);

    const startTime = Date.now();

    // Gemini modeli al
    const model = getGeminiModelInstance();
    const result = await model.generateContent(
      `Web search özelliğini kullanmadan bana tek kelime ile ${query} sitesi hakkında bilgin var ise var, yok ise yok der misin?`,
    );

    const duration = Date.now() - startTime;
    logger.debug(`Gemini query completed in ${duration}ms`);

    const content = result.response.text().toLowerCase().trim();
    const exists = content.includes('var');

    return {
      exists,
      message: exists
        ? `${query} sitesi Google Gemini tarafından biliniyor.`
        : `${query} sitesi Google Gemini tarafından bilinmiyor.`,
      source: 'gemini',
    };
  } catch (error: any) {
    logger.error('Google Gemini sorgusu sırasında hata oluştu', error?.stack);

    if (error instanceof Error) {
      if (
        error.message.includes('API key') ||
        error.message.includes('authentication')
      ) {
        throw new Error('Google Gemini API anahtarı geçersiz veya eksik');
      }
    }

    return {
      exists: false,
      message:
        'Google Gemini sorgusu sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
      source: 'error',
    };
  }
}

/**
 * Verilen domain için AI arama motorlarında kullanılabilecek sorguları analiz eder
 * @param domain Analiz edilecek domain
 * @param apiKey Google API anahtarı
 * @returns Sorgu analizi sonucu
 */
export async function generateQueryAnalysis(
  domain: string,
  apiKey: string,
): Promise<QueryAnalysisResult> {
  try {
    logger.log(`${domain} için sorgu analizi başlatılıyor`);

    // API anahtarını kontrol et
    if (!apiKey) {
      logger.warn('Google API anahtarı sağlanmadı');
      throw new Error('Google API anahtarı eksik');
    }

    // Gemini AI modelini yapılandır
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

    // Sorgu analizi için model promptu
    const prompt = `
    Analiz et: ${domain}
    
    Görevin, bu web sitesi için AI arama motorlarında (ChatGPT, Gemini, Claude veya Perplexity gibi) kullanıcıların sorabileceği 15 potansiyel arama sorgusunu belirlemektir.
    
    Lütfen JSON formatında aşağıdaki yapıda yanıt ver:
    [
      {
        "id": 1,
        "query": "sorgu metni",
        "category": "sorgu kategorisi",
        "searchVolume": tahmin edilen arama hacmi (1-100 arası),
        "visibility": "high/medium/low",
        "chatgpt": "visible/partially-visible/not-visible",
        "gemini": "visible/partially-visible/not-visible",
        "perplexity": "visible/partially-visible/not-visible"
      }
    ]
    
    Her bir sorgu için şunları yapmalısın:
    1. Gerçekten yararlı, kullanıcıların sorabileceği türde sorgular oluştur.
    2. Her sorgu için makul bir kategori belirle (örn: "ürün bilgisi", "fiyatlandırma", "kıyaslama", "kullanım", "sorun giderme").
    3. Arama hacmini 1-100 arasında makul bir sayı olarak tahmin et.
    4. Genel görünürlük skorunu tahmin et (high/medium/low).
    5. Her bir AI arama motoru için site içeriğinin bu sorguda görünür olup olmadığını tahmin et:
       - visible: İçerik tamamen görünür
       - partially-visible: İçerik kısmen görünür veya sınırlı
       - not-visible: İçerik görünmüyor
    
    Yalnızca JSON dizisi döndür, başka açıklama veya ek metin ekleme.
    `;

    // Model yanıtını al
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      throw new Error('API boş yanıt döndürdü');
    }

    logger.debug(`Model yanıtı alındı: ${text.substring(0, 100)}...`);

    // JSON yanıtını parse et
    let queries: Query[] = [];

    try {
      // JSON metnini temizle (başındaki ve sonundaki markdown işaretlerini kaldır)
      const cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();
      const parsedQueries = JSON.parse(cleanedText);

      // Sorguları doğrula
      if (!Array.isArray(parsedQueries) || parsedQueries.length === 0) {
        throw new Error('Geçersiz sorgu formatı');
      }

      // Her bir sorgunun gerekli alanları içerdiğinden emin ol ve Query tipine dönüştür
      queries = parsedQueries.map((query: any) => ({
        id:
          typeof query.id === 'string'
            ? parseInt(query.id, 10)
            : query.id || Math.floor(Math.random() * 1000),
        query: query.query || '',
        category: query.category || null,
        visibility: query.visibility || 'unknown',
        searchVolume:
          typeof query.searchVolume === 'number' ? query.searchVolume : 1,
        chatgpt: query.chatgpt || 'not-visible',
        gemini: query.gemini || 'not-visible',
        perplexity: query.perplexity || 'not-visible',
        trafficPotential: query.trafficPotential || 0,
      }));

      logger.log(`${domain} için ${queries.length} sorgu oluşturuldu`);

      return {
        queries,
      };
    } catch (error: any) {
      logger.error(
        `JSON ayrıştırma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        error?.stack,
      );

      return {
        queries: [],
        errorMessage:
          'Sorgu analizi sonuçları ayrıştırılamadı. Lütfen daha sonra tekrar deneyin.',
      };
    }
  } catch (error: any) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Sorgu analizi sırasında beklenmeyen bir hata oluştu';

    logger.error(`Sorgu analizi hatası: ${errorMessage}`, error?.stack);

    return {
      queries: [],
      errorMessage,
    };
  }
}

/**
 * Benzersiz ID oluşturur
 * @returns Benzersiz ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * OpenAI skor hesaplama
 */
function calculateOpenAIScore(
  isDomainPresent: boolean,
  domainReferenceCount: number,
  totalReferenceCount: number,
): number {
  if (!isDomainPresent && domainReferenceCount === 0) {
    return 0;
  }

  let score = 0;

  // Alan adı yanıtta geçiyorsa temel puan
  if (isDomainPresent) {
    score += 50;
  }

  // Alan adı referansları için puan
  if (domainReferenceCount > 0) {
    score += Math.min(domainReferenceCount * 15, 40);
  }

  // Toplam referanslara göre oran puanı
  if (totalReferenceCount > 0 && domainReferenceCount > 0) {
    const ratio = domainReferenceCount / totalReferenceCount;
    score += Math.round(ratio * 10);
  }

  return Math.min(score, 100);
}

/**
 * OpenAI API isteği gönderme
 */
export async function searchWithOpenAI(
  domain: string,
  query: string,
): Promise<AISearchResult> {
  try {
    logger.log(`OpenAI API ile sorgu yapılıyor: ${query}`);

    // API anahtarı kontrolü
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API anahtarı bulunamadı');
      throw new Error('OpenAI API anahtarı bulunamadı');
    }

    // API isteği oluşturma
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        {
          role: 'system',
          content:
            'Sen bir arama motorusun. Kullanıcının sorusuna cevap verirken, güvenilir web sitelerinden bilgi sağlamalısın. Her yanıtında kullandığın kaynakları belirtmelisin.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    // Yanıtı ayrıştırma
    const content = response.choices[0]?.message?.content;
    logger.log('OpenAI API yanıtı alındı');

    // Yanıtta domain geçiyor mu kontrol et
    const isDomainPresent = content
      ?.toLowerCase()
      .includes(domain.toLowerCase());

    // URL referanslarını çıkart
    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    const references: string[] = content?.match(urlRegex) ?? [];

    // Domain referanslarını kontrol et
    const domainReferences = references.filter((url: string) =>
      url.includes(domain),
    );

    return {
      query,
      present: isDomainPresent || domainReferences.length > 0,
      references: domainReferences.length > 0 ? domainReferences : references,
      score: calculateOpenAIScore(
        !!isDomainPresent,
        domainReferences.length,
        references.length,
      ),
      content: content || undefined,
    };
  } catch (error: any) {
    // Hata yönetimi
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;

      logger.error(`OpenAI API hatası (${status}): ${message}`, error?.stack);

      throw new Error(`OpenAI API hatası: ${message}`);
    }

    logger.error(
      'OpenAI API ile arama yapılırken beklenmeyen hata',
      error?.stack,
    );

    throw new Error('OpenAI ile arama yapılırken bir hata oluştu');
  }
}

/**
 * Belirlenen bir arama motoru üzerinden arama yaparak, verilen domain'in görünürlüğünü kontrol eder.
 *
 * @param source Hangi AI kaynağının kullanılacağı (openai, gemini, perplexity)
 * @param query Arama sorgusu
 * @param domain Kontrol edilecek domain
 * @returns AISearchResult - Arama sonucu
 * @throws Error - Arama sırasında bir hata oluşursa
 */
export async function searchWithAI(
  source: AISource,
  query: string,
  domain: string,
): Promise<AISearchResult> {
  try {
    logger.log(
      `AI arama başlatılıyor: ${source}, Sorgu: "${query}", Domain: ${domain}`,
    );

    // Domain normalize et
    const normalizedDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    let result: AISearchResult;

    switch (source) {
      case AISource.OPENAI:
        result = await searchWithOpenAI(domain, query);
        break;
      case AISource.GEMINI:
        result = await searchWithGemini(query, domain, normalizedDomain);
        break;
      case AISource.PERPLEXITY:
        result = await searchWithPerplexity(query, domain, normalizedDomain);
        break;
      default:
        throw new Error(`Geçersiz AI kaynağı: ${source}`);
    }

    logger.log(
      `AI arama tamamlandı: ${source}, Sonuç: ${result.present ? 'Mevcut' : 'Mevcut değil'}, Skor: ${result.score}`,
    );
    return result;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`AI arama hatası (${source}): ${errorMessage}`, error?.stack);

    throw error;
  }
}

/**
 * Google Gemini ile arama yapar
 */
async function searchWithGemini(
  query: string,
  domain: string,
  normalizedDomain: string,
): Promise<AISearchResult> {
  // API anahtarını kontrol et
  if (!process.env.GOOGLE_GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    logger.warn('Google API anahtarı bulunamadı');
    throw new Error('Google API anahtarı bulunamadı');
  }

  // Gemini modeli al - geminiUtil kullanarak
  const model = geminiUtil.getGeminiModel(
    undefined,
    geminiUtil.MODEL_NAMES.PRO_LATEST,
  );

  const prompt = `
  ${query}
  
  Yukarıdaki sorgu için yanıt verirken, ${domain} web sitesinden bilgi kullanıp kullanamayacağını değerlendir. 
  
  Yanıtında ${domain} sitesinden bilgi kullanırsan, kullandığın sayfaların URL'lerini referans olarak listelemelisin.
  
  Yanıtını JSON formatında yapılandır:
  
  {
    "result": "Siteden bahsetti ve bilgi kullandı mı? (true/false)",
    "references": [Kullandığın ${domain} URL'leri listesi (boş olabilir)],
    "explanation": "Neden siteyi referans gösterdin veya göstermedin? Siteyi sorgu için uygun bir kaynak olarak değerlendiriyor musun?"
  }
  `;

  // API isteği gönder
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error('Gemini boş yanıt döndürdü');
  }

  try {
    // JSON'ı çıkar (metin içinde { } arasındaki JSON)
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('JSON formatında yanıt bulunamadı');
    }

    const jsonResponse = JSON.parse(jsonMatch[0]);
    const present = jsonResponse.result === true;
    const references = jsonResponse.references || [];

    // Skorlama: 0-100 arası
    const referenceScore = Math.min(references.length * 25, 75); // Her referans için 25 puan, max 75
    const mentionScore = present ? 25 : 0; // Site bahsedildiyse 25 puan
    const totalScore = referenceScore + mentionScore;

    return {
      query,
      present,
      references,
      score: totalScore,
    };
  } catch (error: any) {
    logger.error(
      `Gemini JSON analiz hatası: ${error instanceof Error ? error.message : String(error)}`,
      error?.stack,
    );
    throw new Error('Gemini yanıtı JSON olarak ayrıştırılamadı');
  }
}

/**
 * Perplexity ile arama yapar
 */
async function searchWithPerplexity(
  query: string,
  domain: string,
  normalizedDomain: string,
): Promise<AISearchResult> {
  // API anahtarını kontrol et
  if (!process.env.PERPLEXITY_API_KEY) {
    logger.warn('Perplexity API anahtarı bulunamadı');
    throw new Error('Perplexity API anahtarı bulunamadı');
  }

  try {
    const systemPrompt = `
    Sen yararlı bir AI araştırma asistanısın. Kullanıcıların web arama sorguları için, bilginin güncel ve doğru olmasını sağlayarak detaylı yanıtlar verirsin.
    
    Verilen sorguya ait bilgiler için ${domain} sitesini kaynak olarak kullanıp kullanamayacağını değerlendirmeni istiyorum.
    
    Yanıtında, "${domain}" web sitesinden veya alt sayfalarından bilgi kullanırsan, bu kaynakları referans olarak listelemelisin.
    
    Yanıtını JSON formatında yapılandır:
    
    {
      "result": "Siteden bahsetti ve bilgi kullandı mı? (true/false)",
      "references": [Kullandığın ${domain} URL'leri listesi (boş olabilir)],
      "explanation": "Neden siteyi referans gösterdin veya göstermedin? Siteyi sorgu için uygun bir kaynak olarak değerlendiriyor musun?"
    }
    `;

    const pplx = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });

    logger.log(`Perplexity API isteği gönderiliyor: ${query}`);

    const response = await pplx.chat.completions.create({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Perplexity boş yanıt döndürdü');
    }

    try {
      // JSON yanıtı ayrıştır
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON formatında yanıt bulunamadı');
      }

      const jsonResponse = JSON.parse(jsonMatch[0]);
      const present = jsonResponse.result === true;
      const references = jsonResponse.references || [];

      // Skorlama: 0-100 arası
      const referenceScore = Math.min(references.length * 25, 75); // Her referans için 25 puan, max 75
      const mentionScore = present ? 25 : 0; // Site bahsedildiyse 25 puan
      const totalScore = referenceScore + mentionScore;

      logger.log(
        `Perplexity yanıtı alındı: Görünürlük ${present ? 'VAR' : 'YOK'}, Skor: ${totalScore}`,
      );

      return {
        query,
        present,
        references,
        score: totalScore,
      };
    } catch (error: any) {
      logger.error(
        `Perplexity JSON analiz hatası: ${error instanceof Error ? error.message : String(error)}`,
        error?.stack,
      );
      throw new Error('Perplexity yanıtı JSON olarak ayrıştırılamadı');
    }
  } catch (error: any) {
    // Perplexity hata işleme
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Perplexity API hatası: ${errorMessage}`, error?.stack);

    throw new Error(`Perplexity API hatası: ${errorMessage}`);
  }
}

/**
 * Get Perplexity response for a single query
 */
async function getPerplexityResponse(query: string): Promise<string | null> {
  if (!process.env.PERPLEXITY_API_KEY) {
    logger.warn(`Perplexity API key not found for query: ${query}`);
    return null;
  }

  try {
    const pplx = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });

    const response = await pplx.chat.completions.create({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: query },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.warn(`Empty response from Perplexity for query: ${query}`);
      return null;
    }
    return content;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Perplexity API error for query "${query}": ${errorMessage}`,
      error?.stack,
    );
    return null;
  }
}

/**
 * Gets real AI responses for a list of queries using Perplexity API.
 */
export async function getAiResponsesForQueries(
  queries: string[],
  url: string,
): Promise<string[]> {
  logger.log(
    `Getting real AI responses for ${queries.length} queries using Perplexity.`,
  );

  const responses = await Promise.all(
    queries.map((query) => getPerplexityResponse(query)),
  );

  return responses.filter((response): response is string => response !== null);
}
