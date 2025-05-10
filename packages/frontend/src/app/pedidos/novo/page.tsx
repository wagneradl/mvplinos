'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useClientes } from '@/hooks/useClientes';
import { useProdutos } from '@/hooks/useProdutos';
import { usePedidos } from '@/hooks/usePedidos';
import { useSnackbar } from 'notistack';
import { Produto, ItemPedido } from '@/types/produto';

interface ItemPedidoForm extends Omit<ItemPedido, 'id' | 'pedido_id'> {
  produto?: Produto;
}

interface PedidoForm {
  cliente_id: number;
  itens: ItemPedidoForm[];
  observacoes?: string;
}

interface PedidoCopiado {
  cliente_id: number;
  itens: Array<{
    produto_id: number;
    quantidade: number;
    produto?: Produto;
  }>;
}

export default function NovoPedidoPage() {
  const router = useRouter();
  // Apenas clientes ativos para seleção no pedido
  const { clientes = [], isLoading: isLoadingClientes } = useClientes(1, 100, 'ativo');
  // Carregando produtos ativos (limite de 100 conforme permitido pela API)
  const { produtos = [], isLoading: isLoadingProdutos } = useProdutos(1, 100, 'ativo');
  const { criarPedido } = usePedidos({ disableNotifications: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pedidoCopiado, setPedidoCopiado] = useState<PedidoCopiado | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  
  console.log('Clientes recebidos na página de novo pedido:', clientes);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PedidoForm>({
    defaultValues: {
      cliente_id: 0,
      itens: [],
    },
  });

  const itens = watch('itens');
  
  // Efeito para carregar dados de pedido copiado ao montar o componente
  useEffect(() => {
    const carregarPedidoCopiado = () => {
      try {
        const dadosSalvos = localStorage.getItem('pedidoParaCopiar');
        if (dadosSalvos) {
          const dados = JSON.parse(dadosSalvos) as PedidoCopiado;
          setPedidoCopiado(dados);
          
          // Remover do localStorage para não usar novamente acidentalmente
          localStorage.removeItem('pedidoParaCopiar');
          
          console.log('Pedido copiado carregado:', dados);
          // Removendo notificação duplicada - já exibida na tela anterior
          // enqueueSnackbar('Dados do pedido anterior carregados. Revise e confirme.', { 
          //   variant: 'info' 
          // });
        }
      } catch (error) {
        console.error('Erro ao carregar pedido copiado:', error);
      }
    };
    
    carregarPedidoCopiado();
  }, [enqueueSnackbar]);
  
  // Efeito para preencher o formulário com os dados do pedido copiado
  // quando produtos e clientes estiverem carregados
  useEffect(() => {
    if (
      pedidoCopiado && 
      !isLoadingClientes && 
      !isLoadingProdutos && 
      clientes.length > 0 && 
      produtos.length > 0
    ) {
      // Verificar se o cliente ainda existe
      const clienteExiste = clientes.some(c => c.id === pedidoCopiado.cliente_id);
      
      if (clienteExiste) {
        setValue('cliente_id', pedidoCopiado.cliente_id);
      } else {
        enqueueSnackbar('Cliente do pedido original não encontrado', { variant: 'warning' });
      }
      
      // Preparar itens com valores calculados
      const itensCalculados = pedidoCopiado.itens
        .filter(item => {
          // Verificar se o produto ainda existe
          const produto = produtos.find(p => p.id === item.produto_id);
          return !!produto;
        })
        .map(item => {
          const produto = produtos.find(p => p.id === item.produto_id);
          if (!produto) return null;
          
          return {
            produto_id: produto.id,
            quantidade: item.quantidade,
            preco_unitario: produto.preco_unitario,
            valor_total_item: produto.preco_unitario * item.quantidade,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean) as ItemPedidoForm[];
      
      if (itensCalculados.length > 0) {
        setValue('itens', itensCalculados);
      } else {
        enqueueSnackbar('Produtos do pedido original não encontrados', { variant: 'warning' });
      }
      
      // Limpar pedido copiado para não usar novamente
      setPedidoCopiado(null);
    }
  }, [pedidoCopiado, clientes, produtos, isLoadingClientes, isLoadingProdutos, setValue, enqueueSnackbar]);

  const handleAddItem = () => {
    setValue('itens', [
      ...itens,
      {
        produto_id: 0,
        quantidade: 1,
        preco_unitario: 0,
        valor_total_item: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setValue(
      'itens',
      itens.filter((_, i) => i !== index)
    );
  };

  const handleProdutoChange = (index: number, produtoId: number) => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (produto) {
      // Definir quantidade padrão baseada no tipo do produto
      // 1 para unidades, 0.1 para kg/lt
      const quantidadePadrao = produto.tipo_medida === 'un' ? 1 : 0.1;
      
      const novoItem = {
        ...itens[index],
        produto_id: produto.id,
        produto: produto,
        quantidade: quantidadePadrao, // Reset da quantidade ao mudar o produto
        preco_unitario: produto.preco_unitario,
        valor_total_item: produto.preco_unitario * quantidadePadrao,
      };
      const novosItens = [...itens];
      novosItens[index] = novoItem;
      setValue('itens', novosItens);
    }
  };

  const handleQuantidadeChange = (index: number, quantidade: number) => {
    // Garantir que a quantidade seja sempre um número válido
    let quantidadeValida = isNaN(quantidade) ? 0 : quantidade;
    
    // Verificar se o produto atual é do tipo 'un' ou 'kg'/'lt' para aplicação de regras diferentes
    const produto = itens[index].produto;
    if (produto) {
      if (produto.tipo_medida === 'un' && quantidadeValida < 1) {
        // Para produtos por unidade, quantidade mínima é 1
        enqueueSnackbar('Para produtos em unidade, a quantidade mínima é 1', { variant: 'warning' });
        return;
      } else if ((produto.tipo_medida === 'kg' || produto.tipo_medida === 'lt') && quantidadeValida < 0.01) {
        // Para produtos por kg/lt, quantidade mínima é 0.01
        enqueueSnackbar('Para produtos em kg/lt, a quantidade mínima é 0,01', { variant: 'warning' });
        return;
      }
    } else if (quantidadeValida <= 0) {
      // Regra genérica para produtos não selecionados
      enqueueSnackbar('A quantidade deve ser maior que zero', { variant: 'warning' });
      return;
    }
    
    // Formatar a quantidade com base no tipo de medida do produto
    // Produto já foi obtido acima
    let quantidadeFormatada = quantidadeValida;
    
    if (produto) {
      if (produto.tipo_medida === 'kg' || produto.tipo_medida === 'lt') {
        // Para kg ou lt: garantir que seja valor decimal com 2 casas
        quantidadeFormatada = Math.floor(quantidadeValida * 100) / 100; // Truncar para 2 casas decimais
        
        // Garantir valor mínimo para kg/lt
        if (quantidadeFormatada < 0.01) {
          quantidadeFormatada = 0.01;
        }
      } else if (produto.tipo_medida === 'un') {
        // Para unidades: garantir que seja valor inteiro
        quantidadeFormatada = Math.floor(quantidadeValida);
        
        // Garantir valor mínimo para unidades
        if (quantidadeFormatada < 1) {
          quantidadeFormatada = 1;
        }
      }
    } else {
      // Se não tiver produto, define um valor padrão
      quantidadeFormatada = 1;
    }
    
    const novoItem = {
      ...itens[index],
      quantidade: quantidadeFormatada,
      valor_total_item: itens[index].preco_unitario * quantidadeFormatada,
    };
    
    const novosItens = [...itens];
    novosItens[index] = novoItem;
    setValue('itens', novosItens);
  };

  const onSubmit = async (data: PedidoForm) => {
    try {
      // Validações
      if (data.cliente_id === 0) {
        enqueueSnackbar('Selecione um cliente', { variant: 'error' });
        return;
      }
      
      if (data.itens.length === 0) {
        enqueueSnackbar('Adicione pelo menos um item ao pedido', { variant: 'error' });
        return;
      }
      
      // Verificar se todos os produtos estão selecionados
      const itemInvalido = data.itens.find(item => !item.produto_id || item.produto_id === 0);
      if (itemInvalido) {
        enqueueSnackbar('Selecione um produto para todos os itens', { variant: 'error' });
        return;
      }
      
      setIsSubmitting(true);
      const now = new Date().toISOString();
      
      // Estruturar o pedido de acordo com o esperado pelo backend
      const pedidoData = {
        cliente_id: data.cliente_id,
        valor_total: data.itens.reduce((total, item) => total + item.valor_total_item, 0),
        status: 'ATIVO' as const, // Necessário para a tipagem Omit<Pedido, 'id'>
        created_at: now, // Necessário para a tipagem Omit<Pedido, 'id'>
        updated_at: now, // Necessário para a tipagem Omit<Pedido, 'id'>
        data_pedido: now, // Necessário para a tipagem, mas será removido abaixo
        itensPedido: data.itens.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          valor_total_item: item.valor_total_item
        }))
      };
      
      // Reconstruir o objeto explicitamente para garantir que apenas os campos necessários sejam enviados
      // Evitando qualquer vazamento de propriedades através do spread operator
      const pedidoFinal = {
        cliente_id: pedidoData.cliente_id,
        observacoes: data.observacoes, // Incluir observações no pedido
        itens: pedidoData.itensPedido.map(({ produto_id, quantidade }) => ({
          produto_id,
          quantidade
        }))
      };
      
      // Logar o objeto final para inspeção
      console.log('Objeto pedidoFinal a ser enviado:', JSON.stringify(pedidoFinal, null, 2));
      
      try {
        // Usando 'as any' para contornar a verificação de tipos, já que há uma discrepância 
        // entre o tipo Pedido no frontend (que espera itensPedido) e o que a API realmente aceita (itens)
        const novoPedido = await criarPedido(pedidoFinal as any);
        console.log('Pedido criado com sucesso:', novoPedido);
        
        enqueueSnackbar('Pedido criado com sucesso!', { variant: 'success' });
        router.push('/pedidos');
      } catch (error: any) {
        console.error('Erro ao criar pedido:', error);
        
        // Tratamento específico para erros comuns do backend
        let mensagemErro = 'Erro ao criar pedido. Por favor, tente novamente.';
        
        if (error.response) {
          // Erro com resposta do servidor
          const status = error.response.status;
          const data = error.response.data;
          
          console.log('Detalhes do erro:', { status, data });
          
          // Tratamento específico por status HTTP
          if (status === 400) {
            // Bad Request - validações específicas
            if (data.message) {
              if (typeof data.message === 'string') {
                mensagemErro = data.message;
              } else if (Array.isArray(data.message)) {
                mensagemErro = data.message.join(', ');
              }
            }
          } else if (status === 404) {
            // Not Found - cliente ou produto não encontrado
            if (data.message && data.message.includes('Cliente')) {
              mensagemErro = 'Cliente não encontrado ou inativo.';
            } else if (data.message && data.message.includes('Produto')) {
              mensagemErro = 'Um ou mais produtos não foram encontrados ou estão inativos.';
            } else {
              mensagemErro = data.message || 'Recurso não encontrado.';
            }
          } else if (status === 500) {
            // Internal Server Error - problemas de processamento
            mensagemErro = 'Erro interno no servidor. Verifique se o cliente e produtos estão ativos e tente novamente.';
            
            // Se tivermos uma mensagem de erro específica do servidor, usamos ela
            if (data && data.message) {
              mensagemErro = data.message;
            }
          }
        }
        
        enqueueSnackbar(mensagemErro, { variant: 'error' });
      }
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      enqueueSnackbar('Erro ao criar pedido', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const valorTotal = itens.reduce((total, item) => total + item.valor_total_item, 0);

  // Helper para exibir mensagem de ajuda para quantidade
  const getQuantidadeHelperText = (tipoMedida?: string) => {
    if (!tipoMedida) return '';
    return ''; // Removemos as mensagens helper para evitar duplicação na UI
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Novo Pedido
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel id="cliente-label">Cliente</InputLabel>
              <Controller
                name="cliente_id"
                control={control}
                rules={{ required: 'Selecione um cliente' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="cliente-label"
                    label="Cliente"
                    error={!!errors.cliente_id}
                  >
                    <MenuItem value={0} disabled>
                      Selecione um cliente
                    </MenuItem>
                    {clientes.map((cliente) => (
                      <MenuItem key={cliente.id} value={cliente.id}>
                        {cliente.nome_fantasia}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.cliente_id && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {errors.cliente_id.message}
                </Alert>
              )}
            </FormControl>

            <Box>
              <Typography variant="h6" gutterBottom>
                Itens do Pedido
              </Typography>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width="35%">Produto</TableCell>
                      <TableCell width="15%">Quantidade</TableCell>
                      <TableCell width="15%">Preço Unitário</TableCell>
                      <TableCell width="15%">Valor Total</TableCell>
                      <TableCell width="20%">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={item.produto_id || ''}
                              onChange={(e) => handleProdutoChange(index, Number(e.target.value))}
                              displayEmpty
                              sx={{ borderRadius: 1 }}
                            >
                              <MenuItem value="" disabled>
                                Selecione um produto
                              </MenuItem>
                              {produtos.map((produto) => (
                                <MenuItem key={produto.id} value={produto.id}>
                                  {produto.nome}
                                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    ({produto.tipo_medida})
                                  </Typography>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            {/* Botão de decremento */}
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                if (!item.produto) return;
                                
                                const isUnidade = item.produto.tipo_medida === 'un';
                                const step = isUnidade ? 1 : 0.01;
                                const valorMinimo = isUnidade ? 1 : 0.01;
                                const novoValor = Math.max(item.quantidade - step, valorMinimo);
                                handleQuantidadeChange(index, novoValor);
                              }}
                              sx={{ p: 0.5 }}
                              disabled={!item.produto}
                            >
                              <Box sx={{ 
                                bgcolor: '#f0f0f0', 
                                borderRadius: '50%', 
                                width: 24, 
                                height: 24, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                '&:hover': {
                                  bgcolor: '#e0e0e0'
                                } 
                              }}>
                                <Typography>-</Typography>
                              </Box>
                            </IconButton>
                            <TextField
                              type="number"
                              value={item.quantidade}
                              onChange={(e) => handleQuantidadeChange(index, Number(e.target.value))}
                              onBlur={() => {
                                if (!item.produto) return;
                                
                                if (item.produto.tipo_medida === 'un') {
                                  // Força valores inteiros para unidades
                                  handleQuantidadeChange(index, Math.floor(item.quantidade));
                                } else if (item.produto.tipo_medida === 'kg' || item.produto.tipo_medida === 'lt') {
                                  // Força 2 casas decimais para kg/lt
                                  handleQuantidadeChange(index, Math.floor(item.quantidade * 100) / 100);
                                }
                              }}
                              fullWidth
                              size="small"
                              inputProps={{
                                // Não usamos min aqui para evitar validações nativas do browser que podem ser confusas
                                // A validação acontece no handler de onChange
                                step: (item.produto?.tipo_medida === 'kg' || item.produto?.tipo_medida === 'lt') ? 0.01 : 1,
                                // Impede entrada de decimais para produtos tipo 'un'
                                inputMode: item.produto?.tipo_medida === 'un' ? 'numeric' : 'decimal'
                              }}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Typography variant="caption" color="text.secondary">
                                      {item.produto?.tipo_medida || ''}
                                    </Typography>
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                mx: 1, 
                                width: 100,
                                '& .MuiFormHelperText-root': {
                                  position: 'absolute',
                                  bottom: -18,
                                  fontSize: '0.7rem',
                                  textAlign: 'center',
                                  width: '100%',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }}
                              FormHelperTextProps={{
                                sx: { m: 0 }
                              }}
                              // Removido helperText para evitar problemas de exibição
                              disabled={!item.produto}
                            />
                            {/* Botão de incremento */}
                            <IconButton 
                              size="small"
                              onClick={() => {
                                if (!item.produto) return;
                                
                                const isUnidade = item.produto.tipo_medida === 'un';
                                const step = isUnidade ? 1 : 0.01;
                                handleQuantidadeChange(index, item.quantidade + step);
                              }}
                              sx={{ p: 0.5 }}
                              disabled={!item.produto}
                            >
                              <Box sx={{ 
                                bgcolor: '#f0f0f0', 
                                borderRadius: '50%', 
                                width: 24, 
                                height: 24, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                '&:hover': {
                                  bgcolor: '#e0e0e0'
                                } 
                              }}>
                                <Typography>+</Typography>
                              </Box>
                            </IconButton>
                            
                            {item.produto && (
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  display: 'block', 
                                  position: 'absolute',
                                  bottom: -15,
                                  left: 0,
                                  right: 0,
                                  fontSize: '9px',
                                  textAlign: 'center'
                                }}
                              >
                                {item.produto.tipo_medida === 'kg' ? 'Use decimais (0,5)' : 
                                 item.produto.tipo_medida === 'litros' ? 'Use decimais (0,5)' : 
                                 'Apenas números inteiros'}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {item.preco_unitario.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell>
                          {item.valor_total_item.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleRemoveItem(index)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {itens.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="text.secondary">
                            Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableHead>
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <Typography variant="subtitle1">Total do Pedido:</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {valorTotal.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                </Table>
              </TableContainer>

              <Button 
                variant="outlined" 
                onClick={handleAddItem} 
                sx={{ mt: 2 }}
                startIcon={<>+</>}
              >
                Adicionar Item
              </Button>
            </Box>

            <Box sx={{ mt: 4, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                Observações (opcional)
              </Typography>
              <Controller
                name="observacoes"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Adicione observações sobre o pedido"
                    {...field}
                    InputProps={{
                      sx: {
                        backgroundColor: 'background.paper',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      },
                    }}
                  />
                )}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => router.push('/pedidos')}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={isSubmitting || itens.length === 0}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Criando...' : 'Criar Pedido'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
