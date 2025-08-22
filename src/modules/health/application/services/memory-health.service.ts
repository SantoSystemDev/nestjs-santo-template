import { Injectable } from '@nestjs/common';
import { MemoryHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class MemoryHealthService {
  constructor(private readonly memoryHealthIndicator: MemoryHealthIndicator) {}

  async check() {
    // Define os limites de uso de heap e RSS em bytes
    const MAX_HEAP_USAGE = 150 * 1024 * 1024; // 150 MB
    const MAX_RSS_USAGE = 150 * 1024 * 1024; // 150 MB

    // Os métodos checkHeap e checkRSS agora retornam objetos diretamente
    const [heap, rss] = await Promise.all([
      this.memoryHealthIndicator.checkHeap('memory_heap', MAX_HEAP_USAGE),
      this.memoryHealthIndicator.checkRSS('memory_rss', MAX_RSS_USAGE),
    ]);
    return { ...heap, ...rss };
  }
}
