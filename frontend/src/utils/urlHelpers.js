/**
 * URL Helper Functions
 * 
 * This module provides utility functions for working with URLs and paths
 * to prevent common issues like double forward slashes in hrefs.
 */

/**
 * Normalizes a URL path to prevent double slashes and ensure proper formatting
 * @param {string} base - The base part of the URL (e.g., '/news')
 * @param {string} path - The path or ID to append (e.g., '123')
 * @returns {string} - A properly formatted URL path
 */
export const normalizePath = (base, path = '') => {
  // Remove trailing slash from base if present
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Join with a single slash
  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
};

/**
 * Ensures a URL doesn't have protocol-relative issues (// problems)
 * @param {string} url - The URL to normalize
 * @returns {string} - A properly formatted URL
 */
export const normalizeUrl = (url) => {
  if (!url) return '';

  // Fix double slashes that aren't part of the protocol
  return url.replace(/:\/\/([^/])/, '://$1').replace(/([^:])\/\/+/g, '$1/');
};

/**
 * Creates a valid href for Next.js router
 * @param {string} path - The path to format
 * @returns {string} - A properly formatted href
 */
export const createValidHref = (path) => {
  // Remove any double slashes and ensure proper formatting
  return path.replace(/\/+/g, '/');
};

export default {
  normalizePath,
  normalizeUrl,
  createValidHref
}; 