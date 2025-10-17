# 🧭 Guía Cronológica de Despliegue GCP (API + Frontend)

## 📋 Contexto del Proyecto

- **Backend**: api-guideTypescript (Express + TypeScript, JWT, Swagger)
- **Frontend**: Vegan-Guide-Platform (Next.js 15 + App Router, NextAuth, PWA)
- **Objetivo**: Despliegue en Cloud Run con presupuesto controlado (~$50 USD/mes)
- **Estrategia**: Escala a cero, Artifact Registry, Secret Manager, GitHub Actions

---

## 📅 Cronología de Implementación

### 🔍 **Día 0 - Auditoría y Preparación**

#### ✅ **API (Express) - Verificaciones**
- [x] Puerto dinámico: `process.env.PORT ?? 5001` ✓
- [x] Variables mínimas identificadas:
  ```env
  MONGODB_URI=mongodb://localhost:27017/vegan-city-guide
  JWT_SECRET=your-jwt-secret-key
  JWT_EXPIRE=30d
  FRONTEND_URL=http://localhost:3000
  EMAIL_USER=your-email@gmail.com
  EMAIL_PASS=your-email-password
  BCRYPT_SALT_ROUNDS=10
  GOOGLE_MAPS_API_KEY=your-google-maps-api-key
  ```
- [x] Base path: `/api/v1` ✓
- [x] Swagger: `/api-docs` ✓

#### ✅ **Frontend (Next.js 15) - Verificaciones**
- [x] App Router implementado ✓
- [x] NextAuth configurado ✓
- [x] Variables requeridas:
  ```env
  NEXT_PUBLIC_API_URL=https://api-service-url/api/v1
  NEXTAUTH_URL=https://your-domain.com
  NEXTAUTH_SECRET=your-nextauth-secret
  ```
- [ ] **PENDIENTE**: Agregar `output: 'standalone'` en `next.config.ts`

#### 💰 **Decisiones de Costo**
- **Cloud Run**: Escala a cero (facturación por uso)
- **Estimado mensual**: $30-50 USD con tráfico moderado
- **Cold starts**: ~2-3 segundos (acceptable para MVP)

---

### 🛠️ **Día 1 - Configuración GCP**

#### **1.1 Habilitar APIs necesarias**
```bash
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com
```

#### **1.2 Crear Artifact Registry**
```bash
# Crear repositorio Docker
gcloud artifacts repositories create containers \
    --repository-format=docker \
    --location=us-central1 \
    --description="Container images for API and Frontend"
```

#### **1.3 Configurar autenticación**
```bash
# Configurar Docker para Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

#### **1.4 (Opcional) Terraform - Infra como Código**
```hcl
# providers.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# main.tf
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

resource "google_artifact_registry_repository" "containers" {
  repository_id = "containers"
  location      = var.region
  format        = "DOCKER"
  description   = "Container registry for API and Frontend"
}
```

---

### 🔐 **Día 2 - Secret Manager**

#### **2.1 Crear secretos para API**
```bash
# Secretos de la API
echo -n "mongodb://your-connection-string" | gcloud secrets create MONGODB_URI --data-file=-
echo -n "your-super-secure-jwt-secret" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "30d" | gcloud secrets create JWT_EXPIRE --data-file=-
echo -n "https://your-frontend-domain.com" | gcloud secrets create FRONTEND_URL --data-file=-
echo -n "your-email@gmail.com" | gcloud secrets create EMAIL_USER --data-file=-
echo -n "your-email-password" | gcloud secrets create EMAIL_PASS --data-file=-
echo -n "10" | gcloud secrets create BCRYPT_SALT_ROUNDS --data-file=-
echo -n "your-google-maps-api-key" | gcloud secrets create GOOGLE_MAPS_API_KEY --data-file=-
```

#### **2.2 Crear secretos para Frontend**
```bash
# Secretos del Frontend
echo -n "https://api-service-url/api/v1" | gcloud secrets create NEXT_PUBLIC_API_URL --data-file=-
echo -n "https://your-domain.com" | gcloud secrets create NEXTAUTH_URL --data-file=-
echo -n "your-nextauth-secret-key" | gcloud secrets create NEXTAUTH_SECRET --data-file=-
```

#### **2.3 Terraform para secretos**
```hcl
# secrets.tf
resource "google_secret_manager_secret" "api_secrets" {
  for_each = toset([
    "MONGODB_URI",
    "JWT_SECRET",
    "JWT_EXPIRE",
    "FRONTEND_URL",
    "EMAIL_USER",
    "EMAIL_PASS",
    "BCRYPT_SALT_ROUNDS",
    "GOOGLE_MAPS_API_KEY"
  ])

  secret_id = each.key

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}
```

---

### 🐳 **Día 3 - Optimización Docker**

#### **3.1 Dockerfile API (MEJORADO)**

**📁 Ubicación**: `/api-guideTypescript/Dockerfile`

```dockerfile
# Multi-stage build optimizado para Cloud Run
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Etapa de build
FROM node:20-alpine AS build
WORKDIR /app

