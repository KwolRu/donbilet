import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type Response } from 'express';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse() as Response;

    let status = 500;
    let msg: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        msg = (exceptionResponse as { message?: string | string[] }).message ?? msg;
      } else {
        msg = exceptionResponse as string;
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2002'
    ) {
      status = 409;
      msg = 'Запись с такими данными уже существует';
    } else if (exception instanceof Error) {
      this.logger.error(`Exception: ${exception.message}`, exception.stack);
      msg = exception.message;
    } else {
      this.logger.error(`Unknown exception: ${JSON.stringify(exception)}`);
    }

    const message: string[] = Array.isArray(msg) ? [...msg] : [msg];
    const responseBody = { status, message, error: true };

    this.logger.error(
      JSON.stringify(responseBody),
      exception instanceof Error ? exception.stack : '',
    );
    response.status(status).json(responseBody);
  }
}
