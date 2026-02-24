# P50 — Frontend: Página Pública de Registro de Cliente

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. P49 concluído (auto-cadastro backend, 301 testes).

**Objetivo:** Criar página pública `/registrar` onde empresas podem solicitar cadastro. Formulário com dados da empresa + responsável, chamada ao POST /auth/registrar-cliente, feedback visual.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Garantir 301 testes passando e working tree limpa.

## TAREFA 1 — Página /registrar

Criar `packages/frontend/src/app/registrar/page.tsx` (fora dos route groups — página pública):

### Layout
- Página standalone com branding Lino's Panificadora (logo/nome no topo)
- Card centralizado com formulário (estilo similar à página /login)
- Link "Já tem conta? Faça login" no rodapé
- Responsivo (mobile-first)

### Formulário — Seção "Dados da Empresa"
```
Razão Social *          [input text]
Nome Fantasia           [input text]  (opcional)
CNPJ *                  [input text, máscara XX.XXX.XXX/XXXX-XX]
Email da Empresa *      [input email]
Telefone                [input text, máscara (XX) XXXXX-XXXX] (opcional)
```

### Formulário — Seção "Dados do Responsável"
```
Nome Completo *         [input text]
Email *                 [input email]
Senha *                 [input password, min 8 chars]
Confirmar Senha *       [input password]
```

### Botão
```
[Solicitar Cadastro]    (primário, full-width)
```

### Validações client-side
- Campos obrigatórios marcados
- CNPJ: 14 dígitos (validar formato, aceitar com ou sem máscara)
- Emails: formato válido
- Senha: mínimo 8 caracteres
- Confirmar senha: deve ser igual à senha
- Todos os erros mostrados inline abaixo do campo

### Máscara de CNPJ
- Usar máscara visual XX.XXX.XXX/XXXX-XX durante digitação
- Enviar ao backend apenas os 14 dígitos (sem pontuação)
- Se já existir lib de máscara no projeto, reutilizar. Senão implementar com regex simples ou react-input-mask (verificar se já é dependência)

## TAREFA 2 — Chamada API

```typescript
// POST /auth/registrar-cliente
const payload = {
  razao_social: form.razaoSocial,
  nome_fantasia: form.nomeFantasia || undefined,
  cnpj: form.cnpj.replace(/\D/g, ''),  // apenas dígitos
  email_empresa: form.emailEmpresa,
  telefone: form.telefone?.replace(/\D/g, '') || undefined,
  nome_responsavel: form.nomeResponsavel,
  email_responsavel: form.emailResponsavel,
  senha: form.senha,
};
```

**ATENÇÃO:** Verificar os nomes exatos dos campos no DTO do backend (P49). Pode ser camelCase ou snake_case. Usar exatamente o que o backend espera.

### Estados da chamada
- **Loading:** botão desabilitado, spinner, "Enviando..."
- **Sucesso:** redirecionar para página de confirmação ou mostrar mensagem inline:
  > "Cadastro recebido com sucesso! Você receberá um email quando sua conta for aprovada."
- **Erro 409 (Conflict):** "CNPJ já cadastrado" ou "Email já cadastrado" — mostrar inline no campo correspondente
- **Erro 400 (Validation):** mostrar erros retornados pelo backend
- **Erro genérico:** "Erro ao enviar cadastro. Tente novamente."

## TAREFA 3 — Página de Confirmação (pós-registro)

Opção A (preferida): Tela de sucesso no próprio `/registrar` (condicional):
```
✅ Cadastro enviado com sucesso!

Recebemos sua solicitação de cadastro para [Razão Social].
Um email de confirmação foi enviado para [email_responsavel].

Nosso time irá analisar seus dados e você será notificado
por email quando o cadastro for aprovado.

[Voltar para Login]
```

Opção B: Redirect para `/registrar/sucesso` com os dados em query params ou state.

Escolher a opção que for mais simples de implementar.

## TAREFA 4 — Link na Página de Login

Adicionar na página `/login` um link para registro:

```
Não tem conta? [Cadastre sua empresa]  → link para /registrar
```

Posicionar abaixo do botão de login, mesma área onde está "Esqueci minha senha".

## TAREFA 5 — Validação

### Build frontend
```bash
yarn workspace frontend build
```
Target: build sem erros

### Backend (não deve ser afetado)
```bash
yarn workspace backend test
```
Target: 301 testes passando (inalterado)

### Verificação visual (manual com dev server)
- `/registrar` acessível sem login
- Formulário renderiza com ambas seções
- Validações client-side funcionam (campos obrigatórios, formato email, CNPJ, senha)
- Máscara de CNPJ aplica durante digitação
- Submit chama API corretamente
- Mensagem de sucesso aparece após registro
- Link na página de login funciona

## CRITÉRIOS DE SUCESSO

- [ ] Página `/registrar` acessível publicamente
- [ ] Formulário com dados empresa + responsável
- [ ] Máscara CNPJ funcionando
- [ ] Validações client-side (obrigatórios, formato, senhas iguais)
- [ ] POST /auth/registrar-cliente integrado
- [ ] Loading state no botão durante chamada
- [ ] Tratamento de erros (409 conflict, 400 validation, genérico)
- [ ] Tela de sucesso pós-registro
- [ ] Link "Cadastre sua empresa" na página de login
- [ ] Backend: 301 testes (inalterado)
- [ ] Frontend: build sem erros
- [ ] Design consistente com páginas existentes (login, esqueci-senha)

## NOTAS IMPORTANTES

- **Não modificar backend.** Apenas frontend.
- **Verificar nomes dos campos** no DTO do backend (P49) — usar exatamente o que o backend espera.
- **Reutilizar padrões** de formulário existentes (login, esqueci-senha) para consistência visual.
- **Sem confirmação de email neste fluxo.** O usuário não precisa confirmar email — o admin aprova manualmente. Email é apenas notificação.
- **Rate limiting** já existe no backend para /auth/* (M1).
- **Commitar ao final** com: `feat(m3): página pública de registro de cliente`
