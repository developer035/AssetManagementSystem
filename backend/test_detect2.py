import asyncio
from app.routers.detection import extract_geo_transform
from app.services.storage import storage_client
from app.models.detector import AssetDetector
from app.config import settings

async def test():
    file_name = "test_satellite.jpg"
    with open(file_name, "rb") as f:
        contents = f.read()
    print("saving upload...")
    await storage_client.save_upload(file_name, contents)
    print("getting local path...")
    local_path = await storage_client.get_local_path(file_name)
    geo_transform = extract_geo_transform(local_path)
    
    print("loading model...")
    detector = AssetDetector(model_path=settings.MODEL_PATH)
    print("detecting...")
    from PIL import Image
    import io
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    
    from fastapi.concurrency import run_in_threadpool
    result = await run_in_threadpool(
        detector.detect,
        image,
        0.35,
        True,
        geo_transform,
    )
    print("result keys:", result.keys())

asyncio.run(test())
