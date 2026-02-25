'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { ErrorState } from '@/components/ErrorState';
import { ClientesService } from '@/services/clientes.service';
import Link from 'next/link';

type StatusInfo = { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' };

const STATUS_MAP: Record<string, StatusInfo> = {
  ativo: { label: 'Ativo', color: 'success' },
  pendente_aprovacao: { label: 'Pendente de Aprovação', color: 'warning' },
  rejeitado: { label: 'Rejeitado', color: 'error' },
  suspenso: { label: 'Suspenso', color: 'default' },
  inativo: { label: 'Inativo', color: 'default' },
};

function getStatusInfo(status: string): StatusInfo {
  return STATUS_MAP[status] || { label: status, color: 'default' };
}

function formatCNPJ(cnpj: string) {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

function formatTelefone(telefone: string) {
  const digits = telefone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return telefone;
}

export default function ClienteDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const clienteId = Number(params?.id);
  const { enqueueSnackbar } = useSnackbar();

  const [aprovarDialog, setAprovarDialog] = useState(false);
  const [rejeitarDialog, setRejeitarDialog] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [isAprovando, setIsAprovando] = useState(false);
  const [isRejeitando, setIsRejeitando] = useState(false);

  const { data: cliente, isLoading, error, refetch } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClientesService.obterCliente(clienteId),
    enabled: !!clienteId,
  });

  const handleAprovar = async () => {
    setIsAprovando(true);
    try {
      await ClientesService.aprovarCliente(clienteId);
      enqueueSnackbar('Cliente aprovado com sucesso!', { variant: 'success' });
      setAprovarDialog(false);
      await refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao aprovar cliente';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setIsAprovando(false);
    }
  };

  const handleRejeitar = async () => {
    setIsRejeitando(true);
    try {
      await ClientesService.rejeitarCliente(clienteId, motivoRejeicao.trim() || undefined);
      enqueueSnackbar('Cliente rejeitado.', { variant: 'info' });
      setRejeitarDialog(false);
      router.push('/clientes');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao rejeitar cliente';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setIsRejeitando(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Detalhes do Cliente">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Detalhes do Cliente">
        <ErrorState
          title="Erro ao carregar cliente"
          message={`Não foi possível carregar os detalhes do cliente: ${error}`}
          retryAction={refetch}
        />
      </PageContainer>
    );
  }

  if (!cliente) {
    return (
      <PageContainer title="Detalhes do Cliente">
        <ErrorState
          title="Cliente não encontrado"
          message="O cliente solicitado não foi encontrado ou foi removido."
        />
      </PageContainer>
    );
  }

  const statusInfo = getStatusInfo(cliente.status);
  const isPendente = cliente.status === 'pendente_aprovacao';

  return (
    <PageContainer title="Detalhes do Cliente">
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/clientes')}>
              Voltar
            </Button>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
              {cliente.nome_fantasia || cliente.razao_social}
            </Typography>
            <Chip
              label={statusInfo.label}
              color={statusInfo.color}
              variant={isPendente ? 'filled' : 'outlined'}
            />
          </Box>

          {/* Client info card */}
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações da Empresa
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Razão Social
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {cliente.razao_social}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Nome Fantasia
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {cliente.nome_fantasia}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    CNPJ
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formatCNPJ(cliente.cnpj)}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Telefone
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formatTelefone(cliente.telefone)}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {cliente.email}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                      variant={isPendente ? 'filled' : 'outlined'}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {isPendente && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  onClick={() => setAprovarDialog(true)}
                >
                  Aprovar Cliente
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CloseIcon />}
                  onClick={() => {
                    setMotivoRejeicao('');
                    setRejeitarDialog(true);
                  }}
                >
                  Rejeitar Cliente
                </Button>
              </>
            )}
            {cliente.status === 'ativo' && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                component={Link}
                href={`/clientes/${clienteId}/editar`}
              >
                Editar
              </Button>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Dialog: Aprovar */}
      <Dialog open={aprovarDialog} onClose={() => setAprovarDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Aprovar Cliente</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Aprovar <strong>{cliente.razao_social}</strong>? O responsável será notificado
            por email e poderá acessar o portal.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAprovarDialog(false)} disabled={isAprovando}>
            Cancelar
          </Button>
          <Button
            onClick={handleAprovar}
            variant="contained"
            color="success"
            disabled={isAprovando}
            startIcon={isAprovando ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
          >
            Confirmar Aprovação
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Rejeitar */}
      <Dialog open={rejeitarDialog} onClose={() => setRejeitarDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rejeitar Cadastro</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Rejeitar cadastro de <strong>{cliente.razao_social}</strong>?
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
          <Button onClick={() => setRejeitarDialog(false)} disabled={isRejeitando}>
            Cancelar
          </Button>
          <Button
            onClick={handleRejeitar}
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
