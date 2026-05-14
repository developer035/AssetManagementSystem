import os
import sys
import asyncio
from dotenv import load_dotenv

# Load env vars
load_dotenv(".env")

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.storage import storage_client

async def test_s3():
    try:
        print("Testing S3 Upload...")
        test_content = b"Hello S3 Integration Test!"
        test_filename = "test_end_to_end.txt"
        
        # 1. Test save_upload
        key = await storage_client.save_upload(test_filename, test_content)
        print(f"✅ Upload successful. Key: {key}")
        
        # 2. Test get_local_path (download)
        print("Testing S3 Download...")
        local_path = await storage_client.get_local_path(test_filename)
        print(f"✅ Download successful. Temp file: {local_path}")
        
        with open(local_path, "rb") as f:
            downloaded_content = f.read()
            if downloaded_content == test_content:
                print("✅ Content verified successfully!")
            else:
                print("❌ Content mismatch!")
                
        # Cleanup temp file
        storage_client.cleanup_local_path(local_path)
        print("✅ Temp file cleaned up.")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_s3())
