# ---- Etapa 1: Construir la aplicación Angular ----
FROM node:18-alpine AS build

# Se define el directorio de trabajo dentro del contenedor
WORKDIR /app

# Se copia solo el package.json para aprovechar el caché de Docker
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Se copia el resto del código
COPY . .

# Se construye la aplicación para producción
RUN npm run build -- --configuration production

# ---- Etapa 2: Servir la app con Nginx ----
FROM nginx:alpine

# Se copia la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Se copian los archivos del build al directorio de Nginx
COPY --from=build /app/dist/analizador-lexico /usr/share/nginx/html

# Se expone el puerto 80
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
