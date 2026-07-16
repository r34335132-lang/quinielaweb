# Quiniela Web (Vercel)
#
# En Vercel:
# 1. New Project → importa este repo
# 2. Root Directory = `web`
# 3. Framework = Next.js
# 4. Environment variables:
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
#
# Local:
#   cd web
#   cp .env.example .env.local
#   pnpm install
#   pnpm dev
#
# Esta carpeta es independiente de la app Expo en la raíz.
# No compartan node_modules ni scripts de build.

## Scripts
- `pnpm dev` — desarrollo en http://localhost:3000
- `pnpm build` — build de producción
- `pnpm start` — servir build

## Rutas
- `/auth` — login / registro
- `/quinielas` — mis quinielas + unirse + crear
- `/quiniela/[id]` — partidos, predicciones 1X2 y ranking
- `/join/[code]` — entrar por link de invitación
- `/admin` — panel (equipos, ligas, resultados, quinielas)

## Modo fácil
Gana / Empate / Pierde → 1 punto por acierto.
Al guardar un resultado final se recalculan las sumas.
