# VaanVizhi (வானவிழி) - 24/7 Cloud Deployment Guide

This repository is **100% production-ready** for immediate, zero-cost 24/7 hosting on any cloud platform.

---

## Option 1: Render.com (Recommended - 100% Free & Simplest)

Render provides free HTTPS hosting that stays online 24/7.

### Step 1: Create a GitHub Repository
1. Open [GitHub: New Repository](https://github.com/new).
2. Name it `vaanvizhi` (can be **Public** or **Private**).
3. Do **not** check "Add a README" (this repo already has one).
4. Click **Create repository**.

### Step 2: Push your Code to GitHub
Run these commands in your PowerShell / Terminal:
```powershell
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/vaanvizhi.git
git push -u origin main
```

### Step 3: Deploy on Render
1. Go to [dashboard.render.com](https://dashboard.render.com) and log in with GitHub.
2. Click **New +** -> **Web Service**.
3. Select your `vaanvizhi` repository.
4. Render will auto-detect settings from `render.yaml`. If filling manually:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. Click **Create Web Service**.
6. **Done!** Your platform will be live 24/7 at:
   `https://vaanvizhi.onrender.com`

---

## Option 2: Hugging Face Spaces (100% Free 24/7 - Never Sleeps)

Hugging Face Spaces provides permanent, non-sleeping 24/7 cloud CPU containers.

### Step 1: Create a Space
1. Go to [huggingface.co/new-space](https://huggingface.co/new-space).
2. Space name: `vaanvizhi`.
3. License: `mit` or `apache-2.0`.
4. Select Space SDK: **Docker** -> **Blank**.
5. Hardware: **CPU Basic (Free 2 vCPU · 16 GB RAM)**.
6. Visibility: **Public**.
7. Click **Create Space**.

### Step 2: Push to Hugging Face
```powershell
git remote add hf https://huggingface.co/spaces/YOUR_HF_USERNAME/vaanvizhi
git push hf main
```
Hugging Face builds `Dockerfile` automatically and serves the app 24/7 at:
`https://YOUR_HF_USERNAME-vaanvizhi.hf.space`

---

## Option 3: Koyeb / Railway (One-Click Docker)

1. Connect your GitHub repository to [Koyeb.com](https://www.koyeb.com) or [Railway.app](https://railway.app).
2. Select Dockerfile build.
3. Koyeb/Railway automatically spins up a container on `0.0.0.0:$PORT`.

---

## Included Deployment Files

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-platform Linux container with `libgomp1` and LightGBM pre-configured |
| `requirements.txt` | Lightweight, pinned production dependencies |
| `main.py` | Root entrypoint dynamically binding to host `$PORT` |
| `app.py` | Entrypoint alias for Hugging Face Spaces & ASGI servers |
| `render.yaml` | Render Blueprint for 1-click cloud orchestration |
| `Procfile` | Web process declaration for Heroku / Render / Koyeb |
| `.gitignore` / `.dockerignore` | Excludes 63MB training archives so git pushes are instant (<2s) |