# Instalar dependencias completas para build
COPY package*.json ./
RUN npm ci

# Copiar código fuente y configuración
COPY tsconfig.json ./
COPY src ./src
COPY swagger.yaml ./

# Build de la aplicación
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS runner
WORKDIR /app

# Variables de entorno para Cloud Run
ENV NODE_ENV=production
ENV PORT=8080

## Swagger UI en producción (opcional)

Para habilitar la documentación en Cloud Run en la ruta `/api-docs`, configura estas variables de entorno en el servicio:

- `ENABLE_SWAGGER_UI=true`
- Opcional (recomendado): proteger con Basic Auth
  - `SWAGGER_AUTH_USER=admin`
  - `SWAGGER_AUTH_PASS=una-contraseña-segura`

Cuando `ENABLE_SWAGGER_UI` está activo en producción y existen `SWAGGER_AUTH_USER` y `SWAGGER_AUTH_PASS`, el endpoint `/api-docs` solicita credenciales Basic Auth. En desarrollo no se requiere configuración.

### Comandos `gcloud` de ejemplo (tu servicio)

Habilitar y proteger `/api-docs`:

```bash
gcloud run services update api-guidetypescript \
  --region=europe-west1 \
  --set-env-vars ENABLE_SWAGGER_UI=true,SWAGGER_AUTH_USER=admin,SWAGGER_AUTH_PASS='cambia-esta-contraseña'
```

Deshabilitar `/api-docs`:

```bash
gcloud run services update api-guidetypescript \
  --region=europe-west1 \
  --set-env-vars ENABLE_SWAGGER_UI=false,SWAGGER_AUTH_USER=,SWAGGER_AUTH_PASS=
```

Verificación rápida:

```bash
curl -I https://api-guidetypescript-787324382752.europe-west1.run.app/api-docs        # 401
curl -u admin:'cambia-esta-contraseña' -I https://api-guidetypescript-787324382752.europe-west1.run.app/api-docs  # 200
```

# Crear usuario no-root para seguridad
RUN addgroup -S nodejs && adduser -S node -G nodejs

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules

# Copiar aplicación construida
COPY --from=build --chown=node:nodejs /app/dist ./dist
COPY --from=build --chown=node:nodejs /app/swagger.yaml ./

# Cambiar a usuario no-root
USER node

# Exponer puerto de Cloud Run
EXPOSE 8080

# Comando de inicio
CMD ["node", "dist/server.js"]
```

#### **3.2 Dockerfile Frontend (NUEVO)**

**📁 Ubicación**: `/Vegan-Guide-Platform/Dockerfile`

```dockerfile
# Multi-stage build para Next.js con standalone
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Etapa de build
FROM node:20-alpine AS build
WORKDIR /app

