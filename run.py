import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))
try:
    from backend.app import app
except Exception:
    traceback.print_exc()
    sys.exit(1)
