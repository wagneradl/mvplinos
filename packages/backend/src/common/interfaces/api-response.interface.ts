export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
  message?: string;
}

export interface ApiErrorResponse {
  message: string;
  error: string;
  statusCode: number;
}