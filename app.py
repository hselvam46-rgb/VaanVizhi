"""
VaanVizhi Application Alias Entrypoint
Compatible with Hugging Face Spaces, Render, and Python WSGI/ASGI runners.
"""
from main import app

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 7860))  # 7860 is default port for Hugging Face Spaces
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("app:app", host=host, port=port, reload=False)
