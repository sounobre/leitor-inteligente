# Leitor Inteligente

Aplicativo local para preparar leituras em inglês com vocabulário, expressões idiomáticas, phrasal verbs e revisão offline.

## Estrutura

- `artifacts/leitor-inteligente` — aplicativo web React/Vite;
- `artifacts/leitor-inteligente-mobile` — aplicativo mobile Expo/React Native;
- `artifacts/api-server` — API local Java 21/Spring Boot;
- `lib` — contratos OpenAPI, clientes gerados e banco compartilhado.

## Desenvolvimento

Este projeto usa pnpm no monorepo. A API utiliza PostgreSQL local e o aplicativo mobile utiliza SQLite nativo para revisão offline.