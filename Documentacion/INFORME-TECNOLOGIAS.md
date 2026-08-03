# Informe de Tecnologías y Dependencias

Fecha de relevamiento: 2026-08-03

## 1. Resumen ejecutivo

El proyecto es una aplicación web ASP.NET Core MVC orientada a gestión clínica odontológica. El backend está construido sobre `.NET 9`, `ASP.NET Core MVC`, `Entity Framework Core` y `SQL Server`; el frontend usa vistas `Razor/CSHTML`, `CSS` y `JavaScript` nativo, con varias dependencias cargadas por CDN o incluidas manualmente en `wwwroot`.

Hallazgos principales:

- El stack backend principal es coherente: `net9.0`, `C# 13.0`, `Razor 9.0`, `EF Core 9.0.15` y `JwtBearer 9.0.15`.
- El entorno local tiene instalados los runtimes `.NET 9.0.16`, mientras que el proyecto referencia paquetes `9.0.15`.
- Las imágenes Docker usan etiquetas flotantes (`sdk:9.0`, `aspnet:9.0`, `mssql/server:2022-latest`), por lo que la reproducibilidad exacta no está fijada por parche.
- En frontend hay dependencias externas no fijadas por versión exacta, especialmente `Tailwind CSS` vía CDN.
- Hay inconsistencia de versión en `Font Awesome` (`6.4.0` y `6.5.1`).
- `jQuery 3.7.1` está presente en `wwwroot/lib`, pero no se encontraron referencias directas desde las vistas `cshtml`.
- El proyecto tiene `NuGetAudit=false`, por lo que la auditoría automática de vulnerabilidades NuGet está deshabilitada.

## 2. Lenguajes de programación y formatos utilizados

| Tecnología | Versión exacta | Evidencia | Uso en el proyecto |
|---|---:|---|---|
| C# | 13.0 | `dotnet msbuild -getProperty:LangVersion` | Backend, controladores, servicios, modelos, `Program.cs` |
| Razor | 9.0 | `dotnet msbuild -getProperty:RazorLangVersion` | Vistas `*.cshtml` |
| .NET Target Framework | `net9.0` | `SmileTrack_MVC.csproj` | Plataforma objetivo del proyecto |
| HTML | No fijada explícitamente | Vistas `*.cshtml` con `<!DOCTYPE html>` | Estructura de UI |
| CSS | No fijada explícitamente | `wwwroot/css/**/*.css` | Estilos del frontend |
| JavaScript | No fijada explícitamente | `wwwroot/js/**/*.js` | Interactividad del frontend |
| SQL / T-SQL | Compatible con SQL Server 2022 | `Database/*.sql`, `docker-compose.yml` | Esquema y scripts de base de datos |
| JSON | Sin versión aplicable | `appsettings.json`, `launchSettings.json`, `project.assets.json` | Configuración y metadatos |
| YAML | `3.9` | `docker-compose.yml` | Orquestación de contenedores |
| Dockerfile syntax | No fijada explícitamente | `Dockerfile` | Build y runtime de contenedor |

Notas:

- El proyecto usa `ImplicitUsings=enable` y `Nullable=enable`.
- JavaScript, HTML y CSS no declaran una versión ECMAScript/CSS específica; se ejecutan según el navegador.

## 3. Frameworks, plataformas y herramientas principales

