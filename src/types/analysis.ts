import {
  ContentMetrics,
  Recommendation,
  VisibilityAnalysisResult,
} from '../types/visibility';
// import { Query } from '@/components/QueryTable';
import { Buffer } from 'buffer';

// /api/analyze-domain için ana yanıt tipi
export interface ComprehensiveAnalysisResult {
  domain: string;
  score: number;
  analysisDate: string;
  platformResults: Record<string, { exists: boolean; score: number }>;
  contentMetrics: ContentMetrics;
  recommendations: Recommendation[];
  queries: any[];
  aiOverview?: any; // Google AI Overview verisi
  serpApiResults?: any; // SerpAPI'den gelen organik sonuçlar ve diğer veriler
}

// Analiz adımları için tip
export type AnalysisStep =
  | 'crawling'
  | 'visibility'
  | 'content'
  | 'recommendations'
  | 'report';

// Yeni Raporlama Arayüzü için Veri Yapısı
export interface ReportData {
  domain: string;
  overallScore: number;
  analysisDate: string;
  scores: {
    content: number;
    authority: number;
    technical: number;
    engagement: number;
  };
  platformVisibility: {
    [key: string]: { exists: boolean; score?: number };
  };
  detailedScores: {
    content: {
      structure: number;
      readability: number;
      depth: number;
      freshness: number;
    };
    authority: {
      credibility: number;
    };
  };
  actionableInsights: {
    text: string;
    priority: 'high' | 'medium' | 'low';
    category: 'Content' | 'Authority' | 'Technical' | 'Engagement';
  }[];
  scoreHistory: { date: string; score: number }[];
  topQueries: { query: string; volume: number; position: number }[];
  mainContent: string; // Sayfanın ana metin içeriği
}

// Arama motoru sonucunu modellemek için yeni bir arayüz
export interface SearchEngineResult {
  found: boolean;
  rank?: number;
  url?: string;
}

// Gelişmiş içerik metrikleri
export interface AdvancedContentMetrics extends ContentMetrics {
  semanticClarity: number; // Anlamsal netlik (AI tarafından değerlendirilecek)
  technicalSEOScore: number; // Meta etiketler, alt textler vb.
  accessibilityScore: number; // Erişilebilirlik metrikleri
}

// Skorlama faktörlerini birleştiren ana arayüz
export interface ScoringFactors {
  searchResult: SearchEngineResult;
  contentMetrics: AdvancedContentMetrics;
  domainAuthority: number; // Harici bir araçtan veya tahminden gelebilir
  aiAnalysis: VisibilityAnalysisResult; // Mevcut aiAnalyzer sonucu
}

export interface ScrapeResult {
  html: string;
  content: string;
  robotsTxt?: string;
  llmsTxt?: string;
  screenshot?: Buffer;
  performanceMetrics: any;
}
