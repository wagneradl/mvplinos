import {
  TRANSICOES_VALIDAS,
  ESTADOS_PEDIDO,
  ESTADOS_FINAIS,
  transicaoValida,
  TRANSICOES_POR_TIPO,
  transicaoPermitidaPorPapel,
} from './transicoes-pedido';

describe('transicoes-pedido', () => {
  // =========================================================================
  // transicaoValida — função pura
  // =========================================================================

  describe('transicaoValida', () => {
    it('deve retornar true para transições permitidas', () => {
      expect(transicaoValida('RASCUNHO', 'PENDENTE')).toBe(true);
      expect(transicaoValida('RASCUNHO', 'CANCELADO')).toBe(true);
      expect(transicaoValida('PENDENTE', 'CONFIRMADO')).toBe(true);
      expect(transicaoValida('PENDENTE', 'CANCELADO')).toBe(true);
      expect(transicaoValida('CONFIRMADO', 'EM_PRODUCAO')).toBe(true);
      expect(transicaoValida('CONFIRMADO', 'CANCELADO')).toBe(true);
      expect(transicaoValida('EM_PRODUCAO', 'PRONTO')).toBe(true);
      expect(transicaoValida('EM_PRODUCAO', 'CANCELADO')).toBe(true);
      expect(transicaoValida('PRONTO', 'ENTREGUE')).toBe(true);
    });

    it('deve retornar false para transições inválidas', () => {
      expect(transicaoValida('RASCUNHO', 'CONFIRMADO')).toBe(false);
      expect(transicaoValida('RASCUNHO', 'ENTREGUE')).toBe(false);
      expect(transicaoValida('PENDENTE', 'PRONTO')).toBe(false);
      expect(transicaoValida('CONFIRMADO', 'ENTREGUE')).toBe(false);
      expect(transicaoValida('EM_PRODUCAO', 'PENDENTE')).toBe(false);
    });

    it('deve retornar false para transições a partir de estado final', () => {
      expect(transicaoValida('ENTREGUE', 'RASCUNHO')).toBe(false);
      expect(transicaoValida('ENTREGUE', 'PENDENTE')).toBe(false);
      expect(transicaoValida('ENTREGUE', 'CANCELADO')).toBe(false);
      expect(transicaoValida('CANCELADO', 'RASCUNHO')).toBe(false);
      expect(transicaoValida('CANCELADO', 'PENDENTE')).toBe(false);
    });

    it('deve retornar false para estado desconhecido', () => {
      expect(transicaoValida('INEXISTENTE', 'PENDENTE')).toBe(false);
      expect(transicaoValida('ATIVO', 'CANCELADO')).toBe(false);
    });
  });

  // =========================================================================
  // Constantes e integridade do mapa
  // =========================================================================

  describe('ESTADOS_FINAIS', () => {
    it('não devem ter transições de saída', () => {
      for (const estado of ESTADOS_FINAIS) {
        expect(TRANSICOES_VALIDAS[estado]).toEqual([]);
      }
    });

    it('deve conter ENTREGUE e CANCELADO', () => {
      expect(ESTADOS_FINAIS).toContain('ENTREGUE');
      expect(ESTADOS_FINAIS).toContain('CANCELADO');
    });
  });

  describe('ESTADOS_PEDIDO', () => {
    it('deve conter todos os 7 estados', () => {
      expect(ESTADOS_PEDIDO).toHaveLength(7);
      expect(ESTADOS_PEDIDO).toEqual(
        expect.arrayContaining([
          'RASCUNHO',
          'PENDENTE',
          'CONFIRMADO',
          'EM_PRODUCAO',
          'PRONTO',
          'ENTREGUE',
          'CANCELADO',
        ]),
      );
    });
  });

  describe('integridade do mapa', () => {
    it('todos os estados destino devem existir como chaves no mapa', () => {
      for (const [, destinos] of Object.entries(TRANSICOES_VALIDAS)) {
        for (const destino of destinos) {
          expect(ESTADOS_PEDIDO).toContain(destino);
        }
      }
    });

    it('CANCELADO deve ser acessível de RASCUNHO, PENDENTE, CONFIRMADO e EM_PRODUCAO', () => {
      expect(transicaoValida('RASCUNHO', 'CANCELADO')).toBe(true);
      expect(transicaoValida('PENDENTE', 'CANCELADO')).toBe(true);
      expect(transicaoValida('CONFIRMADO', 'CANCELADO')).toBe(true);
      expect(transicaoValida('EM_PRODUCAO', 'CANCELADO')).toBe(true);
    });

    it('PRONTO não pode ir para CANCELADO (só ENTREGUE)', () => {
      expect(transicaoValida('PRONTO', 'CANCELADO')).toBe(false);
      expect(transicaoValida('PRONTO', 'ENTREGUE')).toBe(true);
      expect(TRANSICOES_VALIDAS['PRONTO']).toEqual(['ENTREGUE']);
    });
  });

  // =========================================================================
  // Transições por papel (CLIENTE / INTERNO)
  // =========================================================================

  describe('TRANSICOES_POR_TIPO', () => {
    describe('CLIENTE', () => {
      it('pode RASCUNHO → PENDENTE', () => {
        expect(transicaoPermitidaPorPapel('CLIENTE', 'RASCUNHO', 'PENDENTE')).toBe(true);
      });

      it('pode RASCUNHO → CANCELADO', () => {
        expect(transicaoPermitidaPorPapel('CLIENTE', 'RASCUNHO', 'CANCELADO')).toBe(true);
      });

      it('pode PENDENTE → CANCELADO', () => {
        expect(transicaoPermitidaPorPapel('CLIENTE', 'PENDENTE', 'CANCELADO')).toBe(true);
      });

      it('NÃO pode PENDENTE → CONFIRMADO', () => {
        expect(transicaoPermitidaPorPapel('CLIENTE', 'PENDENTE', 'CONFIRMADO')).toBe(false);
      });

      it('NÃO pode CONFIRMADO → EM_PRODUCAO', () => {
        expect(transicaoPermitidaPorPapel('CLIENTE', 'CONFIRMADO', 'EM_PRODUCAO')).toBe(false);
      });
    });

    describe('INTERNO', () => {
      it('pode PENDENTE → CONFIRMADO', () => {
        expect(transicaoPermitidaPorPapel('INTERNO', 'PENDENTE', 'CONFIRMADO')).toBe(true);
      });

      it('pode CONFIRMADO → EM_PRODUCAO', () => {
        expect(transicaoPermitidaPorPapel('INTERNO', 'CONFIRMADO', 'EM_PRODUCAO')).toBe(true);
      });

      it('pode EM_PRODUCAO → PRONTO', () => {
        expect(transicaoPermitidaPorPapel('INTERNO', 'EM_PRODUCAO', 'PRONTO')).toBe(true);
      });

      it('pode PRONTO → ENTREGUE', () => {
        expect(transicaoPermitidaPorPapel('INTERNO', 'PRONTO', 'ENTREGUE')).toBe(true);
      });

      it('pode cancelar de PENDENTE, CONFIRMADO e EM_PRODUCAO', () => {
        expect(transicaoPermitidaPorPapel('INTERNO', 'PENDENTE', 'CANCELADO')).toBe(true);
        expect(transicaoPermitidaPorPapel('INTERNO', 'CONFIRMADO', 'CANCELADO')).toBe(true);
        expect(transicaoPermitidaPorPapel('INTERNO', 'EM_PRODUCAO', 'CANCELADO')).toBe(true);
      });

      it('NÃO pode RASCUNHO → PENDENTE (isso é do CLIENTE)', () => {
        expect(transicaoPermitidaPorPapel('INTERNO', 'RASCUNHO', 'PENDENTE')).toBe(false);
      });
    });

    it('deve retornar false para papel desconhecido', () => {
      expect(transicaoPermitidaPorPapel('VISITANTE', 'RASCUNHO', 'PENDENTE')).toBe(false);
    });
  });
});
