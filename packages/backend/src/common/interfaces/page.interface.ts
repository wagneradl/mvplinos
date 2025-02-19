import { PageMeta } from './page-meta.interface';

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}
