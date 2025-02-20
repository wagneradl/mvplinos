import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProdutoCard } from '../../src/components/ProdutoCard';
import { IProduto } from '@linos/shared';

describe('ProdutoCard', () => {
  const mockProduto: IProduto = {
    id: 1,
    nome: 'Pão Francês',
    preco_unitario: 0.5,
    tipo_medida: 'unidade',
    status: 'ativo',
    deleted_at: null
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders produto information correctly', () => {
    render(
      <ProdutoCard 
        produto={mockProduto}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('produto-nome')).toHaveTextContent('Pão Francês');
    expect(screen.getByTestId('produto-preco')).toHaveTextContent('R$ 0,50 / unidade');
    expect(screen.getByTestId('produto-status')).toHaveTextContent('Ativo');
    expect(screen.getByTestId('produto-status')).toHaveClass('status-ativo');
    expect(screen.getByTestId('edit-button')).toBeInTheDocument();
    expect(screen.getByTestId('delete-button')).toBeInTheDocument();
  });

  it('formats price with two decimal places and correct locale', () => {
    const produtoPrecoIrregular: IProduto = {
      ...mockProduto,
      preco_unitario: 1234.567
    };

    render(
      <ProdutoCard 
        produto={produtoPrecoIrregular}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId('produto-preco')).toHaveTextContent('R$ 1.234,57 / unidade');
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <ProdutoCard 
        produto={mockProduto}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByTestId('edit-button'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockProduto);
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked and confirmed', () => {
    render(
      <ProdutoCard 
        produto={mockProduto}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Abre o diálogo de confirmação
    fireEvent.click(screen.getByTestId('delete-button'));
    
    // Verifica se o diálogo está aberto com a mensagem correta
    expect(screen.getByText(`Tem certeza que deseja excluir o produto "${mockProduto.nome}"?`)).toBeInTheDocument();
    
    // Confirma a deleção
    fireEvent.click(screen.getByTestId('confirm-delete'));
    
    expect(mockOnDelete).toHaveBeenCalledWith(mockProduto.id);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('does not call onDelete when delete is cancelled', async () => {
    render(
      <ProdutoCard 
        produto={mockProduto}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Abre o diálogo de confirmação
    fireEvent.click(screen.getByTestId('delete-button'));
    
    // Verifica se o diálogo está aberto
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Cancela a deleção
    fireEvent.click(screen.getByTestId('cancel-delete'));
    
    // Aguarda o diálogo fechar
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('displays inactive status correctly', () => {
    const inativoProduto = {
      ...mockProduto,
      status: 'inativo'
    };

    render(
      <ProdutoCard 
        produto={inativoProduto}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('produto-status')).toHaveTextContent('Inativo');
    expect(screen.getByTestId('produto-status')).toHaveClass('status-inativo');
  });

  it('keeps delete dialog open when clicking outside', () => {
    render(
      <ProdutoCard 
        produto={mockProduto}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Abre o diálogo
    fireEvent.click(screen.getByTestId('delete-button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Simula clique fora do diálogo
    fireEvent.click(document.body);
    // O diálogo deve permanecer aberto
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('handles optional callbacks correctly', () => {
    render(
      <ProdutoCard 
        produto={mockProduto}
      />
    );

    // Verifica se os botões ainda estão presentes
    expect(screen.getByTestId('edit-button')).toBeInTheDocument();
    expect(screen.getByTestId('delete-button')).toBeInTheDocument();

    // Clica nos botões e verifica se não há erros
    fireEvent.click(screen.getByTestId('edit-button'));
    fireEvent.click(screen.getByTestId('delete-button'));
    fireEvent.click(screen.getByTestId('confirm-delete'));

    // Nenhum erro deve ser lançado
    expect(true).toBeTruthy();
  });
});