# Copiar dependencias y código
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de build time (si es necesario)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build con output standalone
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Usuario no-root
RUN addgroup -S nodejs && adduser -S node -G nodejs
USER node

# Copiar output standalone de Next.js
COPY --from=build --chown=node:nodejs /app/.next/standalone ./
COPY --from=build --chown=node:nodejs /app/public ./public
COPY --from=build --chown=node:nodejs /app/.next/static ./.next/static

EXPOSE 8080

CMD ["node", "server.js"]
```

#### **3.3 Configuración Next.js (CRÍTICO)**

**📁 Archivo**: `/Vegan-Guide-Platform/next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // CRÍTICO: Habilitar standalone para Cloud Run
  output: 'standalone',
  
  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Optimizaciones PWA
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },
};

export default nextConfig;
```

---

### ☁️ **Día 4 - Despliegue Cloud Run**

#### **4.1 Deploy API Service**

```bash
# Build y push imagen API
export PROJECT_ID="your-project-id"
export GAR_LOCATION="us-central1"
export IMAGE_TAG="v1.0.0"

# Build
docker build -t $GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/containers/api:$IMAGE_TAG \
    ./api-guideTypescript/

# Push
docker push $GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/containers/api:$IMAGE_TAG

# Deploy a Cloud Run
gcloud run deploy api \
    --image $GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/containers/api:$IMAGE_TAG \
    --region $GAR_LOCATION \
    --allow-unauthenticated \
    --cpu 1 \
    --memory 512Mi \
    --min-instances 0 \
    --max-instances 5 \
    --set-env-vars NODE_ENV=production \
    --set-secrets MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest,JWT_EXPIRE=JWT_EXPIRE:latest,FRONTEND_URL=FRONTEND_URL:latest,EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest,BCRYPT_SALT_ROUNDS=BCRYPT_SALT_ROUNDS:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest
```

#### **4.2 Deploy Frontend Service**

```bash
# Build y push imagen Frontend
docker build -t $GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/containers/web:$IMAGE_TAG \
    ./Vegan-Guide-Platform/

docker push $GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/containers/web:$IMAGE_TAG

# Deploy Frontend
gcloud run deploy web \
    --image $GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/containers/web:$IMAGE_TAG \
    --region $GAR_LOCATION \
    --allow-unauthenticated \
    --cpu 0.5 \
    --memory 512Mi \
    --min-instances 0 \
    --max-instances 3 \
    --set-env-vars NODE_ENV=production \
    --set-secrets NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,NEXTAUTH_URL=NEXTAUTH_URL:latest,NEXT_PUBLIC_API_URL=NEXT_PUBLIC_API_URL:latest
