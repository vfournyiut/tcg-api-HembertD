# TODO - Documentation Swagger / OpenAPI ✅ TERMINÉ

## Implémentation terminée

### 1. Configuration principale ✅
- [x] **swagger.config.yml** - Fichier de configuration principal
  - [x] Informations générales (title, version, description)
  - [x] Schémas réutilisables (User, Card, Deck, DeckCard, Error, SignUpRequest, SignInRequest, AuthResponse, CreateDeckRequest, UpdateDeckRequest)
  - [x] Sécurité JWT Bearer configurée (bearerAuth)
  - [x] Paramètres globaux et réponses réutilisables

### 2. Documentation par module ✅
- [x] **auth.doc.yml** - Documentation authentification
  - [x] POST /api/auth/sign-up - Inscription utilisateur
  - [x] POST /api/auth/sign-in - Connexion utilisateur
  
- [x] **card.doc.yml** - Documentation cartes
  - [x] GET /api/cards - Liste toutes les cartes
  
- [x] **deck.doc.yml** - Documentation decks
  - [x] GET /api/decks/mine - Liste les decks de l'utilisateur (protégé)
  - [x] GET /api/decks/:id - Récupère un deck par ID (protégé)
  - [x] POST /api/decks - Crée un nouveau deck (protégé)
  - [x] PATCH /api/decks/:id - Met à jour un deck (protégé)
  - [x] DELETE /api/decks/:id - Supprime un deck (protégé)

### 3. Agrégation ✅
- [x] **src/index.ts** - Point d'entrée Swagger
  - [x] Import des documentations par module (fusion YAML)
  - [x] Configuration Swagger UI accessible sur /api-docs
  - [x] Route JSON sur /api-docs.json

## Fichiers créés

```
docs/
├── swagger.config.yml  # Configuration principale
├── auth.doc.yml        # Endpoints auth
├── card.doc.yml        # Endpoints cards
└── deck.doc.yml        # Endpoints decks

src/
└── index.ts            # Modifié pour intégrer Swagger UI
```

## Accès

- **Swagger UI**: http://localhost:3000/api-docs
- **Spécification JSON**: http://localhost:3000/api-docs.json

## Tests

- [x] Vérification TypeScript (`npm run ts:check`) - ✅ Passed
- [x] Validation YAML - ✅ Passed

## Fonctionnalités

- ✅ UI Swagger accessible sur /api-docs
- ✅ Configuration principale avec schémas réutilisables
- ✅ Fichiers de documentation par module créés et agrégés
- ✅ Tous les endpoints documentés avec descriptions, paramètres, corps et réponses
- ✅ Authentification Bearer JWT configurée avec bouton "Authorize"
- ✅ Routes protégées marquées avec `security: [bearerAuth]`
- ✅ Tous les endpoints testables depuis l'UI avec exemples

## Détails des endpoints

### Auth
| Méthode | Endpoint | Description | Auth | Corps requête | Réponses |
|---------|----------|-------------|------|---------------|----------|
| POST | /api/auth/sign-up | Inscription d'un nouvel utilisateur | Non | email, username, password | 201, 400, 409, 500 |
| POST | /api/auth/sign-in | Connexion utilisateur | Non | email, password | 200, 400, 401, 500 |

### Cards
| Méthode | Endpoint | Description | Auth | Corps requête | Réponses |
|---------|----------|-------------|------|---------------|----------|
| GET | /api/cards | Liste toutes les cartes | Non | - | 200, 500 |

### Decks (Protégés - Bearer JWT)
| Méthode | Endpoint | Description | Auth | Corps requête | Réponses |
|---------|----------|-------------|------|---------------|----------|
| GET | /api/decks/mine | Liste les decks de l'utilisateur | JWT | - | 200, 401, 500 |
| GET | /api/decks/:id | Récupère un deck par ID | JWT | - | 200, 400, 401, 404, 500 |
| POST | /api/decks | Crée un nouveau deck (10 cartes) | JWT | name, cards | 201, 400, 401, 500 |
| PATCH | /api/decks/:id | Met à jour un deck | JWT | name?, cards? | 200, 400, 401, 404, 500 |
| DELETE | /api/decks/:id | Supprime un deck | JWT | - | 204, 400, 401, 404, 500 |

## Schémas à définir (OpenAPI Components)

> **Note** : Ces schémas OpenAPI sont pour la **documentation API** et sont différents du schéma **Prisma** (base de données). Les schémas Prisma définissent la structure de la BDD, tandis que les schémas OpenAPI définissent comment les données sont représentées dans les requêtes/réponses API.

### Schéma Prisma (Database - déjà existant)
Voir `prisma/schema.prisma` :
- `User` : id, username, email, password, createdAt, updatedAt
- `Card` : id, name, hp, attack, type, pokedexNumber, imgUrl, createdAt, updatedAt
- `Deck` : id, name, userId, createdAt, updatedAt
- `DeckCard` : id, deckId, cardId (relation many-to-many)

