import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  items: T[];
  meta: {
    itemCount: number;
    pageSize: number;
    page: number;
    totalPages: number;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => {
        // Se for uma resposta paginada
        if (data?.data && data?.meta) {
          return {
            items: data.data,
            meta: {
              itemCount: data.meta.itemCount || data.meta.total,
              pageSize: data.meta.limit || 10,
              page: data.meta.page || 1,
              totalPages: data.meta.pageCount || Math.ceil(data.meta.total / (data.meta.limit || 10)),
            },
          };
        }

        // Se for um array
        if (Array.isArray(data)) {
          return {
            items: data,
            meta: {
              itemCount: data.length,
              pageSize: 10,
              page: 1,
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
            itemCount: 1,
            pageSize: 1,
            page: 1,
            totalPages: 1,
          },
        };
      }),
    );
  }
}