```

#### **4.3 Terraform - Cloud Run Services**

```hcl
# cloud-run.tf
resource "google_cloud_run_v2_service" "api" {
  name     = "api"
  location = var.region

  template {
    service_account = google_service_account.runtime.email
    
    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/containers/api:latest"
      
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      # Secretos como variables de entorno
      dynamic "env" {
        for_each = [
          "MONGODB_URI",
          "JWT_SECRET", 
          "JWT_EXPIRE",
          "FRONTEND_URL",
          "EMAIL_USER",
          "EMAIL_PASS",
          "BCRYPT_SALT_ROUNDS",
          "GOOGLE_MAPS_API_KEY"
        ]
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.api_secrets[env.value].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"
}

resource "google_cloud_run_v2_service" "web" {
  name     = "web"
  location = var.region

  template {
    service_account = google_service_account.runtime.email
    
    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/containers/web:latest"
      
      resources {
        limits = {
          cpu    = "0.5"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name = "NEXT_PUBLIC_API_URL"
        value = "${google_cloud_run_v2_service.api.uri}/api/v1"
      }

      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.web_secrets["NEXTAUTH_SECRET"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "NEXTAUTH_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.web_secrets["NEXTAUTH_URL"].secret_id
            version = "latest"
          }
        }
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"
}

# Service Account para runtime
resource "google_service_account" "runtime" {
  account_id   = "cloud-run-runtime"
  display_name = "Cloud Run Runtime Service Account"
}

# Permisos para acceder a secretos
resource "google_secret_manager_secret_iam_member" "api_secrets_access" {
  for_each = toset([
    "MONGODB_URI",
    "JWT_SECRET",
    "JWT_EXPIRE", 
    "FRONTEND_URL",
    "EMAIL_USER",
    "EMAIL_PASS",
    "BCRYPT_SALT_ROUNDS",
    "GOOGLE_MAPS_API_KEY"
  ])

  secret_id = google_secret_manager_secret.api_secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}
```

---

### 🔄 **Día 5 - CI/CD con GitHub Actions**

#### **5.1 Configurar Workload Identity Federation**

```bash
# Crear Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
    --location="global" \
    --description="Pool para GitHub Actions"

# Crear Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
    --workload-identity-pool="github-pool" \
    --location="global" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository"

# Service Account para deployment
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions Deploy"

# Permisos para el service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

# Bind WIF con repository
gcloud iam service-accounts add-iam-policy-binding \
    "github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/EdieAprovita/api-guideTypescript"
```

#### **5.2 GitHub Actions - API Workflow**

**📁 Archivo**: `/api-guideTypescript/.github/workflows/deploy-api.yml`

```yaml
name: Deploy API to Cloud Run

on:
  push:
    branches: [ "main" ]
    paths: 
      - "src/**"
      - "package*.json"
      - "tsconfig.json"
      - "Dockerfile"
      - ".github/workflows/deploy-api.yml"
  
  workflow_dispatch:

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  SERVICE_NAME: api
  REGISTRY: us-central1-docker.pkg.dev

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker ${{ env.REGISTRY }} --quiet

      - name: Build Docker image
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:${{ github.sha }} .
          docker build -t ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:latest .

      - name: Push Docker image
        run: |
          docker push ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --image ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:${{ github.sha }} \
            --region ${{ env.REGION }} \
            --allow-unauthenticated \
            --cpu 1 \
            --memory 512Mi \
            --min-instances 0 \
            --max-instances 5 \
            --set-env-vars NODE_ENV=production \
            --set-secrets MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest,JWT_EXPIRE=JWT_EXPIRE:latest,FRONTEND_URL=FRONTEND_URL:latest,EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest,BCRYPT_SALT_ROUNDS=BCRYPT_SALT_ROUNDS:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest

      - name: Show service URL
        run: |
          echo "Service deployed at:"
          gcloud run services describe ${{ env.SERVICE_NAME }} --region=${{ env.REGION }} --format='value(status.url)'
```

#### **5.3 GitHub Actions - Frontend Workflow**

**📁 Archivo**: `/Vegan-Guide-Platform/.github/workflows/deploy-web.yml`

```yaml
name: Deploy Frontend to Cloud Run

on:
  push:
    branches: [ "main" ]
    paths:
      - "src/**"
      - "app/**"
      - "components/**"
      - "lib/**"
      - "package*.json"
      - "next.config.ts"
      - "Dockerfile"
      - ".github/workflows/deploy-web.yml"
  
  workflow_dispatch:

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  SERVICE_NAME: web
  REGISTRY: us-central1-docker.pkg.dev

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker ${{ env.REGISTRY }} --quiet

      - name: Build Docker image
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:${{ github.sha }} .
          docker build -t ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:latest .

      - name: Push Docker image
        run: |
          docker push ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --image ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/containers/${{ env.SERVICE_NAME }}:${{ github.sha }} \
            --region ${{ env.REGION }} \
            --allow-unauthenticated \
            --cpu 0.5 \
            --memory 512Mi \
            --min-instances 0 \
            --max-instances 3 \
            --set-env-vars NODE_ENV=production \
            --set-secrets NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,NEXTAUTH_URL=NEXTAUTH_URL:latest,NEXT_PUBLIC_API_URL=NEXT_PUBLIC_API_URL:latest

      - name: Show service URL
        run: |
          echo "Frontend deployed at:"
          gcloud run services describe ${{ env.SERVICE_NAME }} --region=${{ env.REGION }} --format='value(status.url)'
```

#### **5.4 Secretos de Repository requeridos**

**Para ambos repositorios**:
```
GCP_PROJECT_ID=your-project-id
WIF_PROVIDER=projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider
WIF_SERVICE_ACCOUNT=github-actions@PROJECT_ID.iam.gserviceaccount.com
```

---

### 🌐 **Día 6 - Dominio y HTTPS**

#### **6.1 Opción Recomendada: Load Balancer + NEG**

```bash
# Crear certificado SSL gestionado
gcloud compute ssl-certificates create vegan-guide-ssl \
    --domains=api.yourdomain.com,yourdomain.com

# Crear NEG para API
gcloud compute network-endpoint-groups create api-neg \
    --region=us-central1 \
    --network-endpoint-type=serverless \
    --cloud-run-service=api

# Crear NEG para Frontend
gcloud compute network-endpoint-groups create web-neg \
    --region=us-central1 \
    --network-endpoint-type=serverless \
    --cloud-run-service=web

# Backend services
gcloud compute backend-services create api-backend \
    --global

gcloud compute backend-services create web-backend \
    --global

gcloud compute backend-services add-backend api-backend \
    --global \
    --network-endpoint-group=api-neg \
    --network-endpoint-group-region=us-central1

gcloud compute backend-services add-backend web-backend \
    --global \
    --network-endpoint-group=web-neg \
    --network-endpoint-group-region=us-central1

# URL Map
gcloud compute url-maps create vegan-guide-map \
    --default-service web-backend

gcloud compute url-maps add-path-matcher vegan-guide-map \
    --path-matcher-name=api-matcher \
    --default-service=api-backend \
    --path-rules="/api/*=api-backend"

# HTTPS Proxy
gcloud compute target-https-proxies create vegan-guide-https-proxy \
    --ssl-certificates=vegan-guide-ssl \
    --url-map=vegan-guide-map

# Global forwarding rule
gcloud compute forwarding-rules create vegan-guide-https-forwarding-rule \
    --global \
    --target-https-proxy=vegan-guide-https-proxy \
    --ports=443
```

#### **6.2 Terraform - Load Balancer**

```hcl
# load-balancer.tf
resource "google_compute_managed_ssl_certificate" "default" {
  name = "vegan-guide-ssl"

  managed {
    domains = ["yourdomain.com", "api.yourdomain.com"]
  }
}

resource "google_compute_global_forwarding_rule" "https" {
  name       = "vegan-guide-https-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}

resource "google_compute_target_https_proxy" "default" {
  name    = "vegan-guide-https-proxy"
  url_map = google_compute_url_map.default.id
  ssl_certificates = [
    google_compute_managed_ssl_certificate.default.id,
  ]
}

resource "google_compute_url_map" "default" {
  name            = "vegan-guide-map"
  default_service = google_compute_backend_service.web.id

  host_rule {
    hosts        = ["api.yourdomain.com"]
    path_matcher = "api"
  }

  path_matcher {
    name            = "api"
    default_service = google_compute_backend_service.api.id

    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.api.id
    }
  }
}

resource "google_compute_backend_service" "api" {
  name = "api-backend"

  backend {
    group = google_compute_region_network_endpoint_group.api.id
  }
}

resource "google_compute_backend_service" "web" {
  name = "web-backend"

  backend {
    group = google_compute_region_network_endpoint_group.web.id
  }
}

resource "google_compute_region_network_endpoint_group" "api" {
  name                  = "api-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_v2_service.api.name
  }
}

resource "google_compute_region_network_endpoint_group" "web" {
  name                  = "web-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_v2_service.web.name
  }
}
```

---

### 🔗 **Día 7 - Conexión API ↔ Frontend**

#### **7.1 Actualizar variables de entorno**

Después del despliegue inicial, obtener URLs y actualizar secretos:

```bash
# Obtener URL de la API
API_URL=$(gcloud run services describe api --region=us-central1 --format='value(status.url)')
echo "API URL: $API_URL"

# Actualizar secreto del frontend
echo -n "$API_URL/api/v1" | gcloud secrets versions add NEXT_PUBLIC_API_URL --data-file=-

# Obtener URL del frontend y actualizar API
FRONTEND_URL=$(gcloud run services describe web --region=us-central1 --format='value(status.url)')
echo -n "$FRONTEND_URL" | gcloud secrets versions add FRONTEND_URL --data-file=-

# Con dominio custom (después de configurar Load Balancer)
echo -n "https://yourdomain.com" | gcloud secrets versions add NEXTAUTH_URL --data-file=-
echo -n "https://yourdomain.com" | gcloud secrets versions add FRONTEND_URL --data-file=-
```

#### **7.2 CORS Configuration**

Verificar CORS en la API (`src/app.ts`):

```typescript
// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
    credentials: true,
    optionsSuccessStatus: 200
}));
```

#### **7.3 Redespliegue con URLs correctas**

```bash
# Redesplegar API con nueva FRONTEND_URL
gcloud run deploy api --region=us-central1