| Componente | Versión exacta | Fuente | Función |
|---|---:|---|---|
| .NET SDK local | 10.0.300 | `dotnet --version` | Compilación local |
| .NET runtime local | 9.0.16 | `dotnet --list-runtimes` | Ejecución local del proyecto |
| ASP.NET Core shared framework | 9.0.16 | `dotnet --list-runtimes` | MVC, middleware, autenticación base |
| ASP.NET Core MVC | 9.x (shared framework) | `Microsoft.NET.Sdk.Web` + `AddControllersWithViews()` | Web app MVC con Razor |
| Entity Framework Core | 9.0.15 | NuGet | Acceso a datos ORM |
| SQL Server provider para EF Core | 9.0.15 | NuGet | Persistencia en SQL Server |
| JWT Bearer Authentication | 9.0.15 | NuGet | Tokens JWT para APIs |
| Cookie Authentication | Compartido con ASP.NET Core 9 | Shared framework | Sesiones web |
| SQL Server LocalDB | No fijada en repo | `appsettings.json` | Base de datos local por defecto en Windows |
| SQL Server contenedor | `2022-latest` | `docker-compose.yml` | Base de datos para desarrollo vía Docker |
| Docker Compose | `3.9` | `docker-compose.yml` | Orquestación local |
| Docker SDK image | `mcr.microsoft.com/dotnet/sdk:9.0` | `Dockerfile` | Build en contenedor |
| Docker ASP.NET runtime image | `mcr.microsoft.com/dotnet/aspnet:9.0` | `Dockerfile` | Runtime en contenedor |

## 4. Paquetes NuGet directos instalados

Todos los paquetes directos se restauran desde `https://api.nuget.org/v3/index.json`, según los archivos `.nupkg.metadata` de la caché global de NuGet.

| Paquete | Versión | Origen | Propósito | Dependencias asociadas |
|---|---:|---|---|---|
| `BCrypt.Net-Next` | 4.2.0 | `nuget.org` | Hash y verificación de contraseñas; se usa en `Services/AuthService.cs` | Ninguna |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 9.0.15 | `nuget.org` | Validación de JWT y autenticación para endpoints/API | `Microsoft.IdentityModel.Protocols.OpenIdConnect 8.0.1` |
| `Microsoft.EntityFrameworkCore.Design` | 9.0.15 | `nuget.org` | Herramientas de diseño/scaffolding y soporte de tiempo de diseño para EF Core | Roslyn, MSBuild, `Microsoft.EntityFrameworkCore.Relational`, `Mono.TextTemplating`, `System.Text.Json` |
| `Microsoft.EntityFrameworkCore.SqlServer` | 9.0.15 | `nuget.org` | Proveedor EF Core para SQL Server | `Microsoft.Data.SqlClient 5.1.6`, `Microsoft.EntityFrameworkCore.Relational 9.0.15`, `Microsoft.Extensions.*`, `System.Formats.Asn1 9.0.15`, `System.Text.Json 9.0.15` |
| `Microsoft.EntityFrameworkCore.Tools` | 9.0.15 | `nuget.org` | CLI y herramientas de migración/gestión EF Core | `Microsoft.EntityFrameworkCore.Design 9.0.15` |

## 5. Inventario completo de paquetes NuGet resueltos

### 5.1 Seguridad, identidad y autenticación

