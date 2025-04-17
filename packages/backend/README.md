# Lino's Panificadora - Backend

## Logo para PDFs

Para garantir que a logo apareça corretamente nos PDFs gerados em produção (Render), siga estas instruções:

### Onde colocar a logo
- O arquivo da logo deve estar em: `packages/backend/uploads/static/logo.png`
- Esse arquivo **já está versionado** no repositório. Se precisar trocar a logo, basta substituir o arquivo e fazer commit/push.

### Como o backend encontra a logo
- O código busca a logo por padrão em `uploads/static/logo.png` (relativo à raiz do backend).
- **Não use variáveis de ambiente com caminhos absolutos** (`UPLOADS_PATH`) no Render, a não ser que saiba exatamente o que está fazendo.
- Se `UPLOADS_PATH` não estiver setada, o backend já procura no local correto.

### Deploy no Render
- Após cada deploy, tudo que está versionado no repositório estará disponível (inclusive a logo).
- Não é necessário upload manual da logo no servidor Render.
- Se trocar a logo, basta commit/push e um novo deploy.

### Dica para build limpo
- Se quiser garantir que o ambiente está limpo, use a opção "Clear build cache & deploy" no Render.

---

Se a logo não aparecer no PDF:
- Verifique se `uploads/static/logo.png` existe no ambiente de produção (Render).
- Confira os logs do backend para mensagens sobre "logo não encontrada".
- Certifique-se de que não há variáveis de ambiente sobrescrevendo o caminho dos uploads.

---

Para dúvidas ou problemas, consulte este README ou entre em contato com o responsável pelo backend.
