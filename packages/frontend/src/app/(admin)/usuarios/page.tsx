'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
  Chip,
  TextField,
  MenuItem,
  Grid,
  InputAdornment,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';

export default function UsuariosPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [inputSearchTerm, setInputSearchTerm] = useState<string>('');
  const debouncedSearchTerm = useDebounce(inputSearchTerm, 300);

  const {
    usuarios = [],
    isLoading = false,
    error = null,
    refetch,
    deletarUsuario,
    reativarUsuario,
  } = useUsuarios() || { usuarios: [], isLoading: true };

  const { usuario: usuarioLogado } = useAuth();

  const filteredUsuarios = useMemo(() => {
    let result = usuarios;

    if (statusFilter) {
      result = result.filter((u) => u.status === statusFilter);
    }

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.nome.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term),
      );
    }

    return result;
  }, [usuarios, statusFilter, debouncedSearchTerm]);

  const handleDesativar = (id: number, nome: string) => {
    if (id === usuarioLogado?.id) {
      window.alert('Você não pode desativar sua própria conta.');
      return;
    }
    if (window.confirm(`Deseja desativar o usuário "${nome}"?`)) {
      deletarUsuario(id);
    }
  };

  const handleReativar = (id: number, nome: string) => {
    if (window.confirm(`Deseja reativar o usuário "${nome}"?`)) {
      reativarUsuario(id);
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Usuários">
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}
        >
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Usuários">
        <ErrorState message={`Erro ao carregar usuários: ${error}`} retryAction={refetch} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Usuários"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            component={Link}
            href="/usuarios/papeis"
            variant="outlined"
            startIcon={<ShieldIcon />}
            size="small"
          >
            Papéis e Permissões
          </Button>
          <Button component={Link} href="/usuarios/novo" variant="contained" startIcon={<AddIcon />}>
            Novo Usuário
          </Button>
        </Box>
      }
    >
      {/* Filtros */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Buscar usuário"
              variant="outlined"
              fullWidth
              value={inputSearchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInputSearchTerm(e.target.value)
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="Nome ou email"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Status"
              variant="outlined"
              fullWidth
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStatusFilter(e.target.value)
              }
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ativo">Ativos</MenuItem>
              <MenuItem value="inativo">Inativos</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      <TableContainer>
        {filteredUsuarios.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            message="Não há usuários registrados com os filtros atuais. Você pode adicionar um novo usuário usando o botão 'Novo Usuário'."
            icon={<PeopleIcon fontSize="large" />}
            sx={{ py: 6 }}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Papel</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{usuario.nome}</Typography>
                      {usuario.id === usuarioLogado?.id && (
                        <Chip label="você" size="small" variant="outlined" color="primary" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{usuario.papel?.nome || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color={usuario.cliente ? 'text.primary' : 'text.secondary'}>
                      {usuario.cliente?.nome_fantasia || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={usuario.status}
                      color={usuario.status === 'ativo' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton
                        component={Link}
                        href={`/usuarios/${usuario.id}/editar`}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {usuario.status === 'ativo' ? (
                      <Tooltip
                        title={
                          usuario.id === usuarioLogado?.id
                            ? 'Não é possível desativar a si mesmo'
                            : 'Desativar'
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleDesativar(usuario.id, usuario.nome)}
                            disabled={usuario.id === usuarioLogado?.id}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Reativar">
                        <IconButton
                          size="small"
                          onClick={() => handleReativar(usuario.id, usuario.nome)}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </PageContainer>
  );
}
