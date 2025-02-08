import { Injectable } from '@nestjs/common';
import { MemoryHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class MemoryHealthService {
  constructor(private readonly memoryHealthIndicator: MemoryHealthIndicator) {}

  async check() {
    // Define the heap and RSS usage thresholds in bytes
    const MAX_HEAP_USAGE = 150 * 1024 * 1024; // 150 MB
    const MAX_RSS_USAGE = 150 * 1024 * 1024; // 150 MB

    // Perform health check for both heap and RSS
    return Promise.all([
      this.memoryHealthIndicator.checkHeap('memory_heap', MAX_HEAP_USAGE),
      this.memoryHealthIndicator.checkRSS('memory_rss', MAX_RSS_USAGE),
    ]);
  }
}
