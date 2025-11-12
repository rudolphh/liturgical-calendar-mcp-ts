/**
 * Simple in-memory cache for API responses
 * Reduces API calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private ttl: number; // Time-to-live in milliseconds

  /**
   * Creates a new memory cache
   * @param ttlMinutes - Cache time-to-live in minutes (default: 60)
   */
  constructor(ttlMinutes = 60) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * Generates a cache key from components
   * @param parts - Key components
   * @returns Cache key string
   */
  private generateKey(...parts: (string | number | undefined)[]): string {
    return parts.filter(p => p !== undefined).join(':');
  }

  /**
   * Gets a value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data as T;
  }

  /**
   * Sets a value in cache
   * @param key - Cache key
   * @param data - Data to cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Gets or fetches a value (cache-aside pattern)
   * @param key - Cache key
   * @param fetchFn - Function to fetch data if not cached
   * @returns Cached or freshly fetched data
   */
  async getOrFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const data = await fetchFn();
    this.set(key, data);
    return data;
  }

  /**
   * Clears all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   * @returns Cache size and oldest entry age
   */
  getStats(): { size: number; oldestEntryAgeMinutes: number | null } {
    if (this.cache.size === 0) {
      return { size: 0, oldestEntryAgeMinutes: null };
    }

    let oldestTimestamp = Date.now();
    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      oldestEntryAgeMinutes: Math.floor((Date.now() - oldestTimestamp) / 60000)
    };
  }

  /**
   * Helper to generate cache key for calendar requests
   */
  calendarKey(type: string, year: number, locale: string, nation?: string, diocese?: string): string {
    return this.generateKey(type, year, locale, nation, diocese);
  }
}

// Export singleton instance
export const cache = new MemoryCache(60); // 60 minute TTL
