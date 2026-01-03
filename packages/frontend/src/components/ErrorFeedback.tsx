'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertTitle, Collapse, Box, Typography, Paper } from '@mui/material';

export interface ErrorFeedbackProps {
  /**
   * A mensagem de erro principal
   */
  message: string | null;

  /**
   * Detalhes técnicos (opcional, mostrado expandido)
   */
  details?: string | null;

  /**
   * Título do alerta (opcional)
   */
  title?: string;

  /**
   * Dicas ou sugestões para resolver o problema (opcional)
   */
  suggestions?: string[];

  /**
   * Severidade do erro (default: 'error')
   */
  severity?: 'error' | 'warning' | 'info';

  /**
   * Função de callback para fechar o alerta (opcional)
   */
  onClose?: () => void;

  /**
   * Se deve mostrar detalhes técnicos ao usuário (default: false)
   */
  showTechnicalDetails?: boolean;

  /**
   * Se deve mostrar o alerta (para controle externo)
   */
  open?: boolean;
}

export function ErrorFeedback({
  message,
  details,
  title,
  suggestions = [],
  severity = 'error',
  onClose,
  showTechnicalDetails = false,
  open: controlledOpen,
}: ErrorFeedbackProps) {
  // Estado interno ou controlado externamente
  const [isOpen, setIsOpen] = useState(!!message);

  // Se passou uma prop 'open', usa ela para controlar o estado
  const open = controlledOpen !== undefined ? controlledOpen : isOpen;

  // Atualiza o estado interno quando a mensagem mudar
  useEffect(() => {
    if (controlledOpen === undefined) {
      setIsOpen(!!message);
    }
  }, [message, controlledOpen]);

  // Se não tiver mensagem, não mostra nada
  if (!message) return null;

  // Função para fechar o alerta
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
  };

  return (
    <Collapse in={open}>
      <Alert severity={severity} onClose={handleClose} sx={{ mb: 2 }}>
        {title && <AlertTitle>{title}</AlertTitle>}

        <Typography variant="body1">{message}</Typography>

        {/* Detalhes técnicos (se disponíveis e configurados para mostrar) */}
        {details && showTechnicalDetails && (
          <Paper
            variant="outlined"
            sx={{
              mt: 1,
              p: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              maxHeight: '100px',
              overflow: 'auto',
            }}
          >
            <Typography variant="caption" component="pre" sx={{ m: 0 }}>
              {details}
            </Typography>
          </Paper>
        )}

        {/* Sugestões para resolver o problema */}
        {suggestions.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2">Sugestões:</Typography>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <Typography variant="body2">{suggestion}</Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}
      </Alert>
    </Collapse>
  );
}

// Adicionar exportação default para compatibilidade
export default ErrorFeedback;
