import { useEffect } from 'react';

/**
 * Lightweight, dependency-free hook to manage document title, meta description, and canonical link
 * per page in a client-rendered React SPA.
 *
 * @param {string} title - Page title to be displayed in browser tab / search snippets
 * @param {string} [description] - Optional page-specific description for search engines
 * @param {string} [canonicalUrl] - Optional canonical URL (defaults to production root if omitted)
 */
export const usePageMeta = (title, description, canonicalUrl = 'https://www.briefenai.me/') => {
  useEffect(() => {
    // 1. Update Title
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
