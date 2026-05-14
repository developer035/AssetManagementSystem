import asyncio
from app.routers.detection import extract_geo_transform
from app.services.storage import storage_client

async def test():
    file_name = "test_satellite.jpg"
    with open(file_name, "rb") as f:
        contents = f.read()
    print("saving upload...")
    await storage_client.save_upload(file_name, contents)
    print("getting local path...")
    local_path = await storage_client.get_local_path(file_name)
    print("local path:", local_path)
    geo_transform = extract_geo_transform(local_path)
    print("geo_transform:", geo_transform)

asyncio.run(test())
