# 🔍 Smart Username Availability Checker using Bloom Filters

This is a system designed to check if a username is available — **fast**.  
Inspired by how companies like Google, Twitter, or Instagram check for username availability without hammering their database.

---

## ⚙️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Optimization**: Bloom Filter (custom-built)
- **Cache**: Redis (optional)
- **Frontend**: HTML + Bootstrap + Chart.js

---

## 🚀 Features

✅ Fast username availability checks  
✅ Uses Bloom Filters to avoid unnecessary DB hits  
✅ Optional Redis caching layer  
✅ Performance and memory usage **metrics dashboard**  
✅ Graph comparing **Bloom Filter vs MongoDB memory**  
✅ Simulate lookups for 1–100M users  

---

## 🧠 Why Bloom Filters?

Imagine asking, "Could this username possibly exist?" before bothering your expensive database or even the cache.

If the answer is **No** 💥 Boom! Instantly returns ✅ available without touching Redis, Mongo, or any DB. Like a bouncer saying, “Nope, they’re not on the list.”

If the answer is **Maybe** then, and only then, you check Redis or Mongo to confirm.

This is a game-changer at scale.

A Bloom Filter gives you lightning-fast “definitely not” answers using barely any memory.

Think: 1M usernames ≈ ~2 MB Bloom Filter, vs ~30 MB using a traditional index.

You're filtering out obvious "nope" cases before ever pinging your backend, saving memory, bandwidth, and CPU cycles.

It’s like having an efficient doorman who says “Don’t even ask inside” and 99% of the time, they’re absolutely right.



---

## 📷 Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/5c96ae97-2e7a-42d7-aef9-eed15fe5e31d" width="500" height="700" />
  <img src="https://github.com/user-attachments/assets/cb27ee3a-8384-4ece-9839-90f0824da22d" width="500" height="700" />
</p>


---

## 📈 Live Metrics Dashboard

- Compares response time of:
  - Bloom Filter
  - Direct DB lookup
- Visualizes memory usage of Bloom vs MongoDB
- Lets you simulate lookup behavior with millions of users

---

## 📂 Project Structure

```
├── express_api_service.js   # Main Express server
├── bloom_filter.js          # Custom Bloom filter class
├── public/
│   ├── index.html           # Main frontend
│   └── metrics.html         # Graphs and performance dashboard
└── README.md
```

---

## 🧪 How to Run Locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up MongoDB**
   - Add your connection string in `express_api_service.js` or use `MONGODB_URL` env variable.

3. **Run the app**
   ```bash
   node express_api_service.js
   ```

4. Visit:
   - `http://localhost:3000` → Username Checker  
   - `http://localhost:3000/metrics.html` → Metrics Dashboard

---

## 🛠 Optional: Redis Support

Redis is used to cache availability checks (e.g. `admin`, `elonmusk`) to reduce repeated DB lookups.

To enable:
```bash
docker run -d --name redis-local -p 6379:6379 redis
```

Then uncomment Redis lines in `express_api_service.js`.

---

## 💡 Inspiration

This project started as an experiment to understand how large systems optimize simple user actions like signups. Bloom filters offered a smart, scalable solution — and the rest is in the repo!

---

## 📫 Let's Connect

Made with ☕ by [Pratham Bhatia](https://github.com/prathambhatia)

---
