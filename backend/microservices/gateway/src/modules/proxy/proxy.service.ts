import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { resolveTarget } from './proxy.routes';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  private sanitizeHeadersForLog(headers: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const lower = key.toLowerCase();
      if (lower === 'authorization' || lower === 'cookie' || lower === 'set-cookie') {
        masked[key] = '***';
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  /** Резолвит downstream по карте маршрутов и проксирует запрос как есть. */
  async proxy(req: Request, res: Response) {
    const target = resolveTarget(req.path);

    if (!target) {
      // Неизвестный префикс — это ошибка конфигурации, а не 502 downstream'а.
      throw new NotFoundException(`No route configured for ${req.path}`);
    }

    return this.proxyRequest(req, res, target.baseUrl, target.name);
  }

  private async proxyRequest(
    req: Request,
    res: Response,
    targetBaseUrl: string,
    serviceName: string,
  ) {
    if (!targetBaseUrl || targetBaseUrl === 'undefined') {
      this.logger.error(`Proxy ${serviceName}: targetBaseUrl is not set (env missing).`);
      res.status(502).json({ statusCode: 502, message: `Bad Gateway - ${serviceName} URL not configured`, error: 'Bad Gateway' });
      return;
    }
    const targetUrl = `${targetBaseUrl}${req.originalUrl}`;
    this.logger.debug(`Proxying to ${serviceName}: ${req.method} ${targetUrl}`);
    try {
      const incomingContentTypeHeader = req.headers['content-type'];
      const incomingContentType = Array.isArray(incomingContentTypeHeader)
        ? incomingContentTypeHeader[0]
        : incomingContentTypeHeader;

      const headers: Record<string, string> = {
        ...this.getForwardedHeaders(req),
      };

      let body: any;
      let isStreaming = false;

      if (['GET', 'HEAD'].includes(req.method)) {
        body = undefined;
      } else {
        if (incomingContentType) {
          headers['content-type'] = incomingContentType;
        }

        // For multipart uploads, stream directly without buffering the whole body in memory
        const isMultipart = incomingContentType?.includes('multipart/');
        // Same for raw octet-stream (большие куски от browser-driven multipart upload):
        // не буферизуем — просто проксируем поток в downstream.
        const isOctetStream =
          incomingContentType?.includes('application/octet-stream');
        if (isMultipart || isOctetStream) {
          isStreaming = true;
          body = req as any;
        } else {
          const rawBody = await this.getRawBody(req);
          body = rawBody.length > 0 ? rawBody : undefined;
        }
      }

      // Log headers for debugging without leaking secrets
      this.logger.debug(
        `Headers: ${JSON.stringify(this.sanitizeHeadersForLog(headers))}`,
      );

      const fetchOpts: any = {
        method: req.method,
        headers,
        body,
        redirect: 'manual',
      };

      // undici requires duplex: 'half' when streaming a request body
      if (isStreaming) {
        fetchOpts.duplex = 'half';
      }

      const response = await fetch(targetUrl, fetchOpts);

      const contentType = response.headers.get('content-type');

      // Forward Set-Cookie headers separately (fetch() merges them, breaking multiple cookies)
      const setCookieHeaders = response.headers.getSetCookie();
      if (setCookieHeaders.length > 0) {
        res.setHeader('set-cookie', setCookieHeaders);
      }

      // Forward other response headers
      response.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (!['content-encoding', 'transfer-encoding', 'connection', 'set-cookie'].includes(lower)) {
          res.setHeader(key, value);
        }
      });

      // Pass redirects (3xx) directly to the browser without following them
      if (response.status >= 300 && response.status < 400) {
        return res.status(response.status).end();
      }

      // Handle different content types — stream binary bodies to avoid buffering large files
      const isJson = contentType?.includes('application/json');
      if (isJson) {
        const data = await response.json();
        res.status(response.status).json(data);
      } else if (response.body) {
        res.status(response.status);
        // Node 18+ fetch body is a Web ReadableStream — convert and pipe
        // (cast to any to avoid DOM vs Node stream type mismatch)
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        await new Promise<void>((resolve, reject) => {
          nodeStream.on('end', resolve);
          nodeStream.on('error', reject);
          res.on('error', reject);
          res.on('close', resolve);
        });
      } else {
        res.status(response.status).end();
      }
    } catch (error) {
      this.logger.error(`Proxy error to ${serviceName}: ${error.message}`, error.stack);
      res.status(502).json({
        statusCode: 502,
        message: `Bad Gateway - ${serviceName} Service unavailable`,
        error: 'Bad Gateway',
      });
    }
  }

  private getRawBody(req: Request): Promise<Buffer> {
    // If NestJS rawBody is available (rawBody: true in main.ts), use it
    if ((req as any).rawBody) {
      return Promise.resolve((req as any).rawBody);
    }
    // Otherwise collect from stream
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  private getForwardedHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    // Forward important headers.
    // x-actor-* и x-workspace-id проставляются ActorAuthMiddleware на gateway
    // и являются trust-входом для доменных сервисов (WorkspaceContextMiddleware).
    const headersToForward = [
      'authorization',
      'x-actor-id',
      'x-actor-user-id',
      'x-actor-role',
      'x-workspace-id',
      // Метаданные multipart-загрузки в S3 (см. shared/src/s3).
      'x-multipart-key',
      'x-multipart-upload-id',
      'x-multipart-part-number',
      'cookie',
      'origin',
      'referer',
      'user-agent',
      'accept',
      'accept-language',
    ];

    headersToForward.forEach((header) => {
      const value = req.headers[header];
      if (value) {
        headers[header] = Array.isArray(value) ? value[0] : value;
      }
    });

    // Forward client IP
    const clientIp = req.ip || req.socket.remoteAddress;
    if (clientIp) {
      headers['x-forwarded-for'] = clientIp;
    }

    return headers;
  }
}
