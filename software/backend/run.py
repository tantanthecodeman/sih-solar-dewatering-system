import os
import sys
from app import create_app

# Add current directory to Python path for model loading
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = create_app()

if __name__ == "__main__":
    print("🚀 Starting Solar Dewatering System API...")
    print("📡 API will be available at: http://127.0.0.1:5000")
    print("📊 Dashboard endpoints:")
    print("   - Status: http://127.0.0.1:5000/api/status")
    print("   - AI Info: http://127.0.0.1:5000/api/ai-status")
    print("   - Health: http://127.0.0.1:5000/api/health")
    print("="*50)
    
    app.run(
        debug=True, 
        host="0.0.0.0", 
        port=5000,
        threaded=True
    )