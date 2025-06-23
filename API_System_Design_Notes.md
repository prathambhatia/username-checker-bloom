
# 🌐 API in System Design – Obsidian Notes

> [!info] **What is an API?**  
> An **API (Application Programming Interface)** lets two software systems talk to each other. Think of it like a restaurant menu: you tell the system what you want, and it delivers the result — no need to know the kitchen details.

---

## 🔄 What is a REST API?

> **REST** = **Representational State Transfer**

- A design style for building APIs using standard HTTP methods.
- Each "resource" (like a user, product, or order) has a URL.
- Operations on resources use HTTP verbs: `GET`, `POST`, `PUT`, `DELETE`.

**Example:**
- `GET /users/1` → Get user with ID 1
- `POST /orders` → Create a new order

> 💬 **Interview Tip:**  
> "REST is resource-based, stateless, and relies on standard HTTP protocols."

---

## 🔎 What is GraphQL?

- **Query language** for APIs (developed by Facebook).
- Instead of fixed endpoints, clients **ask for exactly what they need**.
- Uses a single POST endpoint: `/graphql`

**Example Query:**
```graphql
{
  user(id: 1) {
    name
    email
    orders {
      id
      total
    }
  }
}
```

> 💬 **Interview Tip:**  
> "GraphQL avoids over-fetching and under-fetching by letting clients shape the response."

---

## 🔑 Core Concepts

### 🧩 Endpoints
- Each API has **endpoints**, which are like specific “doors” you knock on.
- Example: `GET /users`, `POST /orders`

### 🗃️ HTTP Methods
| Method | What it does              | Example Use       |
|--------|---------------------------|-------------------|
| GET    | Read data                 | Get user profile  |
| POST   | Create new data           | Register user     |
| PUT    | Update entire data object | Edit full order   |
| PATCH  | Update part of data       | Edit just status  |
| DELETE | Remove data               | Cancel order      |

---

## 🔐 API Authentication

### 🔒 Types of Auth:
- **API Key**
- **OAuth 2.0**
- **JWT (JSON Web Token)**

> 💬 **Interview Tip:**  
> "I use JWT for stateless auth in microservices to avoid DB lookups on each request."

---

## 📦 API Rate Limiting

- **Why:** Prevent abuse, manage resources
- **How:** Token Bucket, Fixed Window, etc.
- **Tools:** Redis, NGINX, Cloudflare, API Gateway

---

## ⚔️ REST vs GraphQL vs RPC

| Feature        | REST                     | gRPC/RPC                  | GraphQL                    |
|----------------|--------------------------|----------------------------|----------------------------|
| Style          | Resource-based           | Procedure-based            | Query-based                |
| Data           | JSON                     | Protobuf                   | JSON                       |
| Flexibility    | Fixed per endpoint       | Fast & lightweight         | Extremely flexible         |
| Use Case       | Web apps, CRUD           | Internal services          | Frontend-heavy apps        |

---

## 💬 Common Interview Questions & Answers

### 1. What is a REST API?
**Answer:** A REST API follows resource-based URL patterns and uses HTTP verbs to perform operations. It’s stateless and simple to implement.

### 2. When would you choose GraphQL over REST?
**Answer:** When frontend teams need flexibility and want to reduce over-fetching/under-fetching problems, GraphQL shines.

### 3. Difference between PUT and PATCH?
**Answer:** `PUT` replaces the whole object. `PATCH` updates only the fields sent.

### 4. What is an API Gateway and why use it?
**Answer:** It’s the entry point for all clients. It handles routing, auth, rate limiting, caching, etc.

### 5. How do you secure APIs?
**Answer:** Auth (OAuth2, JWT), HTTPS, rate limiting, input validation, and API Gateway policies.

### 6. How would you scale an API-heavy backend?
**Answer:** Use load balancers, caching, horizontal scaling, CDN, and asynchronous queues.

### 7. What’s the difference between REST and RPC?
**Answer:** REST is resource-based (`GET /users/1`), RPC is function-based (`getUser(1)`).

---

## ✅ API Best Practices

- Version your APIs: `/v1/users`
- Use proper HTTP codes: 200, 201, 400, 404, 500
- Document using **Swagger/OpenAPI**
- Use **pagination**, **filtering**, **rate limiting**
- Ensure **idempotency** for `PUT`, `DELETE`

---

## 🧱 Real-World E-commerce Example

| Endpoint         | Description                 |
|------------------|-----------------------------|
| GET /products     | List all products           |
| GET /products/:id | Get one product             |
| POST /cart        | Add item to cart            |
| GET /orders       | List user orders            |
| POST /checkout    | Start payment process       |

---

## 🔭 Tools to Know

- **Postman** – API testing
- **Swagger / OpenAPI** – Docs
- **Kong / NGINX / API Gateway** – Management
- **Redis** – Rate limiting, caching

---

## 🧠 GraphQL Example

### 🧾 Use Case:
Get user info (name, email) and their 2 most recent orders.

### ✅ GraphQL Query:
```graphql
{
  user(id: "123") {
    name
    email
    orders(limit: 2) {
      id
      total
    }
  }
}
```

### ✅ Response:
```json
{
  "data": {
    "user": {
      "name": "Pratham Bhatia",
      "email": "pratham@example.com",
      "orders": [
        { "id": "order_001", "total": 1999 },
        { "id": "order_002", "total": 999 }
      ]
    }
  }
}
```

---

### 📊 REST vs GraphQL (Recap)

| Feature                | REST                        | GraphQL                                  |
|------------------------|-----------------------------|-------------------------------------------|
| Number of Endpoints    | Many (one per resource)     | One (`/graphql`)                          |
| Over-fetching?         | Yes                         | No (fetch exactly what you ask for)       |
| Multiple requests?     | Often needed                | Single request                            |
| Frontend Flexibility   | Limited                     | High (frontend controls shape of data)    |
| Versioning             | Via URL (`/v1`)             | Not required (fields can evolve)          |

---

> 💬 **Interview Tip:**  
> "I’d use GraphQL when the frontend needs control over data shape, especially for mobile clients where over-fetching hurts performance."

