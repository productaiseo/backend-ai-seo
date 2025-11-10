/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * AiSEO Loglama Sistemi
 *
 * Bu modül, hem client hem de server tarafında kullanılabilecek tutarlı bir loglama API'si sağlar.
 */

import { AppError, ErrorType } from '../utils/errors';

/**
 * Log seviyeleri
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  NONE = 5, // Loglama kapalı
}

/**
 * Varsayılan log seviyesi
 */
const DEFAULT_LOG_LEVEL =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
    ? LogLevel.INFO
    : LogLevel.DEBUG;

/**
 * Döngüsel referansları yöneten güvenli JSON serileştirme fonksiyonu
 * @param obj Serileştirilecek nesne
 * @returns JSON string
 */
function safeJsonStringify(obj: any): string {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Döngüsel referans bulundu, '[Circular]' ile değiştir
        return '[Circular]';
      }
      // Değeri koleksiyonda sakla
      cache.add(value);
    }
    return value;
  });
}

/**
 * Hassas verileri maskeleme fonksiyonu
 * @param data Maskelenecek veri
 * @returns Maskelenmiş veri
 */
export function maskSensitiveData(data: any): any {
  if (!data) return data;

  try {
    const clonedData = JSON.parse(safeJsonStringify(data));

    // Hassas alan adları
    const sensitiveFields = [
      'password',
      'apiKey',
      'token',
      'secret',
      'authorization',
      'kullanıcıŞifresi',
      'apiAnahtarı',
      'gizliAnahtar',
    ];

    // Hassas verileri rekursif olarak maskele
    function maskRecursively(obj: any): any {
      if (!obj || typeof obj !== 'object') return obj;

      Object.keys(obj).forEach((key) => {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          obj[key] = typeof obj[key] === 'string' ? '***MASKELENDI***' : null;
        } else if (typeof obj[key] === 'object') {
          maskRecursively(obj[key]);
        }
      });

      return obj;
    }

    return maskRecursively(clonedData);
  } catch (error) {
    console.error('[maskSensitiveData] Veri maskelenirken hata oluştu:', error);
    return { error: 'Veri maskelenemedi' };
  }
}

/**
 * Basit loglama fonksiyonları
 */
