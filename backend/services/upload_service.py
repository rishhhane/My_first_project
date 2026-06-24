import os
from uuid import uuid4
from werkzeug.utils import secure_filename

class UploadService:
    # 1. Define strict security configurations
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 Megabytes limit constraint
    UPLOAD_FOLDER = os.path.join('static', 'uploads', 'avatars')

    @classmethod
    def allowed_file(cls, filename):
        """
        Validates file signature suffix extensions.
        """
        return '.' in filename and \
            filename.rsplit('.', 1)[1].lower() in cls.ALLOWED_EXTENSIONS

    @classmethod
    def save_avatar(cls, file):
        """
        Validates, sanitizes, and writes an uploaded file stream to disk storage.
        Returns a structured relative path dictionary package string payload.
        """
        try:
            if not file or file.filename == '':
                return {"error": "No file stream chunk provided in parameter context", "status_code": 400}

            # 1. Validate File Size Boundaries (seek to end of stream block, then reset pointer offset)
            file.seek(0, os.SEEK_END)
            file_length = file.tell()
            file.seek(0)  # Reset file buffer pointer back to absolute start checkpoint

            if file_length > cls.MAX_FILE_SIZE:
                return {"error": "File size exceeds authorization limit framework of 5MB", "status_code": 413}

            # 2. Enforce File Extension Signature Security White-lists
            if not cls.allowed_file(file.filename):
                return {
                    "error": "Forbidden file format type extension constraint mismatch", 
                    "details": f"Authorized standard configurations allow: {list(cls.ALLOWED_EXTENSIONS)}",
                    "status_code": 400
                }

            # 3. Sanitize filename string elements to neutralize directory traversal attack vectors
            original_name = secure_filename(file.filename)
            extension = original_name.rsplit('.', 1)[1].lower()
            
            # Formulate cryptographically unique uuid naming pattern to avoid namespace overwrites
            secure_unique_name = f"{uuid4().hex}.{extension}"

            # 4. Automate local environment physical destination layout folders setup if absent
            if not os.path.exists(cls.UPLOAD_FOLDER):
                os.makedirs(cls.UPLOAD_FOLDER, exist_ok=True)

            # Generate target destination workspace path
            physical_destination_filepath = os.path.join(cls.UPLOAD_FOLDER, secure_unique_name)
            
            # 5. Commit write execution directly onto permanent disk block configurations
            file.save(physical_destination_filepath)

            # Formulate uniform relative URL web routing path layout asset address link properties
            web_accessible_url = f"static/uploads/avatars/{secure_unique_name}"

            return {
                "message": "Visual avatar file uploaded and processed cleanly!",
                "photo_url": web_accessible_url,
                "filename": secure_unique_name,
                "status_code": 200
            }

        except Exception as e:
            return {
                "error": "File processing framework encountered a runtime exception", 
                "details": str(e), 
                "status_code": 500
            }