# Redesplegar Frontend con nueva API URL
gcloud run deploy web --region=us-central1
```

---

### 📊 **Día 8 - Monitoreo y Seguridad**

#### **8.1 Configurar Alertas**

```bash
# Crear política de alerta para errores 5xx
gcloud alpha monitoring policies create --policy-from-file=- <<EOF
displayName: "Cloud Run 5xx Errors"
conditions:
  - displayName: "High error rate"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 5
      duration: 300s
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_RATE
          crossSeriesReducer: REDUCE_SUM
notificationChannels:
  - projects/$PROJECT_ID/notificationChannels/YOUR_NOTIFICATION_CHANNEL
EOF
```

#### **8.2 Health Checks**

**API Health Check** (`src/routes/health.ts`):
```typescript
import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

export default router;
```

**Frontend Health Check** (`app/health/route.ts`):
```typescript
export async function GET() {
    return Response.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
}
```

#### **8.3 Logging Configuration**

**API Logging** (`src/middleware/logger.ts`):
```typescript
import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Google Cloud Logging in production
if (process.env.NODE_ENV === 'production') {
    const { LoggingWinston } = require('@google-cloud/logging-winston');
    logger.add(new LoggingWinston());
}

export default logger;
```

---

### ⚡ **Día 9 - Optimización y Performance**

#### **9.1 Configuración de CPU/Memory**

```bash
# Optimizar recursos según métricas
gcloud run services update api \
    --region=us-central1 \
    --cpu=1 \
    --memory=1Gi \
    --concurrency=100

