import { CodigoPapel, TipoPapel } from '../roles.constants';

export interface UsuarioAutenticado {
  id: number;
  email: string;
  nome: string;
  clienteId: number | null;
  papel: {
    id: number;
    nome: string;
    codigo: CodigoPapel;
    tipo: TipoPapel;
    nivel: number;
    permissoes: Record<string, string[]>;
  };
}