### Schémas OpenAPI (Documentation API - à créer)
Ce sont les schémas utilisés pour la documentation Swagger afin de :
- Décrire les formats de requêtes (requestBody)
- Décrire les formats de réponses (responses)
- Permettre de tester les endpoints depuis l'UI Swagger

### User
```yaml
User:
  type: object
  properties:
    id:
      type: integer
      example: 1
    username:
      type: string
      example: "Sacha"
    email:
      type: string
      format: email
      example: "sacha@pokemon.com"
```

### Card
```yaml
Card:
  type: object
  properties:
    id:
      type: integer
      example: 1
    name:
      type: string
      example: "Pikachu"
    hp:
      type: integer
      example: 60
    attack:
      type: integer
      example: 55
    type:
      type: string
      enum: [Normal, Fire, Water, Electric, Grass, Ice, Fighting, Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel, Fairy]
      example: "Electric"
    pokedexNumber:
      type: integer
      example: 25
    imgUrl:
      type: string
      nullable: true
      example: "https://example.com/pikachu.png"
```

### Deck
```yaml
Deck:
  type: object
  properties:
    id:
      type: integer
      example: 1
    name:
      type: string
      example: "Mon Deck"
    userId:
      type: integer
      example: 1
    cards:
      type: array
      items:
        $ref: '#/components/schemas/Card'
```

### DeckCard
```yaml
DeckCard:
  type: object
  properties:
    id:
      type: integer
    deckId:
      type: integer
    cardId:
      type: integer
    card:
      $ref: '#/components/schemas/Card'
```

### Error
```yaml
Error:
  type: object
  properties:
    error:
      type: string
      example: "Erreur serveur"
```

### SignUpRequest
```yaml
SignUpRequest:
  type: object
  required:
    - email
    - username
    - password
  properties:
    email:
      type: string
      format: email
      example: "sacha@pokemon.com"
    username:
      type: string
      example: "Sacha"
    password:
      type: string
      format: password
      minLength: 6
      example: "password123"
```

### SignInRequest
```yaml
SignInRequest:
  type: object
  required:
    - email
    - password
  properties:
    email:
      type: string
      format: email
      example: "sacha@pokemon.com"
    password:
      type: string
      format: password
      example: "password123"
```

### AuthResponse
```yaml
AuthResponse:
  type: object
  properties:
    message:
      type: string
    token:
      type: string
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    user:
      type: object
      properties:
        id:
          type: integer
        username:
          type: string
        email:
          type: string
```

### CreateDeckRequest
```yaml
CreateDeckRequest:
  type: object
  required:
    - name
    - cards
  properties:
    name:
      type: string
      example: "Mon Super Deck"
    cards:
      type: array
      items:
        type: integer
      minItems: 10
      maxItems: 10
      example: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

### UpdateDeckRequest
```yaml
UpdateDeckRequest:
  type: object
  properties:
    name:
      type: string
      example: "Nouveau Nom"
    cards:
      type: array
      items:
        type: integer
      minItems: 10
      maxItems: 10
      example: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

## Configuration de sécurité

### Bearer Auth
```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### Security Requirements
- Routes publiques (auth, cards): `security: []` (pas de sécurité)
- Routes protégées (decks): `security: [bearerAuth]`

## Points d'intégration

### src/index.ts
- Ajouter import swagger-ui-express
- Ajouter route: `app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(...))`
- Importer et fusionner les fichiers YAML de documentation

### Dépendances (déjà présentes)
- swagger-ui-express: ^5.0.1 ✓
- js-yaml: 4.1.1 ✓
- @types/js-yaml: 4.0.9 ✓ (dev)
- @types/swagger-ui-express: 4.1.8 ✓ (dev)

## Étapes d'implémentation

1. **Créer swagger.config.yml** dans un nouveau dossier `docs/`
   - Définir les métadonnées de l'API
   - Créer les schémas réutilisables
   - Configurer la sécurité Bearer

2. **Créer auth.doc.yml**
   - Documenter sign-up
   - Documenter sign-in
   - Définir les corps de requête et réponses

3. **Créer card.doc.yml**
   - Documenter GET /api/cards

4. **Créer deck.doc.yml**
   - Documenter les 5 endpoints
   - Ajouter la sécurité bearerAuth

5. **Modifier src/index.ts**
   - Importer swagger-ui-express
   - Charger et fusionner les YAML
   - Monter Swagger UI sur /api-docs

6. **Tester l'UI**
   - Accéder à http://localhost:PORT/api-docs
   - Vérifier le bouton "Authorize"
   - Tester les endpoints

## Notes

- Les routes /api/decks/* sont protégées par le middleware `authenticateToken` qui attend un token JWT dans l'en-tête `Authorization: Bearer <token>`
- Les erreurs 400, 401, 403, 404, 409, 500 doivent être documentées avec les messages d'erreur correspondants
- La création d'un deck requiert exactement 10 cartes