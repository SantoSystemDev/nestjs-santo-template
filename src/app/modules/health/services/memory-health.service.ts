import { Injectable } from '@nestjs/common';
import { MemoryHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class MemoryHealthService {
  constructor(private readonly memoryHealthIndicator: MemoryHealthIndicator) {}

  async check() {
    // Define the heap and RSS usage thresholds in bytes
    const heapThreshold = 150 * 1024 * 1024; // 150 MB for heap
    const rssThreshold = 150 * 1024 * 1024; // 150 MB for RSS

    // Perform health check for both heap and RSS
    return Promise.all([
      this.memoryHealthIndicator.checkHeap('memory_heap', heapThreshold),
      this.memoryHealthIndicator.checkRSS('memory_rss', rssThreshold),
    ]);
  }
}