| Paquete | Versión | Origen | Propósito | Dependencias asociadas |
|---|---:|---|---|---|
| `BCrypt.Net-Next` | 4.2.0 | `nuget.org` | Hash de contraseñas | Ninguna |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 9.0.15 | `nuget.org` | Autenticación JWT | `Microsoft.IdentityModel.Protocols.OpenIdConnect` |
| `Microsoft.Identity.Client` | 4.61.3 | `nuget.org` | Cliente de identidad de Microsoft; llega transitivamente por `SqlClient`/`Azure.Identity` | `Microsoft.IdentityModel.Abstractions`, `System.Diagnostics.DiagnosticSource` |
| `Microsoft.Identity.Client.Extensions.Msal` | 4.61.3 | `nuget.org` | Extensiones de caché/token para MSAL | `Microsoft.Identity.Client`, `System.Security.Cryptography.ProtectedData` |
| `Microsoft.IdentityModel.Abstractions` | 8.0.1 | `nuget.org` | Abstracciones de identidad y tokens | Ninguna |
| `Microsoft.IdentityModel.JsonWebTokens` | 8.0.1 | `nuget.org` | Manejo de JWT | `Microsoft.IdentityModel.Tokens` |
| `Microsoft.IdentityModel.Logging` | 8.0.1 | `nuget.org` | Logging del stack de identidad | `Microsoft.IdentityModel.Abstractions` |
| `Microsoft.IdentityModel.Protocols` | 8.0.1 | `nuget.org` | Protocolos de identidad | `Microsoft.IdentityModel.Tokens` |
| `Microsoft.IdentityModel.Protocols.OpenIdConnect` | 8.0.1 | `nuget.org` | OpenID Connect para JwtBearer | `Microsoft.IdentityModel.Protocols`, `System.IdentityModel.Tokens.Jwt` |
| `Microsoft.IdentityModel.Tokens` | 8.0.1 | `nuget.org` | Validación y firma de tokens | `Microsoft.IdentityModel.Logging` |
| `System.IdentityModel.Tokens.Jwt` | 8.0.1 | `nuget.org` | Parseo y emisión de JWT | `Microsoft.IdentityModel.JsonWebTokens`, `Microsoft.IdentityModel.Tokens` |
| `System.Security.Cryptography.Cng` | 5.0.0 | `nuget.org` | Criptografía Windows CNG | `System.Formats.Asn1` |
| `System.Security.Cryptography.ProtectedData` | 6.0.0 | `nuget.org` | Protección de secretos en Windows | Ninguna |
| `System.Security.Principal.Windows` | 5.0.0 | `nuget.org` | Integración con identidades Windows | Ninguna |

### 5.2 Datos, ORM y acceso a SQL Server

| Paquete | Versión | Origen | Propósito | Dependencias asociadas |
|---|---:|---|---|---|
| `Microsoft.Data.SqlClient` | 5.1.6 | `nuget.org` | Driver SQL Server para .NET | `Azure.Identity`, `Microsoft.Data.SqlClient.SNI.runtime`, `Microsoft.Identity.Client`, `Microsoft.SqlServer.Server`, `System.Configuration.ConfigurationManager`, `System.Runtime.Caching`, `System.Text.Encoding.CodePages`, `System.Text.Encodings.Web` |
| `Microsoft.Data.SqlClient.SNI.runtime` | 5.1.1 | `nuget.org` | Capa nativa SNI para `SqlClient` | Ninguna |
| `Microsoft.EntityFrameworkCore` | 9.0.15 | `nuget.org` | Núcleo ORM EF Core | `Microsoft.EntityFrameworkCore.Abstractions`, `Microsoft.EntityFrameworkCore.Analyzers`, `Microsoft.Extensions.Caching.Memory`, `Microsoft.Extensions.Logging` |
| `Microsoft.EntityFrameworkCore.Abstractions` | 9.0.15 | `nuget.org` | Contratos base de EF Core | Ninguna |
| `Microsoft.EntityFrameworkCore.Analyzers` | 9.0.15 | `nuget.org` | Analizadores de EF Core | Ninguna |
| `Microsoft.EntityFrameworkCore.Design` | 9.0.15 | `nuget.org` | Soporte de diseño para EF | Roslyn, MSBuild, `Microsoft.EntityFrameworkCore.Relational`, `Mono.TextTemplating` |
| `Microsoft.EntityFrameworkCore.Relational` | 9.0.15 | `nuget.org` | Capa relacional EF Core | `Microsoft.EntityFrameworkCore`, `Microsoft.Extensions.Caching.Memory`, `Microsoft.Extensions.Configuration.Abstractions`, `Microsoft.Extensions.Logging` |
| `Microsoft.EntityFrameworkCore.SqlServer` | 9.0.15 | `nuget.org` | Proveedor SQL Server EF Core | `Microsoft.Data.SqlClient`, `Microsoft.EntityFrameworkCore.Relational`, `Microsoft.Extensions.*`, `System.Formats.Asn1`, `System.Text.Json` |
| `Microsoft.EntityFrameworkCore.Tools` | 9.0.15 | `nuget.org` | Herramientas EF Core | `Microsoft.EntityFrameworkCore.Design` |
| `Microsoft.SqlServer.Server` | 1.0.0 | `nuget.org` | Tipos auxiliares para SQL Server | Ninguna |
| `System.Configuration.ConfigurationManager` | 6.0.1 | `nuget.org` | Acceso a configuración tradicional .NET en dependencias de SQL | `System.Security.Cryptography.ProtectedData`, `System.Security.Permissions` |
| `System.Runtime.Caching` | 6.0.0 | `nuget.org` | Caché clásica usada por dependencias de SQL/Identity | `System.Configuration.ConfigurationManager` |
| `System.Text.Encoding.CodePages` | 6.0.0 | `nuget.org` | Code pages para compatibilidad | `System.Runtime.CompilerServices.Unsafe` |

