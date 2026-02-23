'use client';

import { useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { ErrorState } from '@/components/ErrorState';
import { usePapeis } from '@/hooks/useUsuarios';
import { Papel } from '@/types/usuario';
import Link from 'next/link';

// Labels legíveis para recursos
const RECURSO_LABELS: Record<string, string> = {
  usuarios: 'Usuários',
  papeis: 'Papéis',
  clientes: 'Clientes',
  produtos: 'Produtos',
  pedidos: 'Pedidos',
  relatorios: 'Relatórios',
  financeiro: 'Financeiro',
  sistema: 'Sistema',
};

// Labels legíveis para ações
const ACAO_LABELS: Record<string, string> = {
  listar: 'Listar',
  ver: 'Ver',
  criar: 'Criar',
  editar: 'Editar',
  desativar: 'Desativar',
  deletar: 'Deletar',
  cancelar: 'Cancelar',
  exportar: 'Exportar',
  resetar_senha: 'Resetar Senha',
  backup: 'Backup',
  restore: 'Restaurar',
};

// Ordem de exibição dos recursos
const RECURSO_ORDER = [
  'usuarios',
  'papeis',
  'clientes',
  'produtos',
  'pedidos',
  'relatorios',
  'financeiro',
  'sistema',
];

function parsePermissoes(permissoes: string | Record<string, string[]>): Record<string, string[]> {
  if (typeof permissoes === 'string') {
    try {
      return JSON.parse(permissoes);
    } catch {
      return {};
    }
  }
  return permissoes || {};
}

function PapelCard({ papel }: { papel: Papel }) {
  const permissoes = useMemo(() => parsePermissoes(papel.permissoes), [papel.permissoes]);

  const sortedRecursos = useMemo(() => {
    return Object.keys(permissoes).sort(
      (a, b) => RECURSO_ORDER.indexOf(a) - RECURSO_ORDER.indexOf(b),
    );
  }, [permissoes]);

  const totalPermissoes = useMemo(() => {
    return Object.values(permissoes).reduce((acc, acoes) => acc + acoes.length, 0);
  }, [permissoes]);

  return (
    <Accordion defaultExpanded={false} sx={{ '&:before': { display: 'none' } }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5, flexWrap: 'wrap' } }}
      >
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mr: 1 }}>
          {papel.nome}
        </Typography>
        <Chip
          label={papel.tipo}
          size="small"
          color={papel.tipo === 'INTERNO' ? 'primary' : 'success'}
          variant="outlined"
        />
        <Chip
          label={`Nível ${papel.nivel}`}
          size="small"
          variant="outlined"
          sx={{ color: 'text.secondary', borderColor: 'divider' }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', mr: 1 }}>
          {totalPermissoes} permissões
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {papel.descricao}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Código: <strong>{papel.codigo}</strong>
          </Typography>
        </Box>

        {sortedRecursos.length === 0 ? (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            Nenhuma permissão configurada.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {sortedRecursos.map((recurso) => (
              <Box key={recurso}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                  {RECURSO_LABELS[recurso] || recurso}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {permissoes[recurso].map((acao) => (
                    <Chip
                      key={acao}
                      label={ACAO_LABELS[acao] || acao}
                      size="small"
                      icon={<CheckIcon sx={{ fontSize: 14 }} />}
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function PapeisPage() {
  const { papeis, isLoading, error } = usePapeis();

  const { papeisInternos, papeisCliente } = useMemo(() => {
    const internos = papeis
      .filter((p) => p.tipo === 'INTERNO')
      .sort((a, b) => b.nivel - a.nivel);
    const cliente = papeis
      .filter((p) => p.tipo === 'CLIENTE')
      .sort((a, b) => b.nivel - a.nivel);
    return { papeisInternos: internos, papeisCliente: cliente };
  }, [papeis]);

  if (isLoading) {
    return (
      <PageContainer title="Papéis e Permissões">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Papéis e Permissões">
        <ErrorState
          message={`Erro ao carregar papéis: ${error}`}
          retryAction={() => window.location.reload()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Papéis e Permissões"
      actions={
        <Button
          component={Link}
          href="/usuarios"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          size="small"
        >
          Voltar para Usuários
        </Button>
      }
    >
      {/* Seção: Papéis Internos */}
      {papeisInternos.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography variant="h6" fontWeight="bold">
              Internos
            </Typography>
            <Chip label={`${papeisInternos.length}`} size="small" color="primary" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Papéis para colaboradores da padaria.
          </Typography>
          {papeisInternos.map((papel) => (
            <PapelCard key={papel.id} papel={papel} />
          ))}
        </Box>
      )}

      {/* Seção: Papéis de Cliente */}
      {papeisCliente.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography variant="h6" fontWeight="bold">
              Clientes
            </Typography>
            <Chip label={`${papeisCliente.length}`} size="small" color="success" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Papéis para usuários de empresas clientes (B2B).
          </Typography>
          {papeisCliente.map((papel) => (
            <PapelCard key={papel.id} papel={papel} />
          ))}
        </Box>
      )}
    </PageContainer>
  );
}
