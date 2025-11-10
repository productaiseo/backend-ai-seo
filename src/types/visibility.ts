export enum VisibilityLevel {
  NOT_VISIBLE = 'not_visible', // 0.0 puan - Hiç görünmüyor
  LOW_VISIBILITY = 'low_visibility', // 0.3 puan - Düşük görünürlük (örn. sadece bir kez bahsedilmiş)
  MEDIUM_VISIBILITY = 'medium_visibility', // 0.7 puan - Orta görünürlük (örn. birkaç kez bahsedilmiş)
  HIGH_VISIBILITY = 'high_visibility', // 1.0 puan - Yüksek görünürlük (örn. ana kaynak olarak kullanılmış)
}

/**
 * Analiz güven seviyesi - Sonuçların ne kadar güvenilir olduğunu belirtir
 */
export enum ConfidenceLevel {
  LOW = 'LOW', // Düşük güven (örn. platformlar arasında tutarsızlık var)
  MEDIUM = 'MEDIUM', // Orta güven (örn. bazı platformlarda görünür, bazılarında değil)
  HIGH = 'HIGH', // Yüksek güven (örn. tüm platformlarda tutarlı sonuçlar)
}

/**
 * Eski uyumluluk için görünürlük durumu tipleri
 * (Geriye dönük uyumluluk için muhafaza edildi)
 */
export type VisibilityType =
  | 'visible'
  | 'partially'
  | 'not_visible'
  | 'unknown';

/**
 * Görünürlük seviyesini, eski görünürlük tipine dönüştürür
 */
export function mapVisibilityLevelToType(
  level: VisibilityLevel,
): VisibilityType {
  switch (level) {
    case VisibilityLevel.HIGH_VISIBILITY:
      return 'visible';
    case VisibilityLevel.MEDIUM_VISIBILITY:
    case VisibilityLevel.LOW_VISIBILITY:
      return 'partially';
    case VisibilityLevel.NOT_VISIBLE:
      return 'not_visible';
    default:
      return 'unknown';
  }
}

/**
 * Görünürlük seviyesini sayısal puana dönüştürür (0.0-1.0 aralığı)
 */
export function getVisibilityScore(level: VisibilityLevel): number {
  switch (level) {
    case VisibilityLevel.HIGH_VISIBILITY:
      return 1.0;
    case VisibilityLevel.MEDIUM_VISIBILITY:
      return 0.7;
    case VisibilityLevel.LOW_VISIBILITY:
      return 0.3;
    case VisibilityLevel.NOT_VISIBLE:
      return 0.0;
    default:
      return 0.0;
  }
}

/**
 * İçerik analizi skorları için arayüz
 */
export interface ContentMetrics {
  structure: number; // İçerik yapısı puanı (h1, h2, listeler vb.)
  credibility: number; // Güvenilirlik puanı (alıntılar, kaynaklar, referanslar)
  readability: number; // Okunabilirlik puanı (cümle uzunluğu, kelime karmaşıklığı vb.)
  relevance: number; // İlgililik puanı (anahtar kelime yoğunluğu vb.)
  depth: number; // İçerik derinliği puanı (kelime sayısı, detay seviyesi)
  freshness: number; // Güncellik puanı (son güncelleme tarihi, güncel bilgiler)
}

/**
 * Bir platformdaki görünürlük sonucu için arayüz
 */
export interface PlatformVisibilityResult {
  visibilityLevel: VisibilityLevel;
  score: number; // 0-100 arası hesaplanmış platform skoru
  references?: string[]; // Platformun sonuçlarındaki referanslar
  summary?: string; // Platform tarafından üretilen özet
  explanation?: string; // Görünürlük sonucuna dair açıklama
  rawResponse?: any; // Platform API'sinden gelen ham yanıt (debug için)
  error?: string; // Hata durumunda hata mesajı
}

/**
 * Görünürlük analizi ağırlıkları için arayüz
 */
export interface VisibilityWeights {
  platforms: Record<string, number>; // Platform ağırlıkları (örn. { 'openai': 0.3, 'gemini': 0.3, ... })
  contentMetrics: {
    structure: number; // Yapı ağırlığı
    credibility: number; // Güvenilirlik ağırlığı
    readability: number; // Okunabilirlik ağırlığı
    relevance: number; // İlgililik ağırlığı
    depth: number; // Derinlik ağırlığı
    freshness: number; // Güncellik ağırlığı
  };
}

/**
 * Varsayılan görünürlük ağırlıkları
 */
export const DEFAULT_VISIBILITY_WEIGHTS: VisibilityWeights = {
  platforms: {
    openai: 0.25,
    gemini: 0.25,
    azure: 0.2,
    google: 0.15,
    bing: 0.15,
  },
  contentMetrics: {
    structure: 0.2,
    credibility: 0.25,
    readability: 0.15,
    relevance: 0.2,
    depth: 0.1,
    freshness: 0.1,
  },
};

/**
 * İyileştirme önerisi için arayüz
 */
export interface Recommendation {
  id: string; // Benzersiz öneri ID'si
  text: string; // Öneri metni
  category: 'content' | 'structure' | 'credibility' | 'technical' | 'general'; // Öneri kategorisi
  priority: 'high' | 'medium' | 'low'; // Öneri önceliği
  impact: 'high' | 'medium' | 'low'; // Öneri etkisi
  action: 'addition' | 'improvement' | 'removal'; // Öneri eylem tipi
  metricKey?: keyof ContentMetrics; // İlgili metrik (varsa)
  details?: string; // Ek detaylar
}

/**
 * Tüm platformlardaki görünürlük analizinin sonucunu temsil eder
 */
export interface VisibilityAnalysisResult {
  overallScore: number; // 0-100 arası genel görünürlük skoru
  confidenceLevel: ConfidenceLevel; // Analizin güven seviyesi
  platformResults: Record<string, PlatformVisibilityResult>; // Her platform için ayrıntılı sonuçlar
  summary?: string; // Tüm analiz için genel özet
}