### 5.3 Azure y clientes auxiliares transitivos

| Paquete | Versión | Origen | Propósito | Dependencias asociadas |
|---|---:|---|---|---|
| `Azure.Core` | 1.38.0 | `nuget.org` | Infraestructura común Azure; llega por `SqlClient` | `Microsoft.Bcl.AsyncInterfaces`, `System.ClientModel`, `System.Diagnostics.DiagnosticSource`, `System.Memory.Data`, `System.Numerics.Vectors`, `System.Text.Encodings.Web`, `System.Text.Json`, `System.Threading.Tasks.Extensions` |
| `Azure.Identity` | 1.11.4 | `nuget.org` | Autenticación Azure; transitiva de `SqlClient` | `Azure.Core`, `Microsoft.Identity.Client`, `Microsoft.Identity.Client.Extensions.Msal`, `System.Memory`, `System.Security.Cryptography.ProtectedData`, `System.Text.Json`, `System.Threading.Tasks.Extensions` |
| `System.ClientModel` | 1.0.0 | `nuget.org` | Base de clientes modernos .NET/Azure | `System.Memory.Data`, `System.Text.Json` |
| `System.Memory.Data` | 1.0.2 | `nuget.org` | Tipos auxiliares para buffers y payloads | `System.Text.Encodings.Web`, `System.Text.Json` |
| `System.Numerics.Vectors` | 4.5.0 | `nuget.org` | Vectores numéricos usados transitivamente | Ninguna |
| `System.Memory` | 4.5.4 | `nuget.org` | Tipos `Memory<T>` y `Span<T>` auxiliares | Ninguna |
| `System.Threading.Tasks.Extensions` | 4.5.4 | `nuget.org` | Extensiones async antiguas para compatibilidad | Ninguna |

### 5.4 Build, diseño, Roslyn y scaffolding

