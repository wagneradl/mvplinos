'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PersonOff as DeactivateIcon,
  PersonAdd as ReactivateIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import useUsuarios, { usePapeis } from '@/hooks/useUsuarios';
import { Usuario, CreateUsuarioDto, UpdateUsuarioDto, Papel } from '@/types/usuario';

/* ─────────────────── Helpers ─────────────────── */

/** Retorna label amigável para o código do papel */
function papelLabel(papel?: Papel | null): string {
  if (!papel) return '—';
  if (papel.codigo === 'CLIENTE_ADMIN') return 'Administrador';
  if (papel.codigo === 'CLIENTE_USUARIO') return 'Usuário';
  return papel.nome;
}

/* ─────────────────── Skeleton de carregamento ─────────────────── */

function TableSkeleton() {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {['Nome', 'Email', 'Papel', 'Status', 'Ações'].map((h) => (
              <TableCell key={h}>
                <Typography variant="subtitle2" fontWeight={600}>{h}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              {[1, 2, 3, 4, 5].map((j) => (
                <TableCell key={j}><Skeleton variant="text" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/* ─────────────────── Dialog de Criação / Edição ─────────────────── */

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUsuarioDto | UpdateUsuarioDto) => void;
  papeis: Papel[];
  usuario?: Usuario | null;
  isEdit?: boolean;
}

function UsuarioFormDialog({ open, onClose, onSubmit, papeis, usuario, isEdit }: FormDialogProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [papelId, setPapelId] = useState<number | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form quando abre/fecha
  const handleEnter = () => {
    if (isEdit && usuario) {
      setNome(usuario.nome);
      setEmail(usuario.email);
      setSenha('');
      setPapelId(usuario.papel_id);
    } else {
      setNome('');
      setEmail('');
      setSenha('');
      setPapelId(papeis.length === 1 ? papeis[0].id : '');
    }
    setErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!email.trim()) {
      errs.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Email inválido';
    }
    if (!isEdit && !senha) {
      errs.senha = 'Senha é obrigatória';
    } else if (senha && senha.length < 6) {
      errs.senha = 'Mínimo 6 caracteres';
    }
    if (!papelId) errs.papelId = 'Papel é obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (isEdit) {
      const data: UpdateUsuarioDto = { nome: nome.trim(), email: email.trim() };
      if (senha) data.senha = senha;
      if (papelId && papelId !== usuario?.papel_id) data.papel_id = papelId as number;
      onSubmit(data);
    } else {
      onSubmit({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        papel_id: papelId as number,
      } as CreateUsuarioDto);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: handleEnter }}
    >
      <DialogTitle>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          error={!!errors.nome}
          helperText={errors.nome}
          required
          fullWidth
          size="small"
          autoFocus
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={!!errors.email}
          helperText={errors.email}
          required
          fullWidth
          size="small"
        />
        <TextField
          label={isEdit ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          error={!!errors.senha}
          helperText={errors.senha}
          required={!isEdit}
          fullWidth
          size="small"
        />
        <TextField
          select
          label="Papel"
          value={papelId}
          onChange={(e) => setPapelId(Number(e.target.value))}
          error={!!errors.papelId}
          helperText={errors.papelId}
          required
          fullWidth
          size="small"
        >
          {papeis.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {papelLabel(p)}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {isEdit ? 'Salvar' : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─────────────────── Dialog de Confirmação ─────────────────── */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
  confirmColor?: 'error' | 'primary' | 'success';
}

function ConfirmDialog({ open, title, message, onConfirm, onClose, confirmLabel = 'Confirmar', confirmColor = 'error' }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─────────────────── Página Principal ─────────────────── */

export default function PortalUsuariosPage() {
  const { usuario: currentUser, hasPermission } = useAuth();
  const router = useRouter();

  // Acesso: apenas CLIENTE_ADMIN
  const isAdmin = currentUser?.papel?.codigo === 'CLIENTE_ADMIN';

  // Hooks de dados
  const { usuarios, isLoading, error, refetch, criarUsuario, atualizarUsuario, deletarUsuario, reativarUsuario } = useUsuarios();
  const { papeis } = usePapeis('CLIENTE');

  // Estado dos dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editUsuario, setEditUsuario] = useState<Usuario | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'reactivate';
    usuario: Usuario;
  } | null>(null);

  // Filtrar: papéis disponíveis para criação (nível menor que o do admin logado)
  const papeisDisponiveis = useMemo(() => {
    const callerNivel = currentUser?.papel?.nivel ?? 0;
    return papeis.filter((p) => p.tipo === 'CLIENTE' && p.nivel <= callerNivel);
  }, [papeis, currentUser]);

  // Redirecionar se não for admin
  if (!isAdmin) {
    if (typeof window !== 'undefined') {
      router.replace('/portal/dashboard');
    }
    return null;
  }

  /* ── Handlers ── */

  const handleCreate = (data: CreateUsuarioDto | UpdateUsuarioDto) => {
    criarUsuario(data as CreateUsuarioDto, {
      onSuccess: () => setCreateOpen(false),
    });
  };

  const handleEdit = (data: CreateUsuarioDto | UpdateUsuarioDto) => {
    if (!editUsuario) return;
    atualizarUsuario(
      { id: editUsuario.id, usuario: data as UpdateUsuarioDto },
      { onSuccess: () => setEditUsuario(null) },
    );
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'deactivate') {
      deletarUsuario(confirmAction.usuario.id, {
        onSuccess: () => setConfirmAction(null),
      });
    } else {
      reativarUsuario(confirmAction.usuario.id, {
        onSuccess: () => setConfirmAction(null),
      });
    }
  };

  /** Pode desativar? Não pode desativar a si mesmo ou outro CLIENTE_ADMIN */
  const canDeactivate = (u: Usuario): boolean => {
    if (u.id === currentUser?.id) return false;
    if (u.papel?.codigo === 'CLIENTE_ADMIN') return false;
    return true;
  };

  /* ── Render ── */

  const renderContent = () => {
    if (isLoading) return <TableSkeleton />;

    if (error) {
      return (
        <ErrorState
          message={error}
          retryAction={refetch}
        />
      );
    }

    if (usuarios.length === 0) {
      return (
        <EmptyState
          title="Nenhum usuário cadastrado"
          message="Convide sua equipe adicionando novos usuários."
          icon={<GroupIcon fontSize="large" />}
        />
      );
    }

    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><Typography variant="subtitle2" fontWeight={600}>Nome</Typography></TableCell>
              <TableCell><Typography variant="subtitle2" fontWeight={600}>Email</Typography></TableCell>
              <TableCell><Typography variant="subtitle2" fontWeight={600}>Papel</Typography></TableCell>
              <TableCell><Typography variant="subtitle2" fontWeight={600}>Status</Typography></TableCell>
              <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Ações</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const isActive = u.status === 'ativo';
              return (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {u.nome}
                      {isSelf && (
                        <Chip label="Você" size="small" variant="outlined" color="primary" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={papelLabel(u.papel as Papel)}
                      size="small"
                      color={u.papel?.codigo === 'CLIENTE_ADMIN' ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isActive ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={isActive ? 'success' : 'default'}
                      variant={isActive ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => setEditUsuario(u)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canDeactivate(u) && isActive && (
                      <Tooltip title="Desativar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setConfirmAction({ type: 'deactivate', usuario: u })}
                        >
                          <DeactivateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDeactivate(u) && !isActive && (
                      <Tooltip title="Reativar">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => setConfirmAction({ type: 'reactivate', usuario: u })}
                        >
                          <ReactivateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <PageContainer
      title="Minha Equipe"
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Novo Usuário
        </Button>
      }
    >
      {renderContent()}

      {/* Dialog de criação */}
      <UsuarioFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        papeis={papeisDisponiveis}
      />

      {/* Dialog de edição */}
      <UsuarioFormDialog
        open={!!editUsuario}
        onClose={() => setEditUsuario(null)}
        onSubmit={handleEdit}
        papeis={papeisDisponiveis}
        usuario={editUsuario}
        isEdit
      />

      {/* Dialog de confirmação (desativar/reativar) */}
      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          title={confirmAction.type === 'deactivate' ? 'Desativar Usuário' : 'Reativar Usuário'}
          message={
            confirmAction.type === 'deactivate'
              ? `Tem certeza que deseja desativar ${confirmAction.usuario.nome}? O usuário não poderá mais acessar o sistema.`
              : `Deseja reativar ${confirmAction.usuario.nome}? O usuário voltará a ter acesso ao sistema.`
          }
          confirmLabel={confirmAction.type === 'deactivate' ? 'Desativar' : 'Reativar'}
          confirmColor={confirmAction.type === 'deactivate' ? 'error' : 'success'}
          onConfirm={handleConfirmAction}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </PageContainer>
  );
}
