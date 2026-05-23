# ---- Etapa 1: Construir la aplicación Angular ----
FROM node:18-alpine AS build

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Primero copio solo el package.json para aprovechar el caché de Docker
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copio el resto del código
COPY . .

# Construyo la aplicación para producción
RUN npm run build -- --configuration production

# ---- Etapa 2: Servir la app con Nginx ----
FROM nginx:alpine

# Copio la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copio los archivos del build al directorio de Nginx
COPY --from=build /app/dist/analizador-lexico /usr/share/nginx/html

# Expongo el puerto 80
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
