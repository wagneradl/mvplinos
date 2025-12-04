# Guia de Configuração de Metainformações para Projetos Web

> **Nota para Ambientes .NET (MVC/CSHTML)**: Este guia foi originalmente criado para projetos Next.js, mas inclui adaptações específicas para ambientes .NET MVC ao final de cada seção.

Este guia explica como configurar corretamente metainformações, ícones, SEO e prévias de links para projetos Next.js, usando como exemplo o projeto Lino's Panificadora.

## Índice

1. [Estrutura de Arquivos](#estrutura-de-arquivos)
2. [Configuração de Metadados](#configuração-de-metadados)
3. [Ícones e Imagens](#ícones-e-imagens)
4. [Manifesto Web App](#manifesto-web-app)
5. [Layout e Integração](#layout-e-integração)
6. [SEO Adicional](#seo-adicional)
7. [Verificação de Arquivos](#verificação-de-arquivos)
8. [Checklist Final](#checklist-final)
9. [Implementação em .NET MVC](#implementação-em-net-mvc)

## Estrutura de Arquivos

Para uma configuração completa em Next.js, você precisará dos seguintes arquivos:

```
/packages/frontend/
├── src/
│   ├── app/
│   │   ├── metadata.ts         # Configurações de metadados
│   │   └── layout.tsx          # Layout raiz com integrações
├── public/
│   ├── favicon.ico             # Favicon tradicional
│   ├── icon1.png               # Ícone principal (32x32)
│   ├── apple-icon.png          # Ícone para Apple (180x180)
│   ├── opengraph-image.png     # Imagem para compartilhamento (1200x630)
│   ├── web-app-manifest-192x192.png  # Ícone PWA (192x192)
│   ├── web-app-manifest-512x512.png  # Ícone PWA (512x512)
│   ├── manifest.json           # Manifesto para PWA
│   ├── robots.txt              # Instruções para crawlers
│   └── sitemap.xml             # Mapa do site
└── next.config.js              # Configurações adicionais
```

### Adaptação para .NET MVC

Em um projeto .NET MVC, a estrutura seria:

```
/YourProject/
├── Views/
│   ├── Shared/
│   │   ├── _Layout.cshtml      # Layout principal com metadados
│   │   └── _ViewImports.cshtml # Importações de namespaces
├── wwwroot/
│   ├── favicon.ico             # Favicon tradicional
│   ├── images/
│   │   ├── icon1.png           # Ícone principal (32x32)
│   │   ├── apple-icon.png      # Ícone para Apple (180x180)
│   │   ├── og-image.png        # Imagem para compartilhamento (1200x630)
│   │   ├── icon-192x192.png    # Ícone PWA (192x192)
│   │   └── icon-512x512.png    # Ícone PWA (512x512)
│   ├── manifest.json           # Manifesto para PWA
│   ├── robots.txt              # Instruções para crawlers
│   └── sitemap.xml             # Mapa do site
└── App_Start/
    └── BundleConfig.cs         # Configuração de bundles (opcional)
```

## Configuração de Metadados

Em Next.js, o arquivo `metadata.ts` centraliza todas as configurações de metadados do seu projeto. Aqui está o exemplo do Lino's Panificadora:

```typescript
// src/app/metadata.ts
import { Metadata, Viewport } from 'next';

// Viewport export separado conforme recomendado pelo Next.js 15
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Lino's Panificadora - Sistema de Gestão",
  description: "Sistema de gestão integrado da Lino's Panificadora",
  metadataBase: new URL('https://sistema.linospanificadora.com'),
  icons: {
    icon: '/icon1.png',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/apple-icon.png',
    },
  },
  // Open Graph / Facebook
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://sistema.linospanificadora.com/',
    siteName: "Lino's Panificadora",
    title: "Lino's Panificadora - Sistema de Gestão",
    description: "Sistema de gestão integrado da Lino's Panificadora",
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: "Lino's Panificadora",
      },
    ],
  },
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: "Lino's Panificadora - Sistema de Gestão",
    description: "Sistema de gestão integrado da Lino's Panificadora",
    images: ['/opengraph-image.png'],
    creator: '@linospanificadora',
  },
  // Metadados adicionais
  keywords: 'panificadora, padaria, gestão, sistema, Lino, administração',
  authors: [{ name: "Lino's Panificadora" }],
};
```

### Pontos Importantes:

- **metadataBase**: Define a URL base para todos os links relativos
- **openGraph**: Configura como seu site aparece quando compartilhado no Facebook e outras plataformas
- **twitter**: Configura como seu site aparece quando compartilhado no Twitter
- **keywords**: Palavras-chave para SEO (ainda úteis para alguns mecanismos de busca)

### Adaptação para .NET MVC

Em .NET MVC, você normalmente define os metadados no arquivo `_Layout.cshtml` ou cria um ViewComponent específico. Exemplo:

```html
<!-- Em _Layout.cshtml -->
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>@ViewData["Title"] - Sistema de Gestão</title>
    <meta name="description" content="@ViewData["Description"] ?? "Sistema de gestão integrado da Lino's Panificadora"" />
    <meta name="keywords" content="panificadora, padaria, gestão, sistema, Lino, administração" />
    
    <!-- Ícones -->
    <link rel="icon" href="~/favicon.ico" sizes="any" />
    <link rel="icon" href="~/images/icon1.png" type="image/png" />
    <link rel="apple-touch-icon" href="~/images/apple-icon.png" />
    <link rel="manifest" href="~/manifest.json" />
    <meta name="theme-color" content="#ffffff" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://sistema.linospanificadora.com@(Context.Request.Path)" />
    <meta property="og:title" content="@ViewData["Title"] - Sistema de Gestão" />
    <meta property="og:description" content="@ViewData["Description"] ?? "Sistema de gestão integrado da Lino's Panificadora"" />
    <meta property="og:image" content="https://sistema.linospanificadora.com/images/og-image.png" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:site_name" content="Lino's Panificadora" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="@ViewData["Title"] - Sistema de Gestão" />
    <meta name="twitter:description" content="@ViewData["Description"] ?? "Sistema de gestão integrado da Lino's Panificadora"" />
    <meta name="twitter:image" content="https://sistema.linospanificadora.com/images/og-image.png" />
    <meta name="twitter:creator" content="@linospanificadora" />
    
    <!-- Estilos e scripts -->
    <link rel="stylesheet" href="~/css/site.css" asp-append-version="true" />
    @RenderSection("Styles", required: false)
</head>
```

Você pode criar um método de extensão para facilitar o uso:

```csharp
// Em Helpers/MetadataHelper.cs
public static class MetadataHelper
{
    public static IHtmlContent RenderMetadata(this IHtmlHelper html, string title, string description = null)
    {
        html.ViewContext.ViewData["Title"] = title;
        html.ViewContext.ViewData["Description"] = description;
        return HtmlString.Empty;
    }
}

// Uso em uma view
@{
    Html.RenderMetadata("Página de Pedidos", "Gerencie todos os pedidos da padaria");
}
```

## Ícones e Imagens

Você precisa preparar vários ícones em diferentes tamanhos:

1. **favicon.ico** (16x16, 32x32) - Ícone tradicional para favoritos
2. **icon1.png** (32x32) - Ícone principal
3. **apple-icon.png** (180x180) - Ícone para dispositivos Apple
4. **opengraph-image.png** (1200x630) - Imagem para compartilhamento em redes sociais
5. **web-app-manifest-192x192.png** (192x192) - Ícone para PWA
6. **web-app-manifest-512x512.png** (512x512) - Ícone para PWA

Todos estes arquivos devem ser colocados na pasta `/public/`.

### Dicas para Criação de Ícones:

- Use ferramentas como [Figma](https://www.figma.com/) ou [Canva](https://www.canva.com/) para criar seus ícones
- Mantenha uma área de segurança ao redor do logo (especialmente para ícones circulares em alguns dispositivos)
- Teste como seus ícones aparecem em fundos claros e escuros
- Para o opengraph-image.png, inclua o logo, nome do site e possivelmente um slogan curto

## Manifesto Web App

O arquivo `manifest.json` é essencial para PWAs (Progressive Web Apps) e deve ser colocado na pasta `/public/`:

```json
{
  "name": "Lino's Panificadora - Sistema de Gestão",
  "short_name": "Lino's Panificadora",
  "icons": [
    {
      "src": "/web-app-manifest-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/web-app-manifest-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon1.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "/apple-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/pedidos",
  "scope": "/",
  "description": "Sistema de gestão integrado da Lino's Panificadora"
}
```

### Pontos Importantes:

- **name**: Nome completo do aplicativo (mostrado na tela de instalação)
- **short_name**: Nome curto (mostrado sob o ícone na tela inicial)
- **icons**: Lista de ícones em diferentes tamanhos
- **purpose**: "maskable" significa que o ícone pode ser cortado em formatos diferentes (círculo, quadrado, etc.)
- **start_url**: Página inicial quando o app é aberto da tela inicial
- **display**: "standalone" faz o app parecer um aplicativo nativo sem barra de navegação

## Layout e Integração

Em Next.js, no arquivo `layout.tsx`, você integra os metadados e adiciona tags adicionais:

```tsx
// src/app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { metadata, viewport } from './metadata';
import { ClientLayout } from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export { metadata, viewport };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon1.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={inter.className}>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
```

### Pontos Importantes:

- **export { metadata, viewport }**: Exporta os metadados para o Next.js
- **lang="pt-BR"**: Define o idioma do site
- **link tags**: Adiciona links para ícones e manifesto
- **theme-color**: Define a cor do tema para navegadores móveis

### Adaptação para .NET MVC

Em .NET MVC, você já viu como implementar os metadados no `_Layout.cshtml`. Para tornar dinâmico, você pode usar ViewData, ViewBag ou um modelo específico:

```csharp
// Em um controller
public IActionResult Index()
{
    ViewData["Title"] = "Página Inicial";
    ViewData["Description"] = "Bem-vindo ao sistema de gestão da Lino's Panificadora";
    return View();
}
```

Para seções específicas do site, você pode criar layouts parciais ou usar RenderSection:

```html
<!-- Em _Layout.cshtml -->
@RenderSection("MetaTags", required: false)

<!-- Em uma view específica -->
@section MetaTags {
    <meta property="og:image" content="https://sistema.linospanificadora.com/images/produtos-og.png" />
}
```

## SEO Adicional

### robots.txt

Crie um arquivo `robots.txt` na pasta `/public/` para controlar quais partes do seu site podem ser rastreadas:

```
# Permitir todos os robôs de busca
User-agent: *
Allow: /

# Desativar para áreas administrativas
Disallow: /admin/
Disallow: /api/

# Localização do Sitemap
Sitemap: https://sistema.linospanificadora.com/sitemap.xml
```

### sitemap.xml

Crie um arquivo `sitemap.xml` na pasta `/public/` para ajudar os mecanismos de busca a indexar seu site:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sistema.linospanificadora.com/</loc>
    <lastmod>2025-05-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sistema.linospanificadora.com/pedidos</loc>
    <lastmod>2025-05-10</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sistema.linospanificadora.com/clientes</loc>
    <lastmod>2025-05-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sistema.linospanificadora.com/produtos</loc>
    <lastmod>2025-05-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Verificação de Arquivos

Em Next.js, no `next.config.js`, adicione verificações para garantir que os arquivos estáticos essenciais existam:

```javascript
/** @type {import('next').NextConfig} */
const path = require('path');
const fs = require('fs');

// Verificar se os arquivos estáticos essenciais existem
const publicDir = path.join(__dirname, 'public');
const requiredFiles = ['manifest.json', 'favicon.ico', 'icon1.png'];

requiredFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[AVISO] Arquivo estático necessário não encontrado: ${file}`);
  } else {
    console.log(`[OK] Arquivo estático encontrado: ${file}`);
  }
});

const nextConfig = {
  // ... outras configurações
};

module.exports = nextConfig;
```

## Checklist Final

Use esta lista para verificar se você configurou tudo corretamente:

### Para Next.js:
- [ ] Arquivo `metadata.ts` com todas as configurações necessárias
- [ ] Ícones em diferentes tamanhos na pasta `/public/`
- [ ] Arquivo `manifest.json` para PWA
- [ ] Integração no `layout.tsx`
- [ ] Arquivos `robots.txt` e `sitemap.xml`
- [ ] Verificação de arquivos no `next.config.js`

### Para .NET MVC:
- [ ] Metadados configurados no `_Layout.cshtml`
- [ ] Ícones em diferentes tamanhos na pasta `/wwwroot/images/`
- [ ] Arquivo `manifest.json` na pasta `/wwwroot/`
- [ ] Arquivos `robots.txt` e `sitemap.xml` na pasta `/wwwroot/`
- [ ] Helpers para gerenciar metadados dinamicamente

### Teste suas Configurações

1. **Teste de Compartilhamento**: Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) e [Twitter Card Validator](https://cards-dev.twitter.com/validator) para verificar como seu site aparece quando compartilhado
2. **Teste de PWA**: Use o Lighthouse no Chrome DevTools para verificar se seu site pode ser instalado como PWA
3. **Teste de SEO**: Use ferramentas como [Google Search Console](https://search.google.com/search-console) para verificar a indexação do seu site

## Implementação em .NET MVC

### Estrutura de Projeto Recomendada

Para implementar todas essas metainformações em um projeto .NET MVC, recomendamos a seguinte abordagem:

1. **Crie um ViewComponent para Metadados**

```csharp
// Em Components/MetadataViewComponent.cs
public class MetadataViewComponent : ViewComponent
{
    public IViewComponentResult Invoke(string title = null, string description = null, string imageUrl = null)
    {
        var metadata = new MetadataViewModel
        {
            Title = title ?? "Lino's Panificadora - Sistema de Gestão",
            Description = description ?? "Sistema de gestão integrado da Lino's Panificadora",
            ImageUrl = imageUrl ?? "/images/og-image.png",
            SiteName = "Lino's Panificadora",
            BaseUrl = "https://sistema.linospanificadora.com"
        };
        
        return View(metadata);
    }
}

// Em Models/MetadataViewModel.cs
public class MetadataViewModel
{
    public string Title { get; set; }
    public string Description { get; set; }
    public string ImageUrl { get; set; }
    public string SiteName { get; set; }
    public string BaseUrl { get; set; }
    public string CanonicalUrl => $"{BaseUrl}{HttpContext.Current?.Request.Path ?? ""}";
}
```

2. **Crie a View do Component**

```html
<!-- Em Views/Shared/Components/Metadata/Default.cshtml -->
@model MetadataViewModel

<title>@Model.Title</title>
<meta name="description" content="@Model.Description" />
<meta name="keywords" content="panificadora, padaria, gestão, sistema, Lino, administração" />

<!-- Canonical -->
<link rel="canonical" href="@Model.CanonicalUrl" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="@Model.CanonicalUrl" />
<meta property="og:title" content="@Model.Title" />
<meta property="og:description" content="@Model.Description" />
<meta property="og:image" content="@(Model.BaseUrl + Model.ImageUrl)" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:site_name" content="@Model.SiteName" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="@Model.Title" />
<meta name="twitter:description" content="@Model.Description" />
<meta name="twitter:image" content="@(Model.BaseUrl + Model.ImageUrl)" />
<meta name="twitter:creator" content="@linospanificadora" />
```

3. **Use o Component no Layout Principal**

```html
<!-- Em Views/Shared/_Layout.cshtml -->
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    
    @await Component.InvokeAsync("Metadata", new { 
        title = ViewData["Title"], 
        description = ViewData["Description"],
        imageUrl = ViewData["ImageUrl"]
    })
    
    <!-- Ícones -->
    <link rel="icon" href="~/favicon.ico" sizes="any" />
    <link rel="icon" href="~/images/icon1.png" type="image/png" />
    <link rel="apple-touch-icon" href="~/images/apple-icon.png" />
    <link rel="manifest" href="~/manifest.json" />
    <meta name="theme-color" content="#ffffff" />
    
    <!-- Estilos e scripts -->
    <link rel="stylesheet" href="~/css/site.css" asp-append-version="true" />
    @RenderSection("Styles", required: false)
</head>
<body>
    <!-- Conteúdo do site -->
    @RenderBody()
    
    <!-- Scripts -->
    <script src="~/js/site.js" asp-append-version="true"></script>
    @RenderSection("Scripts", required: false)
</body>
</html>
```

4. **Configure o Manifesto PWA**

Crie o arquivo `manifest.json` na pasta `wwwroot`:

```json
{
  "name": "Lino's Panificadora - Sistema de Gestão",
  "short_name": "Lino's Panificadora",
  "icons": [
    {
      "src": "/images/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/images/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/images/icon1.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "/images/apple-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/Pedidos",
  "scope": "/",
  "description": "Sistema de gestão integrado da Lino's Panificadora"
}
```

5. **Uso em Controllers e Views**

```csharp
// Em um controller
public IActionResult Pedidos()
{
    ViewData["Title"] = "Gerenciamento de Pedidos";
    ViewData["Description"] = "Gerencie todos os pedidos da padaria de forma eficiente";
    ViewData["ImageUrl"] = "/images/pedidos-og.png"; // Imagem específica para esta página
    
    return View();
}
```

### Considerações Específicas para .NET MVC

1. **Bundling e Minificação**: Use o sistema de bundling do ASP.NET para otimizar o carregamento de recursos:

```csharp
// Em App_Start/BundleConfig.cs
public static void RegisterBundles(BundleCollection bundles)
{
    bundles.Add(new ScriptBundle("~/bundles/js").Include(
        "~/js/site.js"));
    
    bundles.Add(new StyleBundle("~/bundles/css").Include(
        "~/css/site.css"));
}
```

2. **Geração de Sitemap Dinâmico**: Para sites com muitas páginas, considere gerar o sitemap dinamicamente:

```csharp
// Em Controllers/SitemapController.cs
public class SitemapController : Controller
{
    private readonly IYourDbContext _context;
    
    public SitemapController(IYourDbContext context)
    {
        _context = context;
    }
    
    [Route("sitemap.xml")]
    public ActionResult Index()
    {
        var baseUrl = "https://sistema.linospanificadora.com";
        var urls = new List<SitemapUrl>
        {
            new SitemapUrl { Loc = baseUrl, Priority = 1.0m, ChangeFreq = "monthly" },
            new SitemapUrl { Loc = $"{baseUrl}/Pedidos", Priority = 0.9m, ChangeFreq = "daily" },
            new SitemapUrl { Loc = $"{baseUrl}/Clientes", Priority = 0.8m, ChangeFreq = "weekly" },
            new SitemapUrl { Loc = $"{baseUrl}/Produtos", Priority = 0.8m, ChangeFreq = "weekly" }
        };
        
        // Adicionar URLs dinâmicas do banco de dados
        var produtos = _context.Produtos.Where(p => p.Ativo).ToList();
        foreach (var produto in produtos)
        {
            urls.Add(new SitemapUrl
            {
                Loc = $"{baseUrl}/Produtos/Detalhes/{produto.Id}",
                LastMod = produto.DataAtualizacao.ToString("yyyy-MM-dd"),
                Priority = 0.7m,
                ChangeFreq = "weekly"
            });
        }
        
        return Content(GenerateSitemapXml(urls), "application/xml");
    }
    
    private string GenerateSitemapXml(List<SitemapUrl> urls)
    {
        // Código para gerar o XML do sitemap
    }
}

public class SitemapUrl
{
    public string Loc { get; set; }
    public string LastMod { get; set; }
    public string ChangeFreq { get; set; }
    public decimal Priority { get; set; }
}
```

3. **Service Worker para PWA**: Para suporte completo a PWA, adicione um service worker:

```javascript
// Em wwwroot/js/service-worker.js
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('v1').then(function(cache) {
      return cache.addAll([
        '/',
        '/css/site.css',
        '/js/site.js',
        '/images/icon1.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
```

E registre-o no seu JavaScript principal:

```javascript
// Em wwwroot/js/site.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/js/service-worker.js').then(function(registration) {
      console.log('ServiceWorker registration successful');
    }, function(err) {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
```

---

Este guia foi criado com base no projeto Lino's Panificadora e adaptado para ambientes .NET MVC. Se você tiver dúvidas ou precisar de mais informações, entre em contato com a equipe de desenvolvimento.

Última atualização: 10 de maio de 2025