| Paquete | Versión | Origen | Propósito | Dependencias asociadas |
|---|---:|---|---|---|
| `Humanizer.Core` | 2.14.1 | `nuget.org` | Utilidades textuales usadas por herramientas de diseño | Ninguna |
| `Microsoft.Bcl.AsyncInterfaces` | 7.0.0 | `nuget.org` | Compatibilidad async para tooling | Ninguna |
| `Microsoft.Build.Framework` | 17.8.43 | `nuget.org` | Contratos MSBuild para herramientas EF/Roslyn | Ninguna |
| `Microsoft.Build.Locator` | 1.7.8 | `nuget.org` | Descubrimiento de MSBuild local | Ninguna |
| `Microsoft.CodeAnalysis.Analyzers` | 3.3.4 | `nuget.org` | Analizadores base Roslyn | Ninguna |
| `Microsoft.CodeAnalysis.Common` | 4.8.0 | `nuget.org` | Núcleo Roslyn | `Microsoft.CodeAnalysis.Analyzers`, `System.Collections.Immutable`, `System.Reflection.Metadata`, `System.Runtime.CompilerServices.Unsafe` |
| `Microsoft.CodeAnalysis.CSharp` | 4.8.0 | `nuget.org` | Roslyn para C# | `Microsoft.CodeAnalysis.Common` |
| `Microsoft.CodeAnalysis.CSharp.Workspaces` | 4.8.0 | `nuget.org` | Workspaces Roslyn C# | `Humanizer.Core`, `Microsoft.CodeAnalysis.CSharp`, `Microsoft.CodeAnalysis.Common`, `Microsoft.CodeAnalysis.Workspaces.Common` |
| `Microsoft.CodeAnalysis.Workspaces.Common` | 4.8.0 | `nuget.org` | Base de workspaces Roslyn | `Humanizer.Core`, `Microsoft.Bcl.AsyncInterfaces`, `Microsoft.CodeAnalysis.Common`, `System.Composition`, `System.IO.Pipelines`, `System.Threading.Channels` |
| `Microsoft.CodeAnalysis.Workspaces.MSBuild` | 4.8.0 | `nuget.org` | Integración Roslyn con MSBuild | `Microsoft.Build.Framework`, `Microsoft.CodeAnalysis.Common`, `Microsoft.CodeAnalysis.Workspaces.Common`, `System.Text.Json` |
| `Mono.TextTemplating` | 3.0.0 | `nuget.org` | Plantillas T4/TextTemplating para tooling | `System.CodeDom` |
| `System.CodeDom` | 6.0.0 | `nuget.org` | Generación y modelado de código clásico | Ninguna |
| `System.Collections.Immutable` | 7.0.0 | `nuget.org` | Colecciones inmutables Roslyn | Ninguna |
| `System.Composition` | 7.0.0 | `nuget.org` | MEF/composición para tooling | `System.Composition.AttributedModel`, `System.Composition.Convention`, `System.Composition.Hosting`, `System.Composition.Runtime`, `System.Composition.TypedParts` |
| `System.Composition.AttributedModel` | 7.0.0 | `nuget.org` | Metadatos de composición | Ninguna |
| `System.Composition.Convention` | 7.0.0 | `nuget.org` | Convenciones de composición | `System.Composition.AttributedModel` |
| `System.Composition.Hosting` | 7.0.0 | `nuget.org` | Hosting para composición | `System.Composition.Runtime` |
| `System.Composition.Runtime` | 7.0.0 | `nuget.org` | Runtime de composición | Ninguna |
| `System.Composition.TypedParts` | 7.0.0 | `nuget.org` | Partes tipadas para composición | `System.Composition.AttributedModel`, `System.Composition.Hosting`, `System.Composition.Runtime` |
| `System.IO.Pipelines` | 7.0.0 | `nuget.org` | Pipelines I/O para tooling | Ninguna |
| `System.Reflection.Metadata` | 7.0.0 | `nuget.org` | Metadatos .NET usados por Roslyn | `System.Collections.Immutable` |
| `System.Threading.Channels` | 7.0.0 | `nuget.org` | Canales async para tooling | Ninguna |

### 5.5 Microsoft.Extensions y soporte de infraestructura

