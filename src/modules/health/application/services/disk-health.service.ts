import { Injectable } from '@nestjs/common';
import { DiskHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class DiskHealthService {
  constructor(private readonly diskHealthIndicator: DiskHealthIndicator) {}

  async check() {
    // Define the path and threshold for the disk check
    const DEFAULT_DISK_PATH = process.platform === 'win32' ? 'C:\\' : '/'; // Default to C:\ for Windows, root for others
    const MAX_DISK_USAGE_90_PERCENT = 0.9; // disk usage limit

    return this.diskHealthIndicator.checkStorage('disk', {
      path: DEFAULT_DISK_PATH,
      thresholdPercent: MAX_DISK_USAGE_90_PERCENT,
    });
  }
}
