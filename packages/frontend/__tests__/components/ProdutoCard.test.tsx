import React from 'react';
import { render, screen } from '../utils/test-utils';
import { ProdutoCard } from '../../src/components/ProdutoCard';
import { IProduto } from '@linos/shared';

describe('ProdutoCard', () => {
  const mockProduto: IProduto = {
    id: 1,
    nome: 'Pão Francês',
    preco_unitario: 0.5,
    tipo_medida: 'unidade',
    status: 'ativo'
  };

  it('renders produto information correctly', () => {
    render(<ProdutoCard produto={mockProduto} />);

    expect(screen.getByTestId('produto-nome')).toHaveTextContent('Pão Francês');
    expect(screen.getByTestId('produto-preco')).toHaveTextContent('R$ 0.50 / unidade');
    expect(screen.getByTestId('produto-status')).toHaveTextContent('Status: ativo');
  });

  it('formats price with two decimal places', () => {
    const produtoPrecoIrregular: IProduto = {
      ...mockProduto,
      preco_unitario: 0.999
    };

    render(<ProdutoCard produto={produtoPrecoIrregular} />);
    expect(screen.getByTestId('produto-preco')).toHaveTextContent('R$ 1.00');
  });
});