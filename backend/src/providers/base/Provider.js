/**
 * Base Provider interface.
 * All supported media platforms (YouTube, Vimeo, Direct, etc.) must extend this.
 */
export class Provider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Determine if this provider is capable of processing the given URL.
   * @param {string} url - The URL to inspect.
   * @returns {boolean}
   */
  canHandle(url) {
    throw new Error(`Method canHandle() not implemented on provider ${this.name}`);
  }

  /**
   * Parse media metadata from the source URL.
   * @param {string} url - The URL to analyze.
   * @returns {Promise<object>} Metadata detailing title, author, formats, thumbnails, etc.
   */
  async analyze(url) {
    throw new Error(`Method analyze() not implemented on provider ${this.name}`);
  }

  /**
   * Process and execute download/conversion workflow.
   * @param {string} url - The URL to download.
   * @param {object} options - Format, quality, and output destination options.
   * @param {function} onProgress - Callback tracking progress changes: (progressPercentage, speedMbSec, etaSec)
   * @returns {Promise<string>} The path to the final output file.
   */
  async download(url, options, onProgress) {
    throw new Error(`Method download() not implemented on provider ${this.name}`);
  }
}
export default Provider;