| Paquete | Versión | Origen | Propósito | Dependencias asociadas |
|---|---:|---|---|---|
| `Microsoft.Extensions.Caching.Abstractions` | 9.0.15 | `nuget.org` | Contratos de caché | `Microsoft.Extensions.Primitives` |
| `Microsoft.Extensions.Caching.Memory` | 9.0.15 | `nuget.org` | Caché en memoria | `Microsoft.Extensions.Caching.Abstractions`, `Microsoft.Extensions.DependencyInjection.Abstractions`, `Microsoft.Extensions.Logging.Abstractions`, `Microsoft.Extensions.Options`, `Microsoft.Extensions.Primitives` |
| `Microsoft.Extensions.Configuration.Abstractions` | 9.0.15 | `nuget.org` | Contratos de configuración | `Microsoft.Extensions.Primitives` |
| `Microsoft.Extensions.DependencyInjection` | 9.0.15 | `nuget.org` | Contenedor DI | `Microsoft.Extensions.DependencyInjection.Abstractions` |
| `Microsoft.Extensions.DependencyInjection.Abstractions` | 9.0.15 | `nuget.org` | Contratos DI | Ninguna |
| `Microsoft.Extensions.DependencyModel` | 9.0.15 | `nuget.org` | Modelo de dependencias y runtime | Ninguna |
| `Microsoft.Extensions.Logging` | 9.0.15 | `nuget.org` | Logging | `Microsoft.Extensions.DependencyInjection`, `Microsoft.Extensions.Logging.Abstractions`, `Microsoft.Extensions.Options` |
| `Microsoft.Extensions.Logging.Abstractions` | 9.0.15 | `nuget.org` | Contratos de logging | `Microsoft.Extensions.DependencyInjection.Abstractions` |
| `Microsoft.Extensions.Options` | 9.0.15 | `nuget.org` | Patrón Options | `Microsoft.Extensions.DependencyInjection.Abstractions`, `Microsoft.Extensions.Primitives` |
| `Microsoft.Extensions.Primitives` | 9.0.15 | `nuget.org` | Tipos básicos compartidos | Ninguna |
| `System.Diagnostics.DiagnosticSource` | 6.0.1 | `nuget.org` | Instrumentación diagnóstica | `System.Runtime.CompilerServices.Unsafe` |
| `System.Runtime.CompilerServices.Unsafe` | 6.0.0 | `nuget.org` | Helpers de bajo nivel usados por múltiples dependencias | Ninguna |
| `System.Text.Encodings.Web` | 6.0.0 | `nuget.org` | Codificación web segura | `System.Runtime.CompilerServices.Unsafe` |
| `System.Text.Json` | 9.0.15 | `nuget.org` | Serialización JSON | Ninguna |

### 5.6 Compatibilidad Windows / paquetes restaurados desde Visual Studio Offline Packages

| Paquete | Versión | Origen | Propósito | Dependencias asociadas |
|---|---:|---|---|---|
| `Microsoft.Win32.SystemEvents` | 6.0.0 | `Microsoft Visual Studio Offline Packages` | Eventos de sistema Windows | Ninguna |
| `System.Drawing.Common` | 6.0.0 | `Microsoft Visual Studio Offline Packages` | Tipos gráficos Windows/GDI+; no se detectó uso directo en el código del proyecto | `Microsoft.Win32.SystemEvents` |
| `System.Security.AccessControl` | 6.0.0 | `Microsoft Visual Studio Offline Packages` | ACLs Windows | Ninguna |
| `System.Security.Permissions` | 6.0.0 | `Microsoft Visual Studio Offline Packages` | Permisos de seguridad legacy | `System.Security.AccessControl`, `System.Windows.Extensions` |
| `System.Windows.Extensions` | 6.0.0 | `Microsoft Visual Studio Offline Packages` | APIs auxiliares Windows | `System.Drawing.Common` |

### 5.7 Otros paquetes del BCL / compatibilidad transitiva

| Paquete | Versión | Origen | Propósito | Dependencias asociadas |
|---|---:|---|---|---|
| `System.Formats.Asn1` | 9.0.15 | `nuget.org` | ASN.1 para criptografía/certificados | Ninguna |

## 6. Bibliotecas, frameworks y dependencias no gestionadas por NuGet

### 6.1 Frontend incluidas manualmente o vía CDN

