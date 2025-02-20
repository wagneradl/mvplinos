import { ExecutionContext, CallHandler } from '@nestjs/common';
import { TransformInterceptor } from '../transform.interceptor';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockContext = {} as ExecutionContext;
  });

  it('should transform paginated response', (done) => {
    const mockData = {
      data: [{ id: 1 }, { id: 2 }],
      meta: {
        total: 10,
        page: 1,
        limit: 2,
      },
    };

    mockCallHandler = {
      handle: () => of(mockData),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toEqual({
          items: mockData.data,
          meta: {
            total: 10,
            page: 1,
            limit: 2,
            totalPages: 5,
          },
        });
      },
      complete: () => done(),
    });
  });

  it('should transform array response', (done) => {
    const mockData = [{ id: 1 }, { id: 2 }];

    mockCallHandler = {
      handle: () => of(mockData),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toEqual({
          items: mockData,
          meta: {
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        });
      },
      complete: () => done(),
    });
  });

  it('should return single object as is', (done) => {
    const mockData = { id: 1, name: 'Test' };

    mockCallHandler = {
      handle: () => of(mockData),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toEqual(mockData);
      },
      complete: () => done(),
    });
  });

  it('should transform non-object response', (done) => {
    const mockData = 'test';

    mockCallHandler = {
      handle: () => of(mockData),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toEqual({
          items: [mockData],
          meta: {
            total: 1,
            page: 1,
            limit: 1,
            totalPages: 1,
          },
        });
      },
      complete: () => done(),
    });
  });

  it('should handle paginated response without page and limit', (done) => {
    const mockData = {
      data: [{ id: 1 }, { id: 2 }],
      meta: {
        total: 10,
      },
    };

    mockCallHandler = {
      handle: () => of(mockData),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toEqual({
          items: mockData.data,
          meta: {
            total: 10,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        });
      },
      complete: () => done(),
    });
  });
});
