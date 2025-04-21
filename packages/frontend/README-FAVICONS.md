# Guia de Favicons e Metadados - Lino's Panificadora

Este guia explica como os favicons e metadados estão configurados no projeto.

## Arquivos de Favicon

Os seguintes arquivos são necessários para uma experiência completa:

| Arquivo | Tamanho | Descrição | Localização |
|---------|---------|-----------|------------|
| `favicon.ico` | 16x16, 32x32 | Favicon tradicional | `/public` e `/src/app` |
| `icon1.png` | 32x32 | Ícone PNG para navegadores modernos | `/public` e `/src/app` |
| `apple-icon.png` | 180x180 | Ícone para dispositivos Apple | `/public` e `/src/app` |
| `opengraph-image.png` | 1200x630 | Imagem para compartilhamento em redes sociais | `/public` e `/src/app` |
| `web-app-manifest-192x192.png` | 192x192 | Ícone para PWA | `/public` |
| `web-app-manifest-512x512.png` | 512x512 | Ícone para PWA | `/public` |

## Configuração

Os metadados estão configurados em:

1. `/src/app/metadata.ts` - Define os metadados para o Next.js App Router
2. `/src/app/layout.tsx` - Importa e exporta os metadados, além de adicionar tags meta e link diretamente
3. `/public/manifest.json` - Define as configurações para Progressive Web App (PWA)

## Como Atualizar

Para atualizar os favicons:

1. Substitua os arquivos nas pastas `/public` e `/src/app`
2. Execute o script `copy-icons.sh` para garantir que os arquivos estejam em ambos os locais:
   ```bash
   cd packages/frontend
   chmod +x copy-icons.sh
   ./copy-icons.sh
   ```

## Verificação

Após o deploy, verifique se os favicons e metadados estão funcionando corretamente:

1. **Verificação visual**: Acesse o site e verifique se o favicon aparece na aba do navegador.
2. **Verificação do Open Graph**: Use estas ferramentas:
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
3. **Verificação técnica**: Use ferramentas de inspeção do navegador para verificar se os metadados estão sendo carregados corretamente.

## Estrutura de Arquivos

```
packages/frontend/
├── public/
│   ├── favicon.ico
│   ├── icon1.png
│   ├── apple-icon.png
│   ├── opengraph-image.png
│   ├── web-app-manifest-192x192.png
│   ├── web-app-manifest-512x512.png
│   ├── manifest.json
│   ├── robots.txt
│   └── sitemap.xml
└── src/
    └── app/
        ├── favicon.ico
        ├── icon1.png
        ├── apple-icon.png
        ├── opengraph-image.png
        ├── metadata.ts
        └── layout.tsx
```
