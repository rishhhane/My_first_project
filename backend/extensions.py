from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from sqlalchemy.engine import Engine
from sqlalchemy import event

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    # Only execute PRAGMA on SQLite connections.
    # Executing this on PostgreSQL will fail and abort the transaction.
    if dbapi_connection.__class__.__module__ == "sqlite3":
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        except Exception:
            pass