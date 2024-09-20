# Etapa 1: Construcción
FROM node:18-alpine AS builder

# Establecer el directorio de trabajo
WORKDIR /src

# Copiar los archivos de dependencias
COPY package*.json ./

# Instalar dependencias de desarrollo y producción
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa 2: Imagen de producción
FROM node:18-alpine

# Establecer el directorio de trabajo
WORKDIR /src

# Copiar las dependencias de producción desde el builder
COPY --from=builder /src/package*.json ./
COPY --from=builder /src/node_modules ./node_modules

# Copiar el código compilado
COPY --from=builder /src/dist ./dist

# Exponer el puerto (ajústalo si tu aplicación usa otro puerto)
EXPOSE 5000

# Establecer NODE_ENV a 'production'
ENV NODE_ENV=production

# Usar un usuario no root
USER node

# Comando para iniciar la aplicación
CMD ["node", "dist/server.js"]