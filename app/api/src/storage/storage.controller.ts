import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('storage')
export class StorageController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get('*')
  async serve(@Req() req: Request, @Res() res: Response) {
    const key = ((req.params as Record<string, string>)?.[0] ?? '')
      .replace(/^\/+/, '')
      .replace(/\\/g, '/');

    const rootDir =
      this.config.get<string>('storage.localRootPath') ??
      path.resolve(process.cwd(), 'storage');
    const filePath = this.resolveFilePath(rootDir, key);

    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        throw new NotFoundException('File not found');
      }

      const buffer = await fs.readFile(filePath);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', String(buffer.length));
      return res.send(buffer);
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  private resolveFilePath(rootDir: string, key: string) {
    const safeRoot = path.resolve(rootDir);
    const safeKey = path
      .normalize(key)
      .replace(/^\.+(?=\/|$)/, '')
      .replace(/^\/+/, '');
    const filePath = path.resolve(safeRoot, safeKey);

    if (filePath !== safeRoot && !filePath.startsWith(safeRoot + path.sep)) {
      throw new NotFoundException('File not found');
    }

    return filePath;
  }
}
