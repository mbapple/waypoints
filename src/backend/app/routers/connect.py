## Connection to the postgres database to be utilized by router files


# app/database.py
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db():
    #print("Connecting to the database...")
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "172.17.0.1"),
        database=os.getenv("DB_NAME", "travel_database"),
        user=os.getenv("DB_USER", "user"),
        password=os.getenv("DB_PASS", "password"),
        cursor_factory=RealDictCursor
    )
    #print("Returning database connection", conn)
    return conn
