export interface UsuarioAutenticado {
  id: number;
  email: string;
  nome: string;
  papel: {
    id: number;
    nome: string;
    permissoes: Record<string, string[]>;
  };
}
