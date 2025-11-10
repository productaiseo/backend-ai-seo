/**
 * AiSEO Hata Yönetim Modülü
 *
 * Bu modül, uygulamada oluşabilecek hataları standart bir şekilde yönetmek için
 * gerekli yapıları içerir.
 */

/**
 * Hata türleri
 */
export enum ErrorType {
  // Sistem hataları
  SYSTEM = 'SYSTEM', // Genel sistem hataları
  FATAL = 'FATAL', // Kurtarılamayan hatalar
  SERVER_ERROR = 'SERVER_ERROR', // Sunucu taraflı hatalar
  NETWORK_ERROR = 'NETWORK_ERROR', // Ağ bağlantısı hataları
  DATABASE_ERROR = 'DATABASE_ERROR', // Veritabanı hataları

  // İş mantığı hataları
  VALIDATION = 'VALIDATION', // Doğrulama hataları
  AUTHENTICATION = 'AUTHENTICATION', // Kimlik doğrulama hataları
  AUTHORIZATION = 'AUTHORIZATION', // Yetkilendirme hataları
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND', // Kaynak bulunamadı

  // API hataları
  API_ERROR = 'API_ERROR', // Genel API hataları
  AI_ANALYSIS_ERROR = 'AI_ANALYSIS_ERROR', // AI Analiz Hatası
  RATE_LIMIT = 'RATE_LIMIT', // API hız sınırı aşımı
  SCRAPING_ERROR = 'SCRAPING_ERROR', // Web scraping hataları
  DNS_RESOLUTION_ERROR = 'DNS_RESOLUTION_ERROR', // DNS çözümleme hatası

  // İstemci hataları
  CLIENT_ERROR = 'CLIENT_ERROR', // İstemci taraflı hatalar
  URL_FORMAT = 'URL_FORMAT', // URL format hatası

  // Diğer
  ANALYSIS_FAILED = 'ANALYSIS_FAILED', // Analiz hatası
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR', // Dahili Sunucu Hatası
  CONFIGURATION = 'CONFIGURATION', // Yapılandırma hatası
  PARSING = 'PARSING', // Ayrıştırma hatası
  AI_SERVICE = 'AI_SERVICE', // AI Servis hatası
  UNKNOWN = 'UNKNOWN', // Bilinmeyen hatalar
  EXTERNAL_API = 'EXTERNAL_API', // Harici API hataları
}

/**
 * Hata durumu HTTP durum kodları
 */
export enum ErrorHttpStatusCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Hata kodları
 */
export enum ErrorCode {
  // Genel hatalar
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // URL ve site hataları
  INVALID_URL = 'INVALID_URL',
  SITE_NOT_FOUND = 'SITE_NOT_FOUND',
  SITE_NOT_ACCESSIBLE = 'SITE_NOT_ACCESSIBLE',

  // API hataları
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_BAD_REQUEST = 'API_BAD_REQUEST',

  // Analiz hataları
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  NO_RESULTS = 'NO_RESULTS',

  // AI Analiz Hataları
  OPENAI_ANALYSIS_FAILED = 'OPENAI_ANALYSIS_FAILED',
  GEMINI_ANALYSIS_FAILED = 'GEMINI_ANALYSIS_FAILED',
  ANALYSIS_AGGREGATION_FAILED = 'ANALYSIS_AGGREGATION_FAILED',
  PROMPT_GENERATION_FAILED = 'PROMPT_GENERATION_FAILED',
}

/**
 * Hata detayları için arayüz
 */
export interface ErrorDetails {
  userFriendlyMessage?: string; // Kullanıcı dostu hata mesajı
  errorCode?: ErrorCode; // Hata kodu
  technicalDetails?: string; // Teknik detaylar (sadece loglamada kullanılacak)
  contextData?: any; // Bağlam verileri
  httpStatusCode?: number; // HTTP durum kodu
  body?: any; // Harici API yanıt gövdesi
  originalError?: any; // Orijinal hata nesnesi
  status?: number; // Harici API durum kodu
}

/**
 * Uygulama hata sınıfı
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly details: ErrorDetails;

  constructor(type: ErrorType, message: string, details: ErrorDetails = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.details = details;

    // Error sınıfında stack trace'in doğru çalışması için
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Hata nesnesini JSON formatına dönüştürür.
   * Bu metod, JSON.stringify çağrıldığında otomatik olarak kullanılır.
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Ağ hatası oluşturma yardımcı fonksiyonu
 */
export function createNetworkError(
  message: string,
  details?: ErrorDetails,
): AppError {
  return new AppError(ErrorType.NETWORK_ERROR, message, {
    userFriendlyMessage:
      details?.userFriendlyMessage ||
      'Ağ bağlantısı sırasında bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.',
    errorCode: ErrorCode.SITE_NOT_ACCESSIBLE,
    ...details,
  });
}

/**
 * Doğrulama hatası oluşturma yardımcı fonksiyonu
 */
export function createValidationError(
  message: string,
  details?: ErrorDetails,
): AppError {
  return new AppError(ErrorType.VALIDATION, message, {
    userFriendlyMessage:
      details?.userFriendlyMessage ||
      'Lütfen girdiğiniz bilgileri kontrol edin.',
    errorCode: details?.errorCode || ErrorCode.INVALID_URL,
    ...details,
  });
}

/**
 * API hatası oluşturma yardımcı fonksiyonu
 */
export function createApiError(
  message: string,
  details?: ErrorDetails,
): AppError {
  return new AppError(ErrorType.API_ERROR, message, {
    userFriendlyMessage:
      details?.userFriendlyMessage ||
      'API isteği sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
    errorCode: details?.errorCode || ErrorCode.API_UNAVAILABLE,
    ...details,
  });
}

/**
 * Yeniden denenebilir bir hata olup olmadığını kontrol eder
 */
export function isErrorRetryable(error: Error | AppError): boolean {
  if (error instanceof AppError) {
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.API_ERROR,
      ErrorType.RATE_LIMIT,
    ].includes(error.type);
  }

  return false;
}