| Dependencia | Versión exacta | Origen | Función en el proyecto | Estado |
|---|---:|---|---|---|
| `jQuery` | 3.7.1 | Local en `wwwroot/lib/jquery/dist` | Biblioteca JS general; no se detectaron referencias directas desde vistas `cshtml` | Probable dependencia residual/no usada |
| `Font Awesome` | 6.5.1 | CDNJS | Iconografía en Centro de Ayuda | En uso |
| `Font Awesome` | 6.4.0 | CDNJS | Iconografía en PQR | En uso, pero inconsistente con 6.5.1 |
| `Tailwind CSS` | No fijada explícitamente | `https://cdn.tailwindcss.com` | Utilidades CSS y temas inline en varias vistas | En uso, con versión flotante |
| `Sketchfab Viewer API` | 1.12.1 | `static.sketchfab.com` | Embebido 3D del odontograma | En uso |
| Google Fonts `DM Sans` / `Syne` | No fijada explícitamente | `fonts.googleapis.com` | Tipografías principales de múltiples vistas | En uso |
| Google Fonts `Inter` / `Montserrat` / `Public Sans` / `Roboto` / `Roboto Flex` | No fijada explícitamente | `fonts.googleapis.com` | Tipografías para login, registro, público y ayuda | En uso |
| `Material Symbols Outlined` | No fijada explícitamente | `fonts.googleapis.com` | Iconografía tipo Material | En uso |

### 6.2 Dependencias de infraestructura

| Dependencia | Versión exacta | Origen | Función |
|---|---:|---|---|
| SQL Server contenedor | `2022-latest` | `mcr.microsoft.com/mssql/server` | Base de datos de desarrollo |
| ASP.NET Core runtime container | `9.0` (tag flotante) | `mcr.microsoft.com/dotnet/aspnet` | Runtime de aplicación |
| .NET SDK container | `9.0` (tag flotante) | `mcr.microsoft.com/dotnet/sdk` | Build de aplicación |
| User Secrets / service dependencies | Sin versión aplicable | Visual Studio / .NET tooling | Gestión local de secretos y conexiones |

### 6.3 Dependencias externas de contenido o servicios

No son bibliotecas del framework, pero sí dependencias externas activas:

- Imágenes remotas desde `images.unsplash.com` y `lh3.googleusercontent.com`.
- Enlaces funcionales a `wa.me` (WhatsApp).
- Contenido/recursos remotos de Google Fonts.

## 7. Coherencia y compatibilidad de versiones

### 7.1 Estado general

El núcleo backend es consistente:

- `TargetFramework`: `net9.0`
- `C#`: `13.0`
- `Razor`: `9.0`
- `Entity Framework Core`: `9.0.15`
- `JwtBearer`: `9.0.15`

No se observaron incompatibilidades explícitas de resolución de paquetes en `project.assets.json`.

### 7.2 Desalineaciones detectadas

1. **SDK local vs target del proyecto**
   - SDK local: `10.0.300`
   - Proyecto: `net9.0`
   - Estado: compatible, pero no es un entorno fijado idéntico al target.

2. **Runtime local vs paquetes directos**
   - Runtime ASP.NET Core local: `9.0.16`
   - Paquetes directos `EF Core` / `JwtBearer`: `9.0.15`
   - Estado: compatible, con un pequeño desfase de parche.

3. **Docker con etiquetas flotantes**
   - `mcr.microsoft.com/dotnet/sdk:9.0`
   - `mcr.microsoft.com/dotnet/aspnet:9.0`
   - `mcr.microsoft.com/mssql/server:2022-latest`
   - Estado: funcional, pero no reproducible al 100% entre fechas distintas.

4. **Versiones mixtas de Font Awesome**
   - `6.5.1` y `6.4.0`
   - Estado: no necesariamente rompe, pero complica consistencia visual y depuración.

5. **Tailwind por CDN sin pin de versión**
   - Estado: dependencia externa variable; una actualización del CDN puede cambiar comportamiento sin pasar por control de versiones.

6. **Paquetes transitivos de tooling y compatibilidad en ramas 5.x/6.x/7.x/8.x**
   - Ejemplos: `System.Drawing.Common 6.0.0`, `System.Security.Permissions 6.0.0`, `Microsoft.CodeAnalysis 4.8.0`, `Microsoft.Identity.Client 4.61.3`.
   - Estado: normal en herramientas de diseño y compatibilidad; no se detecta conflicto directo, pero elevan la complejidad del árbol de dependencias.