gcloud run services update web \
    --region=us-central1 \
    --cpu=1 \
    --memory=512Mi \
    --concurrency=80
```

#### **9.2 Database Connection Pooling**

**MongoDB Connection** (`src/config/database.ts`):
```typescript
import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const options = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false, // Disable mongoose buffering
            bufferMaxEntries: 0, // Disable mongoose buffering
            // Connection pool options for Cloud Run
            ...(process.env.NODE_ENV === 'production' && {
                maxPoolSize: 5,
                minPoolSize: 1,
                maxIdleTimeMS: 30000,
            })
        };

        await mongoose.connect(process.env.MONGODB_URI!, options);
        console.log('MongoDB Connected Successfully');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

export default connectDB;
```

#### **9.3 Next.js Performance**

**Image Optimization** (`next.config.ts`):
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Enable compression
  compress: true,

  // Experimental features
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
    ],
    // Enable partial prerendering for better performance
    ppr: true,
  },

  // Bundle analyzer in development
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(new (require('@next/bundle-analyzer'))());
      return config;
    },
  }),
};
```

#### **9.4 CDN Configuration (Opcional)**

```bash
# Crear bucket para assets estáticos
gsutil mb -l us-central1 gs://your-project-static-assets

# Configurar CDN con Cloud Storage
gcloud compute backend-buckets create static-backend \
    --gcs-bucket-name=your-project-static-assets

# Agregar regla al URL Map para assets
gcloud compute url-maps add-path-matcher vegan-guide-map \
    --path-matcher-name=static-matcher \
    --default-service=static-backend \
    --path-rules="/static/*=static-backend,/_next/static/*=static-backend"
```

