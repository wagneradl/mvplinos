export interface Papel {
  id: number;
  nome: string;
  codigo: string;
  descricao: string;
  tipo: string;
  nivel: number;
  permissoes: string | Record<string, string[]>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsuarioCliente {
  id: number;
  nome_fantasia: string;
  razao_social: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel_id: number;
  cliente_id?: number;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  papel?: Papel;
  cliente?: UsuarioCliente;
}

export interface CreateUsuarioDto {
  nome: string;
  email: string;
  senha: string;
  papel_id: number;
  cliente_id?: number;
}

export interface UpdateUsuarioDto {
  nome?: string;
  email?: string;
  senha?: string;
  papel_id?: number;
  cliente_id?: number | null;
  status?: string;
}
