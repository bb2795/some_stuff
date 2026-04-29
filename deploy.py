#!/usr/bin/env python3
"""
deploy.py — Start the full KB Creation Workflow stack

Services started:
  1. RAG2 Knowledge Base API   → http://localhost:8080  (flask_api_engine)
  2. RAG2 RAG Pipeline API     → http://localhost:8081  (flask_rag_pipe)
  3. Extraction Agent API      → http://localhost:8000  (extraction middleware)
  4. KB Creation Workflow UI   → http://localhost:5173  (Vite + React)

Usage:
    python deploy.py
"""

import subprocess
import sys
import os
import time
import webbrowser

PROJECT_DIR  = os.path.dirname(os.path.abspath(__file__))
RAG2_ROOT    = os.path.join(PROJECT_DIR, "..", "RAG2", "202603_BITUN_DATA_ACCESS_PROJECT")
KB_SVC_DIR   = os.path.join(RAG2_ROOT, "knowledge_base")
RAG_SVC_DIR  = os.path.join(RAG2_ROOT, "RAG")
EXTRACT_DIR  = os.path.join(PROJECT_DIR, "..", "extraction agent v2", "extraction_experiments")
VITE_PORT    = 5173
PROCS        = []


def run(cmd, cwd=None, **kwargs):
    return subprocess.run(cmd, cwd=cwd or PROJECT_DIR, shell=True, **kwargs)


# ─── Environment checks ───────────────────────────────────────────────────────

def check_node():
    result = run("node --version", capture_output=True, text=True)
    if result.returncode != 0:
        print("  ERROR: Node.js not found. Download from https://nodejs.org/")
        sys.exit(1)
    print(f"  Node.js {result.stdout.strip()}")


def check_npm():
    result = run("npm --version", capture_output=True, text=True)
    if result.returncode != 0:
        print("  ERROR: npm not found.")
        sys.exit(1)
    print(f"  npm v{result.stdout.strip()}")


def check_python():
    result = run("python --version", capture_output=True, text=True)
    print(f"  {result.stdout.strip() or result.stderr.strip()}")


def check_rag2_dirs():
    missing = [d for d in [KB_SVC_DIR, RAG_SVC_DIR] if not os.path.isdir(d)]
    if missing:
        print(f"\n  WARNING: RAG2 service directories not found:")
        for d in missing:
            print(f"    {d}")
        print("  The UI will still launch but real upload/Q&A will be unavailable.")
        return False
    return True


# ─── Dependency installation ─────────────────────────────────────────────────

def install_npm_deps():
    node_modules = os.path.join(PROJECT_DIR, "node_modules")
    if os.path.isdir(node_modules):
        print("  node_modules present — skipping npm install.")
    else:
        print("  Running npm install...")
        result = run("npm install")
        if result.returncode != 0:
            print("  ERROR: npm install failed.")
            sys.exit(1)
        print("  npm dependencies installed.")


# ─── Service launchers ────────────────────────────────────────────────────────

def start_kb_service():
    """Start the RAG2 Knowledge Base FastAPI service on :8080."""
    if not os.path.isdir(KB_SVC_DIR):
        print("  SKIP: knowledge_base/ directory not found.")
        return None
    print(f"  Launching KB service → http://localhost:8080")
    proc = subprocess.Popen(
        "python -m uvicorn flask_api_engine:app --host 0.0.0.0 --port 8080",
        cwd=KB_SVC_DIR,
        shell=True,
    )
    PROCS.append(proc)
    return proc


def start_rag_service():
    """Start the RAG2 Pipeline FastAPI service on :8081."""
    if not os.path.isdir(RAG_SVC_DIR):
        print("  SKIP: RAG/ directory not found.")
        return None
    print(f"  Launching RAG pipeline service → http://localhost:8081")
    proc = subprocess.Popen(
        "python -m uvicorn flask_rag_pipe:app --host 0.0.0.0 --port 8081",
        cwd=RAG_SVC_DIR,
        shell=True,
    )
    PROCS.append(proc)
    return proc


def start_extraction_service():
    """Start the Extraction Agent FastAPI service on :8000."""
    if not os.path.isdir(EXTRACT_DIR):
        print("  SKIP: extraction agent v2 directory not found.")
        return None
    print(f"  Launching Extraction Agent → http://localhost:8000")
    proc = subprocess.Popen(
        "python -m uvicorn middleware.api:app --host 0.0.0.0 --port 8000",
        cwd=EXTRACT_DIR,
        shell=True,
    )
    PROCS.append(proc)
    return proc


def start_vite():
    """Start the Vite dev server and block until Ctrl+C."""
    print(f"\n  Launching Vite UI → http://localhost:{VITE_PORT}/")
    proc = subprocess.Popen(
        "npm run dev -- --host",
        cwd=PROJECT_DIR,
        shell=True,
    )
    PROCS.append(proc)

    time.sleep(2)
    webbrowser.open(f"http://localhost:{VITE_PORT}/")

    try:
        proc.wait()
    except KeyboardInterrupt:
        pass


def stop_all():
    print("\n\n  Stopping all services…")
    for p in PROCS:
        try:
            p.terminate()
        except Exception:
            pass
    print("  Done.")


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 56)
    print("  KB Creation Workflow — Full Stack Deploy")
    print("=" * 56)

    print("\n[1/5] Checking environment...")
    check_python()
    check_node()
    check_npm()
    rag2_ok = check_rag2_dirs()

    print("\n[2/5] Installing frontend dependencies...")
    install_npm_deps()

    print("\n[3/5] Starting RAG2 backend services...")
    if rag2_ok:
        start_kb_service()
        time.sleep(1)
        start_rag_service()
        time.sleep(1)
        print("  KB service  → http://localhost:8080")
        print("  RAG service → http://localhost:8081")
    else:
        print("  RAG2 services skipped (directory not found).")
        print("  Upload and Q&A features will show connection errors in the UI.")

    print("\n[4/5] Starting Extraction Agent...")
    if os.path.isdir(EXTRACT_DIR):
        start_extraction_service()
        time.sleep(1)
        print("  Extraction → http://localhost:8000")
    else:
        print("  Extraction Agent skipped (directory not found).")
        print("  Document extraction features will be unavailable.")

    print("\n[5/5] Starting frontend...")
    try:
        start_vite()
    finally:
        stop_all()