## 8. Dependencias obsoletas, deuda técnica o que conviene actualizar

### Prioridad alta

1. **Migrar el proyecto fuera de `.NET 9` a una versión vigente y estabilizada**
   - `.NET 9` es una línea `STS`, no `LTS`.
   - Según la política oficial de soporte de Microsoft, `.NET 9` finaliza soporte el `2026-11-10` y la versión más reciente publicada es superior a la usada en este repositorio. Referencia: [Microsoft .NET Support Policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core).

2. **Actualizar paquetes `9.0.15` al último parche disponible de la rama 9**
   - Afecta al menos a:
     - `Microsoft.AspNetCore.Authentication.JwtBearer`
     - `Microsoft.EntityFrameworkCore.Design`
     - `Microsoft.EntityFrameworkCore.SqlServer`
     - `Microsoft.EntityFrameworkCore.Tools`
   - Justificación: cierre de parches de seguridad y alineación con runtime más reciente.

3. **Reactivar o reemplazar la auditoría de dependencias NuGet**
   - `NuGetAudit=false` desactiva la verificación automática de vulnerabilidades.
   - Recomendación: habilitar auditoría o incorporar un escaneo equivalente en CI.

### Prioridad media

4. **Fijar versiones exactas de imágenes Docker**
   - Sustituir etiquetas flotantes por parches concretos, por ejemplo `9.0.x` y una revisión concreta de SQL Server 2022.

5. **Unificar `Font Awesome`**
   - Elegir una sola versión para todo el proyecto.

6. **Versionar o internalizar `Tailwind CSS`**
   - Evitar dependencia directa del CDN sin pin de versión.

7. **Revisar si `jQuery 3.7.1` sigue siendo necesario**
   - Está presente localmente, pero no se hallaron referencias directas desde las vistas.
   - Si no se usa, conviene retirarlo para reducir ruido y mantenimiento.

### Prioridad baja

8. **Revisar paquetes transitivos Windows-only**
   - `System.Drawing.Common`, `System.Windows.Extensions`, `System.Security.Permissions`.
   - Aunque hoy vienen por dependencias transitivas, conviene vigilar su continuidad si el proyecto busca ser más portable o si se actualiza el stack.

9. **Fijar una estrategia uniforme para fuentes y assets remotos**
   - Hoy dependen de Google Fonts, Unsplash y Google-hosted assets.
   - No es un error, pero sí un punto de disponibilidad externa y cumplimiento visual.

## 9. Conclusión

El proyecto presenta una base tecnológica moderna y funcional, con una combinación consistente de `ASP.NET Core MVC + EF Core + SQL Server` sobre `.NET 9`. La principal necesidad no está en corregir conflictos graves actuales, sino en mejorar sostenibilidad y reproducibilidad:

- actualizar el stack `.NET 9.0.15/16` a sus últimos parches o planear migración,
- eliminar dependencias flotantes o no utilizadas,
- normalizar las bibliotecas frontend externas,
- y volver a activar controles de seguridad sobre NuGet.

## 10. Archivos revisados para este informe

- `SmileTrack_MVC.csproj`
- `Program.cs`
- `Data/AppDbContext.cs`
- `Services/AuthService.cs`
- `appsettings.json`
- `Properties/launchSettings.json`
- `Properties/serviceDependencies.json`
- `Properties/serviceDependencies.local.json`
- `docker-compose.yml`
- `Dockerfile`
- `README-BASE-DE-DATOS.md`
- `obj/project.assets.json`
- `wwwroot/lib/jquery/dist/jquery.js`
- múltiples vistas `Views/**/*.cshtml`
- activos estáticos bajo `wwwroot/css`, `wwwroot/js` y `wwwroot/lib`
