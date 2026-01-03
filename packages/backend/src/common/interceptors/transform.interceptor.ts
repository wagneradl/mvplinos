import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Se for uma resposta paginada
        if (data?.data && data?.meta) {
          return {
            items: data.data,
            meta: {
              total: data.meta.total,
              page: data.meta.page || 1,
              limit: data.meta.limit || 10,
              totalPages: Math.ceil(data.meta.total / (data.meta.limit || 10)),
            },
          };
        }

        // Se for um array
        if (Array.isArray(data)) {
          return {
            items: data,
            meta: {
              total: data.length,
              page: 1,
              limit: 10,
              totalPages: 1,
            },
          };
        }

        // Se for um objeto único (ex: criar/atualizar)
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return data;
        }

        // Fallback para outros casos
        return {
          items: [data],
          meta: {
            total: 1,
            page: 1,
            limit: 1,
            totalPages: 1,
          },
        };
      }),
    );
  }
}
