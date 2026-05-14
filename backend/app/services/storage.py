import os
import tempfile

import aiofiles
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

from app.config import settings

class StorageService:
    def __init__(self):
        self.use_s3 = settings.USE_S3
        self._local_fallback_active = False
        if self.use_s3:
            self.s3 = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            self.bucket = settings.AWS_BUCKET_NAME
        self._ensure_local_dirs()

    @property
    def using_s3(self) -> bool:
        return self.use_s3 and not self._local_fallback_active and bool(getattr(self, "bucket", None))

    def _ensure_local_dirs(self):
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        os.makedirs(settings.RESULTS_DIR, exist_ok=True)

    def _activate_local_fallback(self, exc: Exception):
        if not self._local_fallback_active:
            print(f"⚠️  Storage fallback activated; continuing with local files. Reason: {exc}")
        self._local_fallback_active = True
        self._ensure_local_dirs()

    async def save_upload(self, file_name: str, contents: bytes) -> str:
        """Saves file and returns the path/key."""
        if self.using_s3:
            key = f"uploads/{file_name}"
            try:
                self.s3.put_object(Bucket=self.bucket, Key=key, Body=contents)
                return key
            except (BotoCoreError, ClientError, OSError) as exc:
                self._activate_local_fallback(exc)

        path = os.path.join(settings.UPLOAD_DIR, file_name)
        async with aiofiles.open(path, "wb") as f:
            await f.write(contents)
        return file_name

    async def save_result(self, file_name: str, contents: str):
        if self.using_s3:
            key = f"results/{file_name}"
            try:
                self.s3.put_object(Bucket=self.bucket, Key=key, Body=contents.encode('utf-8'))
                return
            except (BotoCoreError, ClientError, OSError) as exc:
                self._activate_local_fallback(exc)

        path = os.path.join(settings.RESULTS_DIR, file_name)
        async with aiofiles.open(path, "w") as f:
            await f.write(contents)

    async def load_result(self, file_name: str) -> str:
        if self.using_s3:
            try:
                response = self.s3.get_object(Bucket=self.bucket, Key=f"results/{file_name}")
                return response['Body'].read().decode('utf-8')
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") == "NoSuchKey":
                    raise HTTPException(404, "Job not found") from exc
                self._activate_local_fallback(exc)
            except (BotoCoreError, OSError) as exc:
                self._activate_local_fallback(exc)

        path = os.path.join(settings.RESULTS_DIR, file_name)
        if not os.path.exists(path):
            raise HTTPException(404, "Job not found")
        async with aiofiles.open(path, "r") as f:
            return await f.read()

    def get_upload_url(self, file_name: str) -> str:
        """Get the URL to serve the image/video to the frontend."""
        if self.using_s3:
            return f"https://{self.bucket}.s3.{settings.AWS_REGION}.amazonaws.com/uploads/{file_name}"
        return f"/uploads/{file_name}"

    async def get_local_path(self, file_name: str, expected_prefix="uploads/") -> str:
        """
        Returns a local filesystem path for the requested file.
        If using S3, it downloads the file to a temp directory and returns that path.
        NOTE: The caller is responsible for deleting the temp file after use!
        """
        if self.using_s3:
            try:
                response = self.s3.get_object(Bucket=self.bucket, Key=f"{expected_prefix}{file_name}")
                contents = response['Body'].read()
                ext = os.path.splitext(file_name)[1]
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
                temp_file.write(contents)
                temp_file.close()
                return temp_file.name
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") == "NoSuchKey":
                    raise HTTPException(404, "File not found") from exc
                self._activate_local_fallback(exc)
            except (BotoCoreError, OSError) as exc:
                self._activate_local_fallback(exc)

        if expected_prefix.startswith("uploads"):
            path = os.path.join(settings.UPLOAD_DIR, file_name)
        else:
            path = os.path.join(settings.RESULTS_DIR, file_name)
        if not os.path.exists(path):
            raise HTTPException(404, "File not found")
        return path

    def cleanup_local_path(self, path: str):
        """Helper to cleanup temp files if S3 was used."""
        if self.using_s3 and path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

storage_client = StorageService()
