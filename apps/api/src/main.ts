import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { readConfig } from './config/env';

type RequestWithId = { requestId?: string };
type JsonResponse = {
  status(code: number): JsonResponse;
  json(value: unknown): void;
};

@Catch()
class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<JsonResponse>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const provided =
      exception instanceof HttpException ? exception.getResponse() : null;
    const explicit =
      typeof provided === 'object' &&
      provided !== null &&
      'code' in provided &&
      'message' in provided
        ? provided
        : null;
    const code =
      explicit && typeof explicit.code === 'string'
        ? explicit.code
        : status === HttpStatus.SERVICE_UNAVAILABLE
          ? 'SERVICE_UNAVAILABLE'
          : status === HttpStatus.NOT_FOUND
            ? 'NOT_FOUND'
            : status === HttpStatus.BAD_REQUEST
              ? 'VALIDATION_ERROR'
              : status === HttpStatus.PAYLOAD_TOO_LARGE
                ? 'PAYLOAD_TOO_LARGE'
                : 'INTERNAL_ERROR';
    const message =
      explicit && typeof explicit.message === 'string'
        ? explicit.message
        : status === HttpStatus.SERVICE_UNAVAILABLE
          ? 'Service unavailable'
          : status === HttpStatus.NOT_FOUND
            ? 'Resource not found'
            : status === HttpStatus.BAD_REQUEST
              ? 'Invalid request'
              : 'Request failed';

    response.status(status).json({
      error: { code, message, requestId: request.requestId },
    });
  }
}

async function bootstrap(): Promise<void> {
  const { port } = readConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: 256 * 1024 });
  app.useBodyParser('urlencoded', { extended: true, limit: 256 * 1024 });
  app.use(cookieParser());
  app.setGlobalPrefix('v1');
  app.use(
    (
      request: RequestWithId,
      response: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      request.requestId = randomUUID();
      response.setHeader('X-Request-Id', request.requestId);
      next();
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(port, '127.0.0.1');
}

void bootstrap();
