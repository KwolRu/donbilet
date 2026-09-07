import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { type Request, type Response } from 'express';
import { ProxyService } from './proxy.service';

/**
 * Единый catch-all контроллер gateway.
 *
 * Маршрут в сервис не описывается методом-обёрткой на каждый префикс — цель
 * резолвится из `PROXY_ROUTES` (см. proxy.routes.ts). Чтобы подключить новый
 * сервис, правьте только карту маршрутов.
 */
@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('health')
  health(@Res() res: Response) {
    res.json({ status: 'ok', service: 'gateway' });
  }

  @All('*')
  proxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res);
  }
}
