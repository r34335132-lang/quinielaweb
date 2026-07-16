# Quiniela Web (Vercel)

App Next.js **independiente**. En el repo nuevo, el contenido de esta carpeta debe quedar en la **raíz** (no dentro de otra carpeta `web/`).

## Cómo debe verse el repo en GitHub

```
tu-repo/
  app/
  components/
  context/
  lib/
  package.json      ← obligatorio en la raíz
  next.config.ts
  vercel.json
  .env.example
  ...
```

Si copiaste la carpeta entera y quedó así:

```
tu-repo/
  web/          ← mal para Vercel si Root = .
    package.json
```

entonces en Vercel pon **Root Directory = `web`**, o mejor sube solo el contenido interno a la raíz.

## Deploy en Vercel (paso a paso)

1. New Project → importa el repo
2. Framework Preset: **Next.js**
3. Root Directory:
   - Si `package.json` está en la raíz → déjalo vacío / `.`
   - Si está dentro de `web/` → pon `web`
4. Build Command: `npm run build` (o déjalo en auto)
5. Output Directory: **déjalo vacío** (Nunca pongas `.next`)
6. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Deploy

## Local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abre http://localhost:3000

## Rutas

- `/auth` — login / registro
- `/quinielas` — mis quinielas
- `/quiniela/[id]` — predicciones 1X2 + ranking
- `/join/[code]` — entrar por link
- `/admin` — equipos, logos, ligas, resultados
