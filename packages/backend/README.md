# Lino's Panificadora - Backend

## Logo para PDFs

Para garantir que a logo apareça corretamente nos PDFs gerados em produção (Render), siga estas instruções:

### Onde colocar a logo
- O arquivo da logo deve estar em: `/opt/render/project/src/uploads/static/logo.png` (Render) ou `uploads/static/logo.png` (local)
- Esse arquivo **já está versionado** no repositório. Se precisar trocar a logo, basta substituir o arquivo e fazer commit/push.

### Como o backend encontra a logo
- O código busca a logo por padrão em `/opt/render/project/src/uploads/static/logo.png` (Render) ou `uploads/static/logo.png` (local).
- **Não use variáveis de ambiente com caminhos absolutos** (`UPLOADS_PATH`) no Render, a não ser que saiba exatamente o que está fazendo.
- Se `UPLOADS_PATH` não estiver setada, o backend já procura no local correto (`/opt/render/project/src/uploads` em produção Render).

### Deploy no Render
- Após cada deploy, tudo que está versionado no repositório estará disponível (inclusive a logo).
- Não é necessário upload manual da logo no servidor Render.
- Se trocar a logo, basta commit/push e um novo deploy.

### Dica para build limpo
- Se quiser garantir que o ambiente está limpo, use a opção "Clear build cache & deploy" no Render.

---

Se a logo não aparecer no PDF:
- Verifique se `/opt/render/project/src/uploads/static/logo.png` (Render) ou `uploads/static/logo.png` (local) existe no ambiente de produção (Render).
- Confira os logs do backend para mensagens sobre "logo não encontrada".
- Certifique-se de que não há variáveis de ambiente sobrescrevendo o caminho dos uploads.

---

## Fallback de diretório de uploads

Se o backend não conseguir criar ou gravar em `/var/data/uploads` (por permissão ou inexistência), ele automaticamente cria e usa um diretório temporário seguro em `temp_uploads` dentro do projeto. Isso garante que o sistema continue funcionando sem falhas de escrita, mas o ideal é garantir permissão de escrita em `/var/data/uploads` para produção.

- Se o fallback for acionado, um aviso será exibido nos logs.
- Certifique-se de configurar o ambiente do Render para permitir escrita em `/var/data/uploads` se desejar usar esse caminho.

## Build e Deploy Limpos

- O build do backend agora copia automaticamente os assets estáticos (logo, etc) para o diretório correto em `dist/assets`.
- O script de start de produção (`yarn start:prod`) filtra warnings conhecidos (prisma duplicado, bare-fs, bare-os), garantindo logs limpos.
- Warnings importantes e erros continuam visíveis para facilitar o diagnóstico.

## Resumo das melhores práticas implementadas

- Deploy limpo, sem warnings transitivos conhecidos.
- Logo sempre disponível no build, sem necessidade de uploads manuais.
- Fallback seguro para diretórios de uploads.
- Scripts de build e start robustos e automatizados.

---

Para dúvidas ou problemas, consulte este README ou entre em contato com o responsável pelo backend.
