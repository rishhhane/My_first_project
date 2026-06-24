import os
from dotenv import load_dotenv

# Force load the .env file from the current directory
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'static/uploads/photos')