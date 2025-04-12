import { SetMetadata } from '@nestjs/common';

export const RequerPermissoes = (...permissoes: string[]) => SetMetadata('permissoes', permissoes);
