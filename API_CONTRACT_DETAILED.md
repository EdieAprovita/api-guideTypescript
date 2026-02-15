# Contrato de API - Vegan City Guide (TypeScript)

## Documentación Completa para Integración Frontend

**Versión:** 2.3.1
**Fecha:** Febrero 2026  
**Base URL Desarrollo:** `http://localhost:5001/api/v1`  
**Base URL Producción:** `https://api-guidetypescript-787324382752.europe-west1.run.app/api/v1`

---

## Tabla de Contenidos

1. [Configuración Inicial](#1-configuración-inicial)
2. [Autenticación y Autorización](#2-autenticación-y-autorización)
3. [Estructura de Respuestas](#3-estructura-de-respuestas)
4. [Manejo de Errores](#4-manejo-de-errores)
5. [Rate Limiting](#5-rate-limiting)
6. [Modelos de Datos](#6-modelos-de-datos)
7. [Endpoints Detallados](#7-endpoints-detallados)
8. [Validaciones](#8-validaciones)
9. [Ejemplos de Código](#9-ejemplos-de-código)
10. [Consideraciones de Seguridad](#10-consideraciones-de-seguridad)
11. [Testing y Depuración](#11-testing-y-depuración)
12. [Checklist de Integración](#12-checklist-de-integración)
13. [Soporte y Contacto](#13-soporte-y-contacto)
14. [Apéndice: Discrepancias Conocidas con Frontend](#14-apéndice-discrepancias-conocidas-con-frontend)

---

## 1. Configuración Inicial

### 1.1 Variables de Entorno (Frontend)

```env
# Desarrollo
VITE_API_BASE_URL=http://localhost:5001/api/v1
VITE_API_TIMEOUT=30000

# Producción
VITE_API_BASE_URL=https://api-guidetypescript-787324382752.europe-west1.run.app/api/v1
VITE_API_TIMEOUT=30000
```

### 1.2 Configuración CORS

El backend acepta peticiones desde:

- **Desarrollo:** `http://localhost:3000`, `http://127.0.0.1:3000`
- **Producción:** Dominios configurados en `FRONTEND_URL`

**IMPORTANTE:** Todas las peticiones autenticadas DEBEN incluir:

- **fetch:** `credentials: 'include'`
- **axios:** `withCredentials: true`

### 1.3 Headers Requeridos

```javascript
{
  'Content-Type': 'application/json',
  'Accept': 'application/json'
  // Authorization: 'Bearer <token>' (opcional si usas cookies)
}
```

---

## 2. Autenticación y Autorización

### 2.1 Sistema de Tokens JWT

La API utiliza un sistema **dual de tokens**:

- **Access Token**: Válido por 15 minutos
- **Refresh Token**: Válido por 7 días

### 2.2 Métodos de Envío del Token

El backend acepta tokens de dos formas (prioridad en orden):

#### Opción 1: Cookie HttpOnly (Recomendado para Web)

```javascript
// El backend establece automáticamente la cookie 'jwt'
// No necesitas manejar el token manualmente
fetch('http://localhost:5001/api/v1/users/profile', {
    method: 'GET',
    credentials: 'include', // CRÍTICO: Esto envía la cookie
});
```

#### Opción 2: Authorization Header

```javascript
fetch('http://localhost:5001/api/v1/users/profile', {
    method: 'GET',
    headers: {
        Authorization: `Bearer ${accessToken}`,
    },
});
```

### 2.3 Flujo de Autenticación Completo

```
┌─────────────┐
│   LOGIN     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ POST /users/login       │
│ {email, password}       │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Response:                           │
│ - Cookie 'jwt' establecida          │
│ - Body: {success, data: {...}}     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Peticiones Autenticadas     │
│ (Cookie se envía auto)      │
└──────┬──────────────────────┘
       │
       ▼ (después de 15 min)
┌─────────────────────────────┐
│ 401 Unauthorized            │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ POST /auth/refresh-token    │
│ {refreshToken}              │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Nuevos tokens               │
└─────────────────────────────┘
```

### 2.4 Roles y Permisos

| Rol              | Permisos                                                              |
| ---------------- | --------------------------------------------------------------------- |
| **user**         | Crear contenido propio, leer todo público, actualizar/eliminar propio |
| **professional** | Todo de user + crear perfiles profesionales                           |
| **admin**        | Acceso completo a todos los recursos                                  |

---

## 3. Estructura de Respuestas

### 3.1 Respuesta Exitosa (200, 201)

```typescript
interface SuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
```

**Ejemplo:**

```json
{
    "success": true,
    "data": {
        "_id": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "email": "john@example.com",
        "role": "user"
    },
    "message": "User registered successfully"
}
```

### 3.2 Respuesta con Paginación

⚠️ **ADVERTENCIA — Implementación Selectiva de Paginación:**

La paginación NO está implementada universalmente en todos los endpoints.

**Endpoints CON paginación funcional:**
- ✅ `GET /restaurants/:id/reviews` — Soporta `page` y `limit`
- ✅ `GET /recipes/:id/reviews` — Soporta `page` y `limit`
- ✅ `GET /businesses/:id/reviews` — Soporta `page` y `limit`
- ✅ (Todos los endpoints de reviews)

**Endpoints SIN paginación (devuelven TODOS los resultados):**
- ❌ `GET /restaurants` — Ignora `page`/`limit`, devuelve lista completa
- ❌ `GET /businesses` — Ignora `page`/`limit`, devuelve lista completa
- ❌ `GET /doctors` — Ignora `page`/`limit`, devuelve lista completa
- ❌ `GET /markets` — Ignora `page`/`limit`, devuelve lista completa
- ❌ `GET /recipes` — Ignora `page`/`limit`, devuelve lista completa

**Razón técnica:** El método `BaseService.getAll()` no implementa paginación. Solo los métodos específicos de reviews la soportan.

**Fix planeado:** Ver `IMPLEMENTATION_PLAN.md` Phase 0 — se expondrá `getAllPaginated()` en todos los endpoints.

**Ejemplo de respuesta paginada (cuando está soportada):**

```json
{
    "success": true,
    "data": [
        { "_id": "...", "restaurantName": "..." },
        { "_id": "...", "restaurantName": "..." }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 50,
        "pages": 5
    }
}
```

---

## 4. Manejo de Errores

### 4.1 Estructura de Error

```typescript
interface ErrorResponse {
    success: false;
    message: string;
    error: string;
    errors?: Array<{
        field: string;
        message: string;
        value?: any;
    }>;
}
```

### 4.2 Códigos de Estado HTTP

| Código  | Significado           | Acción Recomendada                        |
| ------- | --------------------- | ----------------------------------------- |
| **200** | OK                    | Procesar datos                            |
| **201** | Created               | Mostrar confirmación                      |
| **400** | Bad Request           | Mostrar errores de validación al usuario  |
| **401** | Unauthorized          | Redirigir a login o refrescar token       |
| **403** | Forbidden             | Mostrar "Acceso denegado"                 |
| **404** | Not Found             | Mostrar "Recurso no encontrado"           |
| **409** | Conflict              | Mostrar "Ya existe" (ej: email duplicado) |
| **413** | Payload Too Large     | Reducir tamaño de datos                   |
| **429** | Too Many Requests     | Esperar y reintentar                      |
| **500** | Internal Server Error | Mostrar error genérico                    |

### 4.3 Ejemplos de Errores Comunes

#### Error de Validación (400)

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "email",
            "message": "Must be a valid email address",
            "value": "invalid-email"
        },
        {
            "field": "password",
            "message": "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
        }
    ]
}
```

#### Token Expirado (401)

```json
{
    "success": false,
    "message": "Invalid or expired token",
    "error": "Unauthorized"
}
```

#### Duplicado (409)

```json
{
    "success": false,
    "message": "User has already reviewed this restaurant",
    "error": "Conflict"
}
```

---

## 5. Rate Limiting

### 5.1 Límites por Tipo de Endpoint

| Endpoint                        | Ventana | Límite       | Mensaje                            |
| ------------------------------- | ------- | ------------ | ---------------------------------- |
| **/users/login**                | 15 min  | 5 intentos   | "Too many authentication attempts" |
| **/users/register**             | 1 hora  | 3 intentos   | "Too many registration attempts"   |
| **/auth/refresh-token**         | 15 min  | 5 intentos   | "Too many authentication attempts" |
| **GET /restaurants** (búsqueda) | 1 min   | 30 requests  | "Search rate limit exceeded"       |
| **Endpoints generales**         | 15 min  | 100 requests | "API rate limit exceeded"          |

### 5.2 Headers de Rate Limit

El servidor devuelve:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1609459200
```

---

## 6. Modelos de Datos

### 6.1 User

```typescript
interface User {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'professional' | 'admin';
    isAdmin: boolean;
    isActive: boolean;
    isDeleted: boolean;
    photo: string; // URL
    firstName?: string;
    lastName?: string;
    timestamps: {
        createdAt: string; // ISO 8601
        updatedAt: string;
    };
}
```

**Validaciones:**

- `username`: 2-50 caracteres, requerido
- `email`: Formato válido, único, requerido
- `password`: Mínimo 8 caracteres, debe contener mayúscula, minúscula, número y carácter especial

### 6.2 Restaurant

```typescript
interface Restaurant {
    _id: string;
    restaurantName: string;
    author: string; // ObjectId del User
    typePlace: string;
    address: string;
    location?: GeoJSONPoint;
    image: string; // URL
    budget: '$' | '$$' | '$$$' | '$$$$';
    contact: Contact[];
    cuisine: string[];
    reviews: string[]; // Array de ObjectIds
    rating: number; // 0-5
    numReviews: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}

interface GeoJSONPoint {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

interface Contact {
    phone?: string;
    email?: string;
    facebook?: string;
    instagram?: string;
}
```

**Validaciones:**

- `restaurantName`: 2-100 caracteres, único, requerido
- `address`: Máximo 200 caracteres, requerido
- `cuisine`: Array con mínimo 1 elemento
- `coordinates`: [longitude, latitude] donde longitude: -180 a 180, latitude: -90 a 90

### 6.3 Business

```typescript
interface Business {
    _id: string;
    namePlace: string;
    author: string;
    address: string;
    location?: GeoJSONPoint;
    image: string;
    contact: Contact[];
    budget: number;
    typeBusiness: string;
    hours: BusinessHours[];
    reviews: string[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}

interface BusinessHours {
    dayOfWeek: string; // "Monday", "Tuesday", etc.
    openTime: string; // "HH:MM" formato 24h
    closeTime: string; // "HH:MM" formato 24h
}
```

### 6.4 Review (Polimórfico)

```typescript
interface Review {
    _id: string;
    rating: number; // 1-5
    title: string; // 5-100 caracteres
    content: string; // 10-1000 caracteres
    visitDate: string; // ISO 8601
    recommendedDishes?: string[]; // Max 50 chars cada uno
    tags?: string[]; // Max 30 chars cada uno
    author: string; // ObjectId
    // Campos polimórficos
    entityType: 'Restaurant' | 'Recipe' | 'Market' | 'Business' | 'Doctor' | 'Sanctuary';
    entity: string; // ObjectId del recurso
    helpfulCount: number;
    helpfulVotes: string[]; // Array de ObjectIds de users
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}
```

**Validaciones:**

- `rating`: Entero entre 1-5, requerido
- `title`: 5-100 caracteres, requerido
- `content`: 10-1000 caracteres, requerido
- `recommendedDishes`: Cada string máximo 50 caracteres
- `tags`: Cada string máximo 30 caracteres

### 6.5 Doctor

```typescript
interface Doctor {
    _id: string;
    doctorName: string;
    author: string;
    address: string;
    location?: GeoJSONPoint;
    image: string;
    specialty: string;
    contact: Contact[];
    reviews: string[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}
```

### 6.6 Market

```typescript
interface Market {
    _id: string;
    marketName: string;
    author: string;
    address: string;
    location?: GeoJSONPoint;
    image: string;
    typeMarket: 'supermarket' | 'convenience store' | 'grocery store';
    reviews: string[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}
```

### 6.7 Recipe

```typescript
interface Recipe {
    _id: string;
    title: string;
    author: string;
    description: string;
    instructions: string;
    ingredients: string[];
    typeDish: string;
    image: string;
    cookingTime: number; // minutos
    difficulty: string;
    budget: string;
    reviews: string[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}
```

---

## 7. Endpoints Detallados

### 7.1 Autenticación

#### POST /users/register

Registra un nuevo usuario.

**Request:**

```json
{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
}
```

**Validaciones:**

- `username`: 2-50 caracteres, requerido
- `email`: Formato email válido, único, requerido
- `password`: Mínimo 8 caracteres, debe incluir mayúscula, minúscula, número y carácter especial (@$!%\*?&)
- `firstName/lastName`: 2-50 caracteres, opcional

**Response 201:**

```json
{
    "success": true,
    "data": {
        "_id": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "email": "john@example.com",
        "role": "user",
        "isActive": true,
        "photo": "https://res.cloudinary.com/.../default-user.png"
    }
}
```

**Errores Comunes:**

- `400`: Email ya registrado
- `429`: Demasiados intentos de registro

---

#### POST /users/login

Autentica un usuario.

**Request:**

```json
{
    "email": "john@example.com",
    "password": "SecurePass123!"
}
```

**Response 200:**

```json
{
    "success": true,
    "data": {
        "_id": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "email": "john@example.com",
        "role": "user",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

**Headers de Respuesta:**

```
Set-Cookie: jwt=eyJhbGciOiJIUzI1...; HttpOnly; Secure; SameSite=Strict; Max-Age=900
```

**Errores Comunes:**

- `401`: Credenciales inválidas
- `429`: Demasiados intentos de login

---

#### POST /auth/refresh-token

Refresca un access token expirado.

**Request:**

```json
{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**

```json
{
    "success": true,
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1...",
        "refreshToken": "eyJhbGciOiJIUzI1..."
    }
}
```

---

#### POST /auth/logout

Cierra sesión y blacklistea el token actual.

**Headers:**

```
Authorization: Bearer <token>
```

**Response 200:**

```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

---

#### POST /auth/revoke-all-tokens

Revoca todos los tokens del usuario (cierra sesión en todos los dispositivos).

**Headers:**

```
Authorization: Bearer <token>
```

**Response 200:**

```json
{
    "success": true,
    "message": "All tokens revoked successfully"
}
```

---

### 7.2 Usuarios

#### GET /users/profile

Obtiene el perfil del usuario autenticado.

**Headers:**

```
Authorization: Bearer <token>
```

**Response 200:**

```json
{
    "success": true,
    "data": {
        "_id": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "email": "john@example.com",
        "role": "user",
        "firstName": "John",
        "lastName": "Doe",
        "photo": "https://..."
    }
}
```

---

#### PUT /users/profile

Actualiza el perfil del usuario autenticado.

**Headers:**

```
Authorization: Bearer <token>
```

**Request:**

```json
{
    "username": "john_updated",
    "firstName": "Jonathan",
    "lastName": "Doe"
}
```

**Response 200:**

```json
{
    "success": true,
    "data": {
        "_id": "507f1f77bcf86cd799439011",
        "username": "john_updated",
        "firstName": "Jonathan",
        "lastName": "Doe",
        "email": "john@example.com"
    }
}
```

---

#### GET /users/:id

Obtiene un usuario por ID (solo admin).

**Headers:**

```
Authorization: Bearer <token>
```

**Response 200:**

```json
{
    "success": true,
    "data": {
        "_id": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "email": "john@example.com",
        "role": "user"
    }
}
```

---

#### DELETE /users/:id

Elimina un usuario (solo admin).

**Headers:**

```
Authorization: Bearer <token>
```

**Response 200:**

```json
{
    "success": true,
    "message": "User deleted successfully"
}
```

---

### 7.3 Restaurantes

#### GET /restaurants

Lista todos los restaurantes con paginación y filtros.

**Query Parameters:**

```
?page=1&limit=10&latitude=40.7128&longitude=-74.0060&radius=5000
```

| Parámetro   | Tipo   | Requerido | Default | Descripción                                     |
| ----------- | ------ | --------- | ------- | ----------------------------------------------- |
| `page`      | number | No        | 1       | Número de página                                |
| `limit`     | number | No        | 10      | Resultados por página (max 100)                 |
| `latitude`  | number | No        | -       | Latitud para búsqueda geoespacial (-90 a 90)    |
| `longitude` | number | No        | -       | Longitud para búsqueda geoespacial (-180 a 180) |
| `radius`    | number | No        | 5000    | Radio en metros (1-50000)                       |

**IMPORTANTE:** Si envías `latitude`, DEBES enviar `longitude` también.

**Response 200:**

```json
{
    "success": true,
    "data": [
        {
            "_id": "507f1f77bcf86cd799439012",
            "restaurantName": "El Buen Sabor",
            "address": "123 Main St, New York",
            "cuisine": ["Mexican", "Vegan"],
            "rating": 4.5,
            "numReviews": 25,
            "budget": "$$"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 50,
        "pages": 5
    }
}
```

---

#### GET /restaurants/:id

Obtiene un restaurante por ID.

**Response 200:**

```json
{
    "success": true,
    "data": {
        "_id": "507f1f77bcf86cd799439012",
        "restaurantName": "El Buen Sabor",
        "author": "507f1f77bcf86cd799439011",
        "address": "123 Main St, New York",
        "location": {
            "type": "Point",
            "coordinates": [-74.006, 40.7128]
        },
        "cuisine": ["Mexican", "Vegan"],
        "budget": "$$",
        "rating": 4.5,
        "numReviews": 25,
        "contact": [
            {
                "phone": "+1234567890",
                "instagram": "instagram.com/elbuen"
            }
        ],
        "timestamps": {
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T10:30:00.000Z"
        }
    }
}
```

---

#### POST /restaurants

Crea un nuevo restaurante (requiere autenticación).

**Headers:**

```
Authorization: Bearer <token>
```

**Request:**

```json
{
    "restaurantName": "New Vegan Spot",
    "address": "456 Oak St, Brooklyn",
    "cuisine": ["Italian", "Vegan"],
    "budget": "$$$",
    "contact": [
        {
            "phone": "+1234567890",
            "instagram": "instagram.com/newvegan"
        }
    ],
    "location": {
        "type": "Point",
        "coordinates": [-73.9442, 40.6782]
    }
}
```

**Response 201:**

```json
{
    "success": true,
    "data": {
        "_id": "507f1f77bcf86cd799439013",
        "restaurantName": "New Vegan Spot",
        "address": "456 Oak St, Brooklyn",
        "author": "507f1f77bcf86cd799439011",
        "cuisine": ["Italian", "Vegan"],
        "budget": "$$$",
        "rating": 0,
        "numReviews": 0
    },
    "message": "Restaurant created successfully"
}
```

---

#### PUT /restaurants/:id

Actualiza un restaurante (requiere admin o ser el autor).

**Headers:**

```
Authorization: Bearer <token>
```

**Request:**

```json
{
    "restaurantName": "Updated Restaurant Name",
    "budget": "$$$$"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "restaurantName": "Updated Restaurant Name",
    "budget": "$$$$",
    ...
  }
}
```

---

#### DELETE /restaurants/:id

Elimina un restaurante (solo admin).

**Headers:**

```
Authorization: Bearer <token>
```

**Response 200:**

```json
{
    "success": true,
    "message": "Restaurant deleted successfully"
}
```

---

### 7.4 Reviews (Sistema Polimórfico)

#### POST /restaurants/:restaurantId/reviews

Crea una review para un restaurante.

⚠️ **DISCREPANCIA CRÍTICA CON FRONTEND:**

El backend **REQUIERE** el campo `title` (5-100 caracteres) en la validación Joi, pero el frontend `Vegan-Guide-Platform` actual **solo envía `{rating, comment}`** y NO incluye `title`.

**Esto causa que TODAS las reviews creadas desde el frontend fallen con error 400.**

**Workaround temporal (opción 1 — backend):**
El Issue #M2 del `IMPLEMENTATION_PLAN.md` Phase 2 hará `title` opcional y auto-generará desde `content` si no se provee.

**Workaround temporal (opción 2 — frontend):**
```typescript
const review = {
    rating: 5,
    title: comment.substring(0, 100) || "Review", // Generar title desde content
    content: comment,
    visitDate: "2024-01-15",
    // ...
};
```

**Headers:**

```
Authorization: Bearer <token>
```

**Request:**

```json
{
    "rating": 5,
    "title": "Excelente comida",
    "content": "La mejor experiencia vegana que he tenido. Recomiendo totalmente este lugar.",
    "visitDate": "2024-01-15",
    "recommendedDishes": ["Tacos al pastor vegano", "Guacamole"],
    "tags": ["auténtico", "familiar", "económico"]
}
```

**Validaciones:**

- `rating`: Número entero 1-5, requerido
- `title`: 5-100 caracteres, **requerido** (⚠️ frontend no lo envía actualmente)
- `content`: 10-1000 caracteres, requerido
- `visitDate`: Fecha en formato ISO (no puede ser futura), opcional
- `recommendedDishes`: Array de strings (máx 50 chars cada uno), opcional
- `tags`: Array de strings (máx 30 chars cada uno), opcional

**Response 201:**

```json
{
    "success": true,
    "data": {
        "_id": "507f1f77bcf86cd799439014",
        "rating": 5,
        "title": "Excelente comida",
        "content": "La mejor experiencia vegana...",
        "author": "507f1f77bcf86cd799439011",
        "entityType": "Restaurant",
        "entity": "507f1f77bcf86cd799439012",
        "visitDate": "2024-01-15T00:00:00.000Z",
        "recommendedDishes": ["Tacos al pastor vegano", "Guacamole"],
        "tags": ["auténtico", "familiar", "económico"],
        "helpfulCount": 0,
        "timestamps": {
            "createdAt": "2024-01-16T10:30:00.000Z"
        }
    },
    "message": "Review added successfully"
}
```

**Errores Comunes:**

- `409`: El usuario ya ha hecho una review de este restaurante
- `404`: Restaurante no encontrado

---

#### GET /restaurants/:restaurantId/reviews

Lista las reviews de un restaurante.

**Query Parameters:**

```
?page=1&limit=10&rating=5&sort=-createdAt
```

| Parámetro | Tipo   | Default    | Descripción                                                  |
| --------- | ------ | ---------- | ------------------------------------------------------------ |
| `page`    | number | 1          | Número de página                                             |
| `limit`   | number | 10         | Resultados por página                                        |
| `rating`  | number | -          | Filtrar por rating (1-5)                                     |
| `sort`    | string | -createdAt | Campo de ordenamiento (`-createdAt` = más recientes primero) |

**Response 200:**

```json
{
    "success": true,
    "data": [
        {
            "_id": "507f1f77bcf86cd799439014",
            "rating": 5,
            "title": "Excelente comida",
            "content": "La mejor experiencia...",
            "author": {
                "_id": "507f1f77bcf86cd799439011",
                "username": "johndoe"
            },
            "visitDate": "2024-01-15T00:00:00.000Z",
            "helpfulCount": 10
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 25,
        "pages": 3
    }
}
```

---

#### GET /restaurants/:restaurantId/reviews/stats

Obtiene estadísticas de las reviews.

**Response 200:**

```json
{
    "success": true,
    "data": {
        "averageRating": 4.5,
        "totalReviews": 25,
        "ratingDistribution": {
            "5": 15,
            "4": 7,
            "3": 2,
            "2": 1,
            "1": 0
        }
    }
}
```

---

### 7.5 Businesses

Los endpoints de **Business** siguen la misma estructura que **Restaurants**:

- `GET /businesses` - Lista con paginación
- `GET /businesses/:id` - Obtiene por ID
- `POST /businesses` - Crea (requiere auth)
- `PUT /businesses/:id` - Actualiza (requiere admin)
- `DELETE /businesses/:id` - Elimina (requiere admin)
- `POST /businesses/:id/reviews` - Crea review
- `GET /businesses/:id/reviews` - Lista reviews

**Campos específicos de Business:**

```json
{
    "namePlace": "Tech Solutions Inc",
    "typeBusiness": "technology",
    "budget": 50000,
    "hours": [
        {
            "dayOfWeek": "Monday",
            "openTime": "09:00",
            "closeTime": "17:00"
        }
    ]
}
```

---

### 7.6 Doctors

- `GET /doctors`
- `GET /doctors/:id`
- `POST /doctors` (auth requerida)
- `PUT /doctors/:id` (admin)
- `DELETE /doctors/:id` (admin)
- `POST /doctors/:id/reviews`
- `GET /doctors/:id/reviews`

**Campos específicos:**

```json
{
    "doctorName": "Dr. Smith",
    "specialty": "Cardiology"
}
```

---

### 7.7 Markets

- `GET /markets`
- `GET /markets/:id`
- `POST /markets` (auth)
- `PUT /markets/:id` (admin)
- `DELETE /markets/:id` (admin)
- `POST /markets/:id/reviews`

**Campos específicos:**

```json
{
    "marketName": "Central Market",
    "typeMarket": "supermarket" // "convenience store" | "grocery store"
}
```

---

### 7.8 Recipes

- `GET /recipes`
- `GET /recipes/:id`
- `POST /recipes` (auth)
- `PUT /recipes/:id` (admin o autor)
- `DELETE /recipes/:id` (admin)
- `POST /recipes/:id/reviews`

**Campos específicos:**

```json
{
    "title": "Delicious Tacos",
    "description": "Authentic Mexican tacos",
    "instructions": "1. Prepare the meat...",
    "ingredients": ["tortillas", "beef", "onions"],
    "typeDish": "main course",
    "cookingTime": 30,
    "difficulty": "medium",
    "budget": "low"
}
```

---

## 8. Validaciones

### 8.1 Reglas de Validación por Campo

#### Email

```regex
/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```

#### Password

```regex
/^(?=[^\n]{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).*$/
```

**Requisitos:**

- Mínimo 8 caracteres, máximo 128
- Al menos una minúscula
- Al menos una mayúscula
- Al menos un número
- Al menos un carácter especial: @$!%\*?&

#### ObjectId

```regex
/^[0-9a-fA-F]{24}$/
```

#### Phone

```regex
/^\+?[\d\s\-().]{10,}$/
```

#### Time (24h)

```regex
/^([01]?\d|2[0-3]):[0-5]\d$/
```

Ejemplos: "09:00", "17:30", "23:59"

### 8.2 Límites de Tamaño

| Tipo de Petición           | Límite |
| -------------------------- | ------ |
| Login                      | 1KB    |
| Registro                   | 2KB    |
| Actualizar perfil          | 4KB    |
| Crear restaurante/business | 8KB    |
| Reviews                    | 2KB    |
| Global (cualquier otro)    | 10MB   |

---

## 9. Ejemplos de Código

### 9.1 Configuración Axios (Recomendado)

```typescript
// src/api/axios.ts
import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000,
    withCredentials: true, // CRÍTICO para cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // Si es 401 y no hemos reintentado, refrescar token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`, {
                    refreshToken,
                });

                localStorage.setItem('refreshToken', data.data.refreshToken);
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Redirigir a login
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
```

### 9.2 Servicio de Autenticación

```typescript
// src/services/auth.service.ts
import apiClient from '../api/axios';

interface LoginCredentials {
    email: string;
    password: string;
}

interface RegisterData {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

export const authService = {
    async login(credentials: LoginCredentials) {
        const { data } = await apiClient.post('/users/login', credentials);

        // Guardar refresh token
        if (data.data.refreshToken) {
            localStorage.setItem('refreshToken', data.data.refreshToken);
        }

        return data.data;
    },

    async register(userData: RegisterData) {
        const { data } = await apiClient.post('/users/register', userData);
        return data.data;
    },

    async logout() {
        await apiClient.post('/auth/logout');
        localStorage.removeItem('refreshToken');
    },

    async getCurrentUser() {
        const { data } = await apiClient.get('/users/profile');
        return data.data;
    },
};
```

### 9.3 Hook de Autenticación (React)

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';

interface User {
    _id: string;
    username: string;
    email: string;
    role: string;
}

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await authService.getCurrentUser();
                setUser(userData);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = async (email: string, password: string) => {
        const userData = await authService.login({ email, password });
        setUser(userData);
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    return { user, loading, login, logout };
};
```

### 9.4 Servicio de Restaurantes

```typescript
// src/services/restaurant.service.ts
import apiClient from '../api/axios';

interface SearchParams {
    page?: number;
    limit?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
}

export const restaurantService = {
    async getAll(params: SearchParams = {}) {
        const { data } = await apiClient.get('/restaurants', { params });
        return data;
    },

    async getById(id: string) {
        const { data } = await apiClient.get(`/restaurants/${id}`);
        return data.data;
    },

    async create(restaurantData: any) {
        const { data } = await apiClient.post('/restaurants', restaurantData);
        return data.data;
    },

    async update(id: string, restaurantData: any) {
        const { data } = await apiClient.put(`/restaurants/${id}`, restaurantData);
        return data.data;
    },

    async delete(id: string) {
        const { data } = await apiClient.delete(`/restaurants/${id}`);
        return data;
    },

    async addReview(restaurantId: string, review: any) {
        const { data } = await apiClient.post(`/restaurants/${restaurantId}/reviews`, review);
        return data.data;
    },

    async getReviews(restaurantId: string, params: any = {}) {
        const { data } = await apiClient.get(`/restaurants/${restaurantId}/reviews`, { params });
        return data;
    },
};
```

### 9.5 Manejo de Errores en Componentes

```typescript
// src/components/RestaurantForm.tsx
import { useState } from 'react';
import { restaurantService } from '../services/restaurant.service';

export const RestaurantForm = () => {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    setErrors([]);

    try {
      await restaurantService.create(formData);
      // Mostrar éxito
      alert('Restaurant created successfully!');
    } catch (error: any) {
      if (error.response?.data?.errors) {
        // Errores de validación
        setErrors(error.response.data.errors);
      } else if (error.response?.status === 429) {
        alert('Too many requests. Please wait and try again.');
      } else {
        alert(error.response?.data?.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(formData); }}>
      {errors.length > 0 && (
        <div className="error-list">
          {errors.map((err, idx) => (
            <div key={idx}>
              <strong>{err.field}:</strong> {err.message}
            </div>
          ))}
        </div>
      )}
      {/* Form fields */}
    </form>
  );
};
```

---

## 10. Consideraciones de Seguridad

### 10.1 Almacenamiento de Tokens

**Recomendaciones:**

#### Para Web (Navegador)

✅ **Usar Cookie HttpOnly** (el backend lo hace automáticamente)

- Protegido contra XSS
- Se envía automáticamente
- No requiere almacenamiento manual

❌ **NO usar localStorage para tokens**

- Vulnerable a XSS
- No es seguro

✅ **Guardar Refresh Token en localStorage** (menos crítico)

- Tiene validez más corta en práctica
- Solo se usa para endpoint de refresh

#### Para Apps Móviles

✅ **Usar Secure Storage**

- iOS: Keychain
- Android: EncryptedSharedPreferences

### 10.2 Sanitización de Inputs

El backend automáticamente sanitiza:

- Scripts maliciosos
- Inyección SQL/NoSQL
- XSS básico

Pero el frontend TAMBIÉN debe validar:

```typescript
const sanitizeInput = (input: string) => {
    return input
        .trim()
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '');
};
```

### 10.3 HTTPS Obligatorio en Producción

El backend fuerza HTTPS en producción. Si intentas conectar con HTTP:

```
HTTP/1.1 301 Moved Permanently
Location: https://...
```

### 10.4 Content Security Policy (CSP)

El backend responde con headers CSP estrictos:

```
Content-Security-Policy: default-src 'self'; ...
```

Asegúrate de que tu frontend no viole estas políticas.

---

## 11. Testing y Depuración

### 11.1 Swagger UI

Accede a la documentación interactiva:

- **Local:** `http://localhost:5001/api-docs`
- **Producción:** Requiere autenticación básica

### 11.2 Health Check

```bash
GET /health
```

**Response:**

```json
{
    "status": "ok",
    "timestamp": "2024-01-16T10:30:00.000Z",
    "uptime": 12345,
    "environment": "production",
    "database": "connected"
}
```

### 11.3 Logs y Debugging

En desarrollo, el backend devuelve mensajes de error detallados.
En producción, los mensajes son genéricos por seguridad.

---

## 12. Checklist de Integración

Antes de salir a producción, verifica:

- [ ] Las peticiones incluyen `credentials: 'include'` o `withCredentials: true`
- [ ] El refresh token se guarda y se usa correctamente
- [ ] Los errores 401 disparan el flujo de refresh token
- [ ] Los errores 429 muestran un mensaje al usuario
- [ ] Las validaciones del frontend coinciden con las del backend
- [ ] Los campos requeridos están marcados en los formularios
- [ ] Las imágenes se envían como URLs, no como archivos binarios
- [ ] Las coordenadas geográficas usan el formato [longitude, latitude]
- [ ] Los timestamps se parsean correctamente (ISO 8601)
- [ ] El rate limiting no bloquea operaciones normales

---

## 13. Soporte y Contacto

**Repositorio:** `api-guideTypescript`
**Documentación Swagger:** `/api-docs`
**Versión:** 2.3.1

Para dudas o problemas, contactar al equipo de backend.

---

## 14. Apéndice: Discrepancias Conocidas con Frontend

Este contrato documenta la API **tal como existe hoy en producción** (tag `V2.0.0`). Sin embargo, existen discrepancias conocidas con el frontend `Vegan-Guide-Platform` que están documentadas y priorizadas para corrección.

### 14.1 Discrepancias Críticas (Bloquean Funcionalidad Core)

| ID | Issue | Impacto | Estado |
|----|-------|---------|--------|
| **C1** | `DELETE /posts/:postId/comments/:commentId` — Frontend espera este endpoint, backend solo tiene el método `removeComment()` en PostService pero NO tiene route/controller | Los usuarios NO pueden eliminar sus propios comentarios | Planeado Phase 1 |
| **C2** | `DELETE /posts/unlike/:id` — Frontend usa DELETE, backend solo acepta `POST` | Cada unlike devuelve 404 | Planeado Phase 1 |
| **C3** | `GET /businesses/nearby` y `GET /businesses/search` — Frontend tiene hooks completos, backend no tiene las routes | Discovery de negocios por ubicación NO funciona | Planeado Phase 1 |

### 14.2 Discrepancias Mayores (Datos Incompatibles o Faltantes)

| ID | Issue | Backend Actual | Frontend Espera | Solución Planeada |
|----|-------|----------------|-----------------|-------------------|
| **M1** | Post model field names | `text`, `date`, `likes: [{username: ObjectId}]` | `content`, `createdAt`, `likes: string[]` | Phase 2: Mongoose virtuals + toJSON transform |
| **M2** | Review `title` field | **Requerido** (5-100 chars, Joi validation) | NO se envía (solo `rating` y `comment`) | Phase 2: Hacer opcional con auto-generación |
| **M3** | Recipe campos faltantes | Solo `cookingTime`, `rating` | Espera `preparationTime`, `servings`, `averageRating` | Phase 3: Agregar a schema |
| **M4** | Doctor field name | `doctorName` | `name` | Phase 3: Mongoose alias virtual |
| **M5** | Market field names | `marketName`, `typeMarket` | `name`, `category` | Phase 3: Mongoose alias virtual |
| **M6** | Sanctuary animals schema | `{animalName, specie, age, gender, habitat, diet, image, vaccines}` | `{name, species, breed, rescued, rescueDate, healthStatus, specialNeeds}` | Phase 3: Schema unificado con ambos sets |
| **M7** | Business hours type | `{dayOfWeek, openTime, closeTime}[]` ✅ **Correcto** | `Date[]` ❌ **Incorrecto** | Backend correcto, frontend debe adaptarse |
| **M8** | Phone type inconsistencia | Number en ProfessionProfile/Profession/Sanctuary, String en Business/Restaurant/Doctor | String everywhere | Phase 0: Unificar a String |
| **M9** | Password validation | ≥8 chars + complejidad (uppercase, lowercase, digit, special) | ≥6 chars (no complejidad) | Backend correcto — validación frontend debe actualizarse |
| **M10** | Comment structure | `comments[].username` (ObjectId flat) | `comments[].user: {_id, username, photo}` | Phase 2: Population + transform |
| **M11** | Response envelope | Algunos endpoints devuelven data sin wrapper | Siempre espera `{success, data, message?}` | Phase 0: Middleware global |
| **M12** | Unified `/search` endpoint | **NO existe** | Frontend tiene client completo para 5 endpoints: `/search`, `/search/:type`, `/search/suggestions`, `/search/popular`, `/search/aggregations` | Phase 4: Implementar SearchService completo |
| **M13** | Paginación universal | `BaseService.getAll()` NO soporta page/limit | Frontend envía page/limit en todos los GET | Phase 0: Exponer `getAllPaginated()` |

### 14.3 Discrepancias Menores

- **m1:** Restaurant `budget` ($-$$$$) tratado como display value — filtros pueden no funcionar
- **m2:** Sanctuary model registrado como lowercase `'sanctuary'` vs enum `'Sanctuary'` — populate puede fallar
- **m3:** ProfessionProfile sin campo `location` — queries geo vacías
- **m4:** Recipe `budget` en validators pero no en IRecipe interface
- **m5:** Post `likes` formato inconsistente (subset de M1)
- **m6:** Legacy review endpoints (`/add-review/:id`) coexisten con nuevos (`/:id/reviews`)
- **m7:** Algunos endpoints no retornan `success` field (subset de M11)
- **m8:** Profession backend fields (`address`, `specialty`) no modelados en frontend

### 14.4 Roadmap de Corrección

Todas estas discrepancias están documentadas y priorizadas en:

**Documento:** `IMPLEMENTATION_PLAN.md` (raíz del repo)

**Timeline:** ~5-6 semanas (8 fases)

**Critical Path:** Phase 0 (Foundation) → Phase 1 (Critical Routes) → Phase 2 (Model Alignment) → Phase 3 (Field Standardization) → Phase 6 (OpenAPI Codegen — elimina drift futuro)

**Estrategia clave:** Uso de Mongoose virtuals, aliases y transforms para alinear sin romper DB existente ni requerir migraciones.

### 14.5 Recomendación para Nuevas Integraciones

Si estás integrando el frontend **AHORA**, considera:

1. **Para endpoints críticos (C1-C3):** Espera a Phase 1 (2-3 días) antes de integrar esas features
2. **Para reviews (M2):** Implementa el workaround temporal de generar `title` desde `content` en frontend
3. **Para campos (M4-M6):** Usa los nombres del backend (`doctorName`, no `name`) hasta Phase 3
4. **Para paginación (M13):** No dependas de page/limit en GET de entities principales hasta Phase 0

---

**Última actualización:** Febrero 2026