---

### ✅ **Día 10 - Testing y Validación Final**

#### **10.1 Smoke Tests**

**API Testing Script** (`scripts/smoke-test-api.sh`):
```bash
#!/bin/bash

API_URL="https://api.yourdomain.com"

echo "🧪 Testing API endpoints..."

# Health check
echo "Testing health endpoint..."
curl -f "$API_URL/health" || exit 1

# API Documentation
echo "Testing Swagger docs..."
curl -f "$API_URL/api-docs" || exit 1

# Authentication test
echo "Testing user registration..."
curl -X POST "$API_URL/api/v1/users/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}' \
  || echo "Registration test completed (might fail if user exists)"

echo "✅ API smoke tests passed!"
```

**Frontend Testing Script** (`scripts/smoke-test-web.sh`):
```bash
#!/bin/bash

WEB_URL="https://yourdomain.com"

echo "🧪 Testing Frontend..."

# Health check
echo "Testing frontend health..."
curl -f "$WEB_URL/health" || exit 1

# Homepage
echo "Testing homepage..."
curl -f "$WEB_URL" | grep -q "Vegan Guide" || exit 1

# API connectivity
echo "Testing API connectivity from frontend..."
curl -f "$WEB_URL/api/test" || echo "API test endpoint might not be implemented"

echo "✅ Frontend smoke tests passed!"
```

#### **10.2 Performance Testing**

**Artillery Load Test** (`scripts/load-test.yml`):
```yaml
config:
  target: 'https://api.yourdomain.com'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Load test"
  plugins:
    metrics-by-endpoint: {}

scenarios:
  - name: "API Health Check"
    weight: 30
    flow:
      - get:
          url: "/health"
  
  - name: "API Documentation"
    weight: 20
    flow:
      - get:
          url: "/api-docs"
  
  - name: "Restaurant List"
    weight: 50
    flow:
      - get:
          url: "/api/v1/restaurants"
```

#### **10.3 Final Checklist**

**Pre-Production Checklist**:

- [ ] **API Configuration**
  - [ ] PORT=8080 configurado para Cloud Run
  - [ ] Todas las variables de entorno en Secret Manager
  - [ ] CORS configurado con dominio de producción
  - [ ] Rate limiting habilitado
  - [ ] Logging configurado para Google Cloud

- [ ] **Frontend Configuration**
  - [ ] `output: 'standalone'` en next.config.ts
  - [ ] NEXT_PUBLIC_API_URL apunta a API de producción
  - [ ] NEXTAUTH_URL configurado con dominio de producción
  - [ ] PWA funcional y optimizada

- [ ] **Infrastructure**
  - [ ] Cloud Run services deployados
  - [ ] Artifact Registry configurado
  - [ ] Secret Manager con todos los secretos
  - [ ] Load Balancer configurado (si aplica)
  - [ ] Certificados SSL activos
  - [ ] DNS configurado correctamente

- [ ] **CI/CD**
  - [ ] GitHub Actions workflows configurados
  - [ ] Workload Identity Federation funcionando
  - [ ] Secretos de repository configurados
  - [ ] Build y deploy automatizados

