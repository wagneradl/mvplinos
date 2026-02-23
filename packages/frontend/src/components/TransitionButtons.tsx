'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  TRANSICOES_POR_TIPO,
  TRANSICAO_BOTAO,
  StatusPedido,
} from '@/constants/status-pedido';

interface TransitionButtonsProps {
  statusAtual: string;
  papelTipo: string; // 'INTERNO' | 'CLIENTE'
  onTransition: (novoStatus: string) => Promise<void>;
  loading?: boolean;
}

/**
 * Renderiza botões de ação baseados no status atual e papel do usuário.
 * Botões positivos com cores contextuais; Cancelar sempre em vermelho/outline.
 * Ações destrutivas (cancelar) pedem confirmação via dialog.
 */
export function TransitionButtons({
  statusAtual,
  papelTipo,
  onTransition,
  loading = false,
}: TransitionButtonsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Obter transições permitidas para este papel + status
  const mapa = TRANSICOES_POR_TIPO[papelTipo];
  if (!mapa) return null;

  const transicoes = mapa[statusAtual];
  if (!transicoes || transicoes.length === 0) return null;

  const handleTransition = async (novoStatus: string) => {
    // Se for cancelamento, pedir confirmação
    if (novoStatus === 'CANCELADO') {
      setConfirmOpen(true);
      return;
    }
    await executeTransition(novoStatus);
  };

  const executeTransition = async (novoStatus: string) => {
    setTransitioning(true);
    try {
      await onTransition(novoStatus);
    } finally {
      setTransitioning(false);
      setConfirmOpen(false);
    }
  };

  const isLoading = loading || transitioning;

  // Separar transições positivas das destrutivas (cancelar)
  const positivas = transicoes.filter((t) => t !== 'CANCELADO');
  const temCancelar = transicoes.includes('CANCELADO');

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {positivas.map((novoStatus) => {
          const config = TRANSICAO_BOTAO[novoStatus] || {
            label: novoStatus,
            color: 'primary' as const,
          };
          return (
            <Button
              key={novoStatus}
              variant="contained"
              color={config.color}
              onClick={() => handleTransition(novoStatus)}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
            >
              {config.label}
            </Button>
          );
        })}

        {temCancelar && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => handleTransition('CANCELADO')}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        )}
      </Box>

      {/* Dialog de confirmação para cancelamento */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar Cancelamento</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isLoading}>
            Não
          </Button>
          <Button
            onClick={() => executeTransition('CANCELADO')}
            color="error"
            disabled={isLoading}
            autoFocus
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sim, Cancelar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default TransitionButtons;
