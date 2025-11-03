// GEO Score Details field translations
export const getGeoScoreDetailsFields = (locale: string) => {
  const fields = {
    tr: {
      values: {
        high: 'yüksek',
        medium: 'orta',
        low: 'düşük',
        positive: 'pozitif',
        negative: 'negatif',
        stable: 'stabil',
      },
    },
    en: {
      values: {
        high: 'high',
        medium: 'medium',
        low: 'low',
        positive: 'positive',
        negative: 'negative',
        stable: 'stable',
      },
    },
    es: {
      values: {
        high: 'alto',
        medium: 'medio',
        low: 'bajo',
        positive: 'positivo',
        negative: 'negativo',
        stable: 'estable',
      },
    },
    fr: {
      values: {
        high: 'élevé',
        medium: 'moyen',
        low: 'faible',
        positive: 'positif',
        negative: 'négatif',
        stable: 'stable',
      },
    },
    de: {
      values: {
        high: 'hoch',
        medium: 'mittel',
        low: 'niedrig',
        positive: 'positiv',
        negative: 'negativ',
        stable: 'stabil',
      },
    },
  };
  return fields[locale as keyof typeof fields] || fields['en'];
};
