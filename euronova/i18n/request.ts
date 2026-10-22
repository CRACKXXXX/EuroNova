import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

function isPlainObject(item: unknown): item is Record<string, unknown> {
  return typeof item === 'object' && item !== null && !Array.isArray(item);
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      output[key as keyof T] = deepMerge(targetValue, sourceValue) as T[keyof T];
    } else if (sourceValue !== undefined && sourceValue !== '') {
      output[key as keyof T] = sourceValue as T[keyof T];
    }
  }
  return output;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  type Locale = (typeof routing.locales)[number];
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  // Load master English dictionary as the baseline
  const enMessages = (await import('../messages/en.json')).default;

  let messages = enMessages;
  if (locale !== 'en') {
    try {
      const localeMessages = (await import(`../messages/${locale}.json`)).default;
      messages = deepMerge(enMessages, localeMessages);
    } catch {
      messages = enMessages;
    }
  }

  return {
    locale,
    messages,
    onError(error) {
      if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_I18N === 'true') {
        console.warn(`[next-intl] ${error.code}: ${error.message}`);
      }
    },
    getMessageFallback({ key }) {
      const segments = key.split('.');
      return segments[segments.length - 1] || key;
    },
  };
});
