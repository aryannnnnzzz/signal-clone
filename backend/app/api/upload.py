import os
import uuid
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/upload", tags=["Upload"])

UPLOAD_DIR = Path("uploads")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """
    Upload a file/image attachment.
    Returns the URL and metadata to be attached to a message.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Read to verify size manually
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    # Secure filename
    ext = Path(file.filename).suffix
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / safe_name

    # Write to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "url": f"/uploads/{safe_name}",
        "name": file.filename,
        "size": size,
        "type": file.content_type or "application/octet-stream"
    }
