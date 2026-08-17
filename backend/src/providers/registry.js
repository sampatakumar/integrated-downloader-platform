import YouTubeProvider from './youtube/provider.js';
import DirectProvider from './direct/provider.js';
import {
  VimeoProvider,
  TikTokProvider,
  RedditProvider,
  InstagramProvider,
  FacebookProvider
} from './otherProviders.js';

// Maintain order, placing Direct Link matcher at the bottom as a final fallback
const providers = [
  new YouTubeProvider(),
  new VimeoProvider(),
  new TikTokProvider(),
  new RedditProvider(),
  new InstagramProvider(),
  new FacebookProvider(),
  new DirectProvider()
];

/**
 * Finds the provider that can handle the given URL.
 * @param {string} url - Target URL.
 * @returns {Provider|null}
 */
export function getProvider(url) {
  for (const provider of providers) {
    if (provider.canHandle(url)) {
      return provider;
    }
  }
  return null;
}

/**
 * Lists metadata of all active providers for the front-end to render.
 * @returns {Array<object>}
 */
export function getSupportedProviders() {
  return [
    { id: 'youtube', name: 'YouTube', domains: 'youtube.com, youtu.be' },
    { id: 'instagram', name: 'Instagram', domains: 'instagram.com' },
    { id: 'tiktok', name: 'TikTok', domains: 'tiktok.com' },
    { id: 'facebook', name: 'Facebook', domains: 'facebook.com, fb.watch' },
    { id: 'reddit', name: 'Reddit', domains: 'reddit.com' },
    { id: 'vimeo', name: 'Vimeo', domains: 'vimeo.com' },
    { id: 'direct', name: 'Direct Links', domains: '.mp4, .mp3, .mkv, .mov, etc.' }
  ];
}
