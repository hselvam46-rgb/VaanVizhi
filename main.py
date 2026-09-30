"""
VaanVizhi Root Application Entrypoint
Designed for 24/7 Cloud Deployments (Render, Hugging Face Spaces, Railway, Koyeb, Fly.io, AWS, VPS)
"""
import os
import sys

# Ensure root directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from vaanvizhi.serve.api import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8055))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[*] Starting VaanVizhi 24/7 Production Server on {host}:{port}...")
    uvicorn.run("main:app", host=host, port=port, reload=False)
