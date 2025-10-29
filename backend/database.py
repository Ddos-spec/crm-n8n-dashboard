import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD')
}

@contextmanager
def get_db_connection():
    """Context manager untuk koneksi database"""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        yield conn
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()

def test_connection():
    """Test koneksi database"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT 1')
                return True
    except Exception as e:
        print(f"Database connection error: {e}")
        return False