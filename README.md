# Mediar.fy

Aplicación móvil multiplataforma para la gestión de casos de mediación inmobiliaria.

## Estructura

- `mediarfy-api`: API REST desarrollada con NestJS, Prisma y PostgreSQL.
- `mediarfy-mobile`: aplicación móvil desarrollada con React Native y Expo.
- `infrastructure`: configuración local de PostgreSQL y otros servicios.
- `documentation`: documentación técnica y funcional.

## Tecnologías

### Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT
- Swagger

### Aplicación móvil

- React Native
- Expo
- Expo Router
- TypeScript
- Axios
- Zustand
- SecureStore

## Requisitos

- Node.js
- npm
- PostgreSQL o Docker Desktop
- Expo Go

## Configuración

Cada proyecto contiene un archivo `.env.example`.

Copia el archivo correspondiente:

```bash
cp .env.example .env