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

Instead of always checking the DB or cache, this system first asks:
> “Could this username *possibly* exist?”

- If **no** → instantly returns ✅ available  
- If **maybe** → checks Redis or Mongo  
- Saves memory and DB load, especially at scale  
- 1M usernames = **~2 MB Bloom Filter**, vs ~30 MB index

---

## 📷 Screenshots

<img src="https://github.com/user-attachments/assets/5c96ae97-2e7a-42d7-aef9-eed15fe5e31d" width="500" />


<img src="https://github.com/user-attachments/assets/cb27ee3a-8384-4ece-9839-90f0824da22d" width="500" />

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

Made with ☕ by [Pratham Bhatia](https://github.com/your-username)

---