const logger = {
  /**
   * Debug seviyesinde log yazdırır
   * @param message Log mesajı
   * @param context Opsiyonel bağlam bilgisi
   * @param data Opsiyonel veri
   */
  debug(message: string, context?: string, data?: any): void {
    if (DEFAULT_LOG_LEVEL <= LogLevel.DEBUG) {
      console.debug(
        `[DEBUG]${context ? `[${context}]` : ''} ${message}`,
        data ? maskSensitiveData(data) : '',
      );
    }
  },

  /**
   * Info seviyesinde log yazdırır
   * @param message Log mesajı
   * @param context Opsiyonel bağlam bilgisi
   * @param data Opsiyonel veri
   */
  info(message: string, context?: string, data?: any): void {
    if (DEFAULT_LOG_LEVEL <= LogLevel.INFO) {
      console.info(
        `[INFO]${context ? `[${context}]` : ''} ${message}`,
        data ? maskSensitiveData(data) : '',
      );
    }
  },

  /**
   * Warn seviyesinde log yazdırır
   * @param message Log mesajı
   * @param context Opsiyonel bağlam bilgisi
   * @param data Opsiyonel veri
   */
  warn(message: string, context?: string, data?: any): void {
    if (DEFAULT_LOG_LEVEL <= LogLevel.WARN) {
      console.warn(
        `[WARN]${context ? `[${context}]` : ''} ${message}`,
        data ? maskSensitiveData(data) : '',
      );
    }
  },

  /**
   * Error seviyesinde log yazdırır
   * @param error Loglanacak hata nesnesi veya mesaj
   * @param context Opsiyonel bağlam bilgisi
   * @param data Opsiyonel ek veri
   */
  error(error: string | Error, context?: string, data?: any): void {
    if (DEFAULT_LOG_LEVEL > LogLevel.ERROR) return;

    const baseLog = `[ERROR]${context ? `[${context}]` : ''}`;

    if (error instanceof Error) {
      // AppError veya standart Error nesneleri için toJSON metodunu kullan
      const errorObject =
        typeof (error as any).toJSON === 'function'
          ? (error as any).toJSON()
          : { name: error.name, message: error.message, stack: error.stack };

      const logData = {
        ...errorObject,
        ...data,
      };

      // Orijinal hatayı da serileştir
      if (logData.details && logData.details.originalError instanceof Error) {
        logData.details.originalError = {
          name: logData.details.originalError.name,
          message: logData.details.originalError.message,
          stack: logData.details.originalError.stack,
        };
      }

      console.error(`${baseLog} ${error.message}`, maskSensitiveData(logData));
    } else {
      // String mesajlar için
      console.error(`${baseLog} ${error}`, data ? maskSensitiveData(data) : '');
    }
  },

  /**
   * Fatal seviyesinde log yazdırır
   * @param message Log mesajı veya hata nesnesi
   * @param context Opsiyonel bağlam bilgisi
   * @param data Opsiyonel veri
   */
  fatal(message: string | Error, context?: string, data?: any): void {
    if (DEFAULT_LOG_LEVEL <= LogLevel.FATAL) {
      if (message instanceof Error) {
        console.error(
          `[FATAL]${context ? `[${context}]` : ''} ${message.message}`,
          data ? maskSensitiveData(data) : '',
          '\nStack:',
          message.stack || '',
        );
      } else {
        console.error(
          `[FATAL]${context ? `[${context}]` : ''} ${message}`,
          data ? maskSensitiveData(data) : '',
        );
      }
    }
  },

  /**
   * API isteklerini izler
   * @param endpoint API endpoint'i
   * @param statusCode HTTP durum kodu
   * @param durationMs İşlem süresi (ms)
   * @param metadata Ek meta veri
   */
  trackApiRequest(
    endpoint: string,
    statusCode: number,
    durationMs: number,
    metadata?: any,
  ): void {
    const timestamp = new Date().toISOString();

    if (statusCode >= 400) {
      this.error(
        `API isteği başarısız: ${endpoint} (${statusCode})`,
        'api-request',
        {
          ...maskSensitiveData(metadata),
          statusCode,
          durationMs,
          timestamp,
        },
      );
    } else {
      this.info(
        `API isteği: ${endpoint} (${statusCode}, ${durationMs}ms)`,
        'api-request',
        {
          ...maskSensitiveData(metadata),
          statusCode,
          durationMs,
          timestamp,
        },
      );
    }
  },

  /**
   * Performans verilerini izler
   * @param operation İşlem adı
   * @param durationMs İşlem süresi (ms)
   * @param metadata Ek meta veri
   */
  trackPerformance(
    operation: string,
    durationMs: number,
    metadata?: any,
  ): void {
    const timestamp = new Date().toISOString();

    if (durationMs > 1000) {
      this.warn(`Performans: ${operation} (${durationMs}ms)`, 'performance', {
        ...maskSensitiveData(metadata),
        durationMs,
        timestamp,
      });
    } else {
      this.debug(`Performans: ${operation} (${durationMs}ms)`, 'performance', {
        ...maskSensitiveData(metadata),
        durationMs,
        timestamp,
      });
    }
  },

  /**
   * Kullanıcı eylemlerini izler
   * @param action Kullanıcı eylemi
   * @param userId Kullanıcı ID'si
   * @param metadata Ek meta veri
   */
  trackUserAction(action: string, userId: string, metadata?: any): void {
    const timestamp = new Date().toISOString();

    this.info(
      `Kullanıcı Eylemi: ${action} (Kullanıcı: ${userId})`,
      'user-action',
      {
        ...maskSensitiveData(metadata),
        userId,
        action,
        timestamp,
      },
    );
  },

  /**
   * Hataları güvenli bir şekilde loglar ve işler
   * @param error Hata nesnesi
   * @param context Bağlam bilgisi
   * @param metadata Ek meta veri
   */
  logErrorSafely(
    error: Error | AppError | unknown,
    context: string,
    metadata?: any,
  ): void {
    const timestamp = new Date().toISOString();

    try {
      // AppError tipine dönüştür
      const appError =
        error instanceof AppError
          ? error
          : new AppError(
              ErrorType.UNKNOWN,
              error instanceof Error ? error.message : 'Bilinmeyen hata',
              { originalError: error },
            );

      // Hata tipine göre uygun seviyede logla
      if (
        appError.type === ErrorType.FATAL ||
        appError.type === ErrorType.SYSTEM
      ) {
        this.fatal(appError, context, {
          ...maskSensitiveData(metadata),
          timestamp,
        });
      } else {
        this.error(appError, context, {
          ...maskSensitiveData(metadata),
          timestamp,
        });
      }
    } catch (loggingError) {
      // Loglama sırasında hata oluşursa, en basit şekilde konsola yaz
      console.error('Loglama hatası:', loggingError);
      console.error('Orijinal hata:', error);
    }
  },

  /**
   * Sessiz hata işleyicisi - hataları yakalar ve güvenli şekilde loglar
   * @param fn Çalıştırılacak asenkron fonksiyon
   * @param context Bağlam bilgisi
   * @returns Orijinal fonksiyonun çağrılmasıyla oluşan Promise
   */
  silentErrorHandler<T>(
    fn: () => Promise<T>,
    context: string,
  ): Promise<T | null> {
    return fn().catch((error) => {
      this.logErrorSafely(error, context);
      return null;
    });
  },

  /**
   * Asenkron işlemlerin performansını ölçer ve loglar
   * @param operation İşlem adı
   * @param fn Çalıştırılacak asenkron fonksiyon
   * @param context Bağlam bilgisi
   * @returns Orijinal fonksiyonun çağrılmasıyla oluşan Promise
   */
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context: string,
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - startTime);
      this.trackPerformance(operation, duration, { context });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      this.trackPerformance(operation, duration, { context, error: true });
      throw error;
    }
  },
};

// Logger nesnesini varsayılan dışa aktarım olarak ayarla
export default logger;
