import { Injectable } from '@nestjs/common';
import { DiskHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class DiskHealthService {
  constructor(private readonly diskHealthIndicator: DiskHealthIndicator) {}

  async check() {
    // Define the path and threshold for the disk check
    const diskPath = process.platform === 'win32' ? 'C:\\' : '/'; // Default to C:\ for Windows, root for others
    const diskThreshold = 0.9; // 80% disk usage threshold

    return this.diskHealthIndicator.checkStorage('disk', {
      path: diskPath,
      thresholdPercent: diskThreshold,
    });
  }
}
