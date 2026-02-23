'use client';

// Força renderização no lado do cliente, evitando SSG/SSR
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
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
  TablePagination,
  Tooltip,
  CircularProgress,
  Chip,
  TextField,
  MenuItem,
  Grid,
  InputAdornment,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { useClientes } from '@/hooks/useClientes';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useDebounce } from '@/hooks/useDebounce';

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatTelefone(telefone: string) {
  if (telefone.length === 11) {
    return telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  return telefone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
}

// ── Helpers de status ─────────────────────────────────────────────────
type StatusInfo = { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' };

const STATUS_MAP: Record<string, StatusInfo> = {
  ativo: { label: 'Ativo', color: 'success' },
  pendente_aprovacao: { label: 'Pendente', color: 'warning' },
  rejeitado: { label: 'Rejeitado', color: 'error' },
  suspenso: { label: 'Suspenso', color: 'default' },
  inativo: { label: 'Inativo', color: 'default' },
};

function getStatusInfo(status: string): StatusInfo {
  return STATUS_MAP[status] || { label: status, color: 'default' };
}

export default function ClientesPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inputSearchTerm, setInputSearchTerm] = useState<string>('');

  // Dialog states
  const [aprovarDialog, setAprovarDialog] = useState<{ open: boolean; clienteId: number; razaoSocial: string }>({
    open: false,
    clienteId: 0,
    razaoSocial: '',
  });
  const [rejeitarDialog, setRejeitarDialog] = useState<{ open: boolean; clienteId: number; razaoSocial: string }>({
    open: false,
    clienteId: 0,
    razaoSocial: '',
  });
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  // Aplicar debounce ao termo de busca
  const debouncedSearchTerm = useDebounce(inputSearchTerm, 500);

  // Atualizar searchTerm quando o valor debounced mudar
  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // Adiciona valores padrão seguros para evitar erros de referência
  const {
    clientes = [],
    meta = {
      page: 1,
      limit: 10,
      itemCount: 0,
      pageCount: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    isLoading = false,
    error = null,
    refetch,
    deletarCliente,
    reativarCliente,
    aprovarCliente,
    rejeitarCliente,
    isAprovando,
    isRejeitando,
  } = useClientes(page + 1, rowsPerPage, statusFilter, searchTerm) || {
    clientes: [],
    meta: {
      page: 1,
      limit: 10,
      itemCount: 0,
      pageCount: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    isLoading: true,
  };

  // Contar pendentes na lista visível (funciona quando não há filtro de status)
  const pendentesCount = useMemo(
    () => clientes.filter((c) => c.status === 'pendente_aprovacao').length,
    [clientes]
  );

  // Mostrar banner de pendentes quando filtro é "Todos" ou vazio
  const mostrarBannerPendentes = !statusFilter && pendentesCount > 0;

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja inativar este cliente?')) {
      deletarCliente(id);
    }
  };

  const handleReativar = (id: number) => {
    if (window.confirm('Tem certeza que deseja reativar este cliente?')) {
      reativarCliente(id);
    }
  };

  // ── Aprovar ─────────────────────────────────────────────────────────
  const handleOpenAprovar = (clienteId: number, razaoSocial: string) => {
    setAprovarDialog({ open: true, clienteId, razaoSocial });
  };

  const handleCloseAprovar = () => {
    setAprovarDialog({ open: false, clienteId: 0, razaoSocial: '' });
  };

  const handleConfirmarAprovacao = () => {
    aprovarCliente(aprovarDialog.clienteId);
    handleCloseAprovar();
  };

  // ── Rejeitar ────────────────────────────────────────────────────────
  const handleOpenRejeitar = (clienteId: number, razaoSocial: string) => {
    setRejeitarDialog({ open: true, clienteId, razaoSocial });
    setMotivoRejeicao('');
  };

  const handleCloseRejeitar = () => {
    setRejeitarDialog({ open: false, clienteId: 0, razaoSocial: '' });
    setMotivoRejeicao('');
  };

  const handleConfirmarRejeicao = () => {
    rejeitarCliente({
      id: rejeitarDialog.clienteId,
      motivo: motivoRejeicao.trim() || undefined,
    });
    handleCloseRejeitar();
  };

  // ── Atalho para filtrar pendentes via banner ────────────────────────
  const handleFiltrarPendentes = () => {
    setStatusFilter('pendente_aprovacao');
    setPage(0);
  };

  // Renderização segura - verifica se os dados estão disponíveis
  if (isLoading) {
    return (
      <PageContainer title="Clientes">
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}
        >
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  // Tratamento de erro
  if (error) {
    return (
      <PageContainer title="Clientes">
        <ErrorState message={`Erro ao carregar clientes: ${error}`} retryAction={refetch} />
      </PageContainer>
    );
  }

  // Verificação adicional de segurança
  if (!clientes) {
    return (
      <PageContainer title="Clientes">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Carregando dados...
          </Typography>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Clientes"
      actions={
        <Button component={Link} href="/clientes/novo" variant="contained" startIcon={<AddIcon />}>
          Novo Cliente
        </Button>
      }
    >
      {/* Banner de clientes pendentes */}
      {mostrarBannerPendentes && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 2 }}
          action={
            <Button color="warning" size="small" onClick={handleFiltrarPendentes}>
              Ver pendentes
            </Button>
          }
        >
          <strong>{pendentesCount}</strong> empresa{pendentesCount > 1 ? 's' : ''} aguardando
          aprova&ccedil;&atilde;o
        </Alert>
      )}

      {/* Filtros */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Buscar cliente"
              variant="outlined"
              fullWidth
              value={inputSearchTerm}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setInputSearchTerm(event.target.value)
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="CNPJ, Razão Social ou Nome Fantasia"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Status"
              variant="outlined"
              fullWidth
              value={statusFilter}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pendente_aprovacao">Pendentes</MenuItem>
              <MenuItem value="ativo">Ativos</MenuItem>
              <MenuItem value="rejeitado">Rejeitados</MenuItem>
              <MenuItem value="suspenso">Suspensos</MenuItem>
              <MenuItem value="inativo">Inativos</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      <TableContainer>
        {clientes.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            message="Não há clientes registrados com os filtros atuais. Você pode adicionar um novo cliente usando o botão 'Novo Cliente'."
            icon={<PeopleIcon fontSize="large" />}
            sx={{ py: 6 }}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>CNPJ</TableCell>
                <TableCell>Razão Social</TableCell>
                <TableCell>Nome Fantasia</TableCell>
                <TableCell>Contato</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientes.map((cliente) => {
                const statusInfo = getStatusInfo(cliente.status);
                const isPendente = cliente.status === 'pendente_aprovacao';

                return (
                  <TableRow
                    key={cliente.id}
                    sx={isPendente ? { bgcolor: 'warning.light', '& td': { bgcolor: 'transparent' } } : undefined}
                  >
                    <TableCell>{formatCNPJ(cliente.cnpj)}</TableCell>
                    <TableCell>{cliente.razao_social}</TableCell>
                    <TableCell>{cliente.nome_fantasia}</TableCell>
                    <TableCell>
                      <Box>
                        <div>{formatTelefone(cliente.telefone)}</div>
                        <div style={{ color: 'gray', fontSize: '0.875rem' }}>{cliente.email}</div>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        variant={isPendente ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {isPendente ? (
                        /* ── Ações para clientes pendentes ── */
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="Aprovar">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleOpenAprovar(cliente.id, cliente.razao_social)}
                              disabled={isAprovando}
                            >
                              {isAprovando ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <CheckIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Rejeitar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenRejeitar(cliente.id, cliente.razao_social)}
                              disabled={isRejeitando}
                            >
                              {isRejeitando ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <CloseIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        /* ── Ações normais ── */
                        <>
                          <Tooltip title="Editar">
                            <IconButton
                              component={Link}
                              href={`/clientes/${cliente.id}/editar`}
                              size="small"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {cliente.status === 'ativo' ? (
                            <Tooltip title="Inativar">
                              <IconButton size="small" onClick={() => handleDelete(cliente.id)}>
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : cliente.status === 'inativo' ? (
                            <Tooltip title="Reativar">
                              <IconButton size="small" onClick={() => handleReativar(cliente.id)}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <TablePagination
        component="div"
        count={meta?.itemCount || 0}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Itens por página"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : 'mais de ' + to}`
        }
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      {/* ── Dialog: Aprovar Cliente ───────────────────────────────────── */}
      <Dialog open={aprovarDialog.open} onClose={handleCloseAprovar} maxWidth="sm" fullWidth>
        <DialogTitle>Aprovar Cliente</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Aprovar <strong>{aprovarDialog.razaoSocial}</strong>? O responsável será notificado
            por email e poderá acessar o portal.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAprovar} disabled={isAprovando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarAprovacao}
            variant="contained"
            color="success"
            disabled={isAprovando}
            startIcon={isAprovando ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
          >
            Confirmar Aprovação
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Rejeitar Cliente ──────────────────────────────────── */}
      <Dialog open={rejeitarDialog.open} onClose={handleCloseRejeitar} maxWidth="sm" fullWidth>
        <DialogTitle>Rejeitar Cadastro</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Rejeitar cadastro de <strong>{rejeitarDialog.razaoSocial}</strong>?
          </DialogContentText>
          <TextField
            label="Motivo (opcional)"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={motivoRejeicao}
            onChange={(e) => setMotivoRejeicao(e.target.value)}
            placeholder="Informe o motivo da rejeição (será enviado por email ao solicitante)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejeitar} disabled={isRejeitando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarRejeicao}
            variant="contained"
            color="error"
            disabled={isRejeitando}
            startIcon={isRejeitando ? <CircularProgress size={18} color="inherit" /> : <CloseIcon />}
          >
            Confirmar Rejeição
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
