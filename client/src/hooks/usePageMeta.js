import { useEffect } from 'react';

/**
 * Lightweight, dependency-free hook to manage document title, meta description, and canonical link
 * per page in a client-rendered React SPA.
 *
 * Supports both object signature: usePageMeta({ title, description, canonical })
 * and positional signature: usePageMeta(title, description, canonicalUrl)
 */
export const usePageMeta = (titleOrConfig, maybeDescription, maybeCanonicalUrl) => {
  let title = '';
  let description = '';
  let canonicalUrl = 'https://www.briefenai.me/';

  if (titleOrConfig && typeof titleOrConfig === 'object') {
    title = typeof titleOrConfig.title === 'string' ? titleOrConfig.title : '';
    description = typeof titleOrConfig.description === 'string' ? titleOrConfig.description : '';
    canonicalUrl =
      typeof titleOrConfig.canonical === 'string'
        ? titleOrConfig.canonical
        : typeof titleOrConfig.canonicalUrl === 'string'
        ? titleOrConfig.canonicalUrl
        : 'https://www.briefenai.me/';
  } else {
    title = typeof titleOrConfig === 'string' ? titleOrConfig : '';
    description = typeof maybeDescription === 'string' ? maybeDescription : '';
    canonicalUrl = typeof maybeCanonicalUrl === 'string' ? maybeCanonicalUrl : 'https://www.briefenai.me/';
  }

  useEffect(() => {
    // 1. Update Title safely
    if (title) {
      document.title = title.includes('EnhanceUs') ? title : `${title} | EnhanceUs`;
    }

    // 2. Update Meta Description if provided
    if (description) {
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.setAttribute('name', 'description');
        document.head.appendChild(descMeta);
      }
      descMeta.setAttribute('content', description);
    }

    // 3. Update or verify canonical link
    if (canonicalUrl) {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', canonicalUrl);
    }
  }, [title, description, canonicalUrl]);
};

export default usePageMeta;
