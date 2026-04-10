from pathlib import Path
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# Output: parent level 1
BASE_DIR = Path(__file__).resolve().parents[1]

# Load environment variables from .env file
load_dotenv(BASE_DIR / ".env")

# INPUT: tên biến môi trường
# OUTPUT: string (giá trị biến hoặc default nếu không tồn tại)
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB = os.getenv("MONGODB_DB", "traffic_system")
MONGODB_SENSOR_COLLECTION = os.getenv("MONGODB_SENSOR_COLLECTION", "sensor_history")


# Biến global để cache (tránh tạo lại connection nhiều lần)
_client = None
_db = None
_sensor_collection = None


def init_mongodb():
    """
    Khởi tạo kết nối MongoDB và cache các đối tượng cần thiết.

    """
    global _client, _db, _sensor_collection

    if _db is not None:
        return _db
    
    if not MONGODB_URI:
        raise ValueError("MONGODB_URI is not set in backend/.env")
    
    # Tạo MongoDB client với Server API version 1 để đảm bảo tương thích với MongoDB Atlas
    _client = MongoClient(MONGODB_URI, server_api=ServerApi('1'))
    _client.admin.command('ping')

    # Get database and collection objects
    _db = _client[MONGODB_DB]
    _sensor_collection = _db[MONGODB_SENSOR_COLLECTION]

    return _db

def get_sensor_collection():
    """
    Trả về đối tượng collection để thao tác với dữ liệu cảm biến.

    """
    if _sensor_collection is None:
        init_mongodb()

    return _sensor_collection


def check_mongodb_connection():
    """
    Kiểm tra kết nối MongoDB bằng cách ping server.

    Trả về (True, None) nếu kết nối thành công, (False, error_message) nếu có lỗi.
    """
    try:
        if _client is None:
            init_mongodb()
        _client.admin.command('ping')
        return True, None
    except Exception as e:
        return False, str(e)

