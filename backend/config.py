import os
from dotenv import load_dotenv

# Force load the .env file from the current directory
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Render database URLs start with postgres://, but SQLAlchemy 1.4+ requires postgresql://
    db_url = os.environ.get('DATABASE_URL')
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'static/uploads/photos')