- [ ] **Monitoring & Security**  
  - [ ] Health checks funcionando
  - [ ] Alertas configuradas
  - [ ] Logs centralizados en Cloud Logging
  - [ ] Métricas en Cloud Monitoring
  - [ ] Backup de base de datos programado

#### **10.4 Go-Live Commands**

```bash
# 1. Verificar estado de servicios
gcloud run services list --region=us-central1

# 2. Verificar health checks
curl -f https://api.yourdomain.com/health
curl -f https://yourdomain.com/health

# 3. Verificar certificados SSL
gcloud compute ssl-certificates list

# 4. Test de carga ligero
artillery run scripts/load-test.yml

# 5. Verificar logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

echo "🚀 Deployment completed successfully!"
echo "📱 Frontend: https://yourdomain.com"
echo "🔧 API: https://api.yourdomain.com"
echo "📚 API Docs: https://api.yourdomain.com/api-docs"
```

---

## 🔧 Troubleshooting

### **Problemas Comunes**

#### **1. Cold Start Latency**
```bash
# Configurar min-instances si el budget lo permite
gcloud run services update api --min-instances=1 --region=us-central1
# Costo adicional: ~$9/mes por instancia mínima
```

#### **2. Memory Issues**
```bash
# Aumentar memoria si necesario
gcloud run services update api --memory=1Gi --region=us-central1
```

#### **3. Database Connection Timeouts**
```typescript
// En src/config/database.ts - Ajustar timeouts
const options = {
    serverSelectionTimeoutMS: 10000, // Aumentar timeout
    socketTimeoutMS: 0, // Disable socket timeout
    maxPoolSize: 3, // Reducir pool en Cloud Run
};
```

#### **4. CORS Errors**
```typescript
// Verificar configuración CORS en src/app.ts
app.use(cors({
    origin: [
        'https://yourdomain.com',
        'https://www.yourdomain.com'
    ],
    credentials: true
}));
```

### **Comandos de Debugging**

```bash
# Ver logs en tiempo real
gcloud run services logs tail api --region=us-central1

# Verificar configuración del servicio
gcloud run services describe api --region=us-central1

# Verificar secretos
gcloud secrets versions list MONGODB_URI

# Testing local con variables de producción
gcloud secrets versions access latest --secret="MONGODB_URI" > .env.production
```

---

## 💰 **Estimación de Costos**

### **Breakdown Mensual (Tráfico Moderado)**

| Servicio | Configuración | Costo Estimado |
|----------|---------------|----------------|
| Cloud Run API | 0.5 vCPU, 512Mi, ~50h activo | $15 |
| Cloud Run Web | 0.5 vCPU, 512Mi, ~30h activo | $10 |
| Artifact Registry | 2GB imágenes | $1 |
| Secret Manager | 10 secretos, 1000 accesos | $1 |
| Load Balancer | Opcional | $18 |
| Cloud Logging | Logs básicos | $5 |
| **Total sin LB** | | **~$32/mes** |
| **Total con LB** | | **~$50/mes** |

### **Optimizaciones para reducir costos**

1. **Usar Domain Mapping** en lugar de Load Balancer (-$18/mes)
2. **Configurar min-instances=0** (escala a cero)
3. **Optimizar connection pooling** (reduce tiempo activo)
4. **Implementar caching** (reduce requests)

---

## 🎯 **Próximos Pasos Sugeridos**

1. **Implementar esta guía paso a paso**
2. **Configurar monitoreo detallado**
3. **Optimizar performance basado en métricas reales**
4. **Considerar implementar CDN cuando escale**
5. **Evaluar migration a GKE si el tráfico aumenta significativamente**

---

**¿Listo para comenzar la implementación? 🚀**

Esta guía te llevará desde cero hasta producción en 10 días con un presupuesto controlado y arquitectura escalable.
