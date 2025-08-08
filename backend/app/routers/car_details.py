from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/car_details", tags=["car_details"])


class CarDetails(BaseModel):
	leg_id: int
	driving_time_seconds: int | None = None
	polyline: str | None = None


class CarDetailsUpdate(BaseModel):
	driving_time_seconds: int | None = None
	polyline: str | None = None


@router.get("/{leg_id}")
def get_car_details(leg_id: int):
	conn = get_db()
	cur = conn.cursor()
	cur.execute(
		"""
		SELECT leg_id, driving_time_seconds, polyline
		FROM car_details
		WHERE leg_id = %s
		""",
		(leg_id,),
	)
	row = cur.fetchone()
	cur.close()
	conn.close()

	if not row:
		raise HTTPException(status_code=404, detail="Car details not found")

	return {
		"leg_id": row["leg_id"],
		"driving_time_seconds": row["driving_time_seconds"],
		"polyline": row["polyline"],
	}


@router.post("/")
def create_car_details(details: CarDetails):
	conn = get_db()
	cur = conn.cursor()
	cur.execute(
		"""
		INSERT INTO car_details (leg_id, driving_time_seconds, polyline)
		VALUES (%s, %s, %s)
		ON CONFLICT (leg_id) DO UPDATE SET
			driving_time_seconds = EXCLUDED.driving_time_seconds,
			polyline = EXCLUDED.polyline
		RETURNING leg_id
		""",
		(details.leg_id, details.driving_time_seconds, details.polyline),
	)
	row = cur.fetchone()
	conn.commit()
	cur.close()
	conn.close()

	return {"message": f"Car details saved for leg {row['leg_id']}"}


@router.put("/{leg_id}")
def update_car_details(leg_id: int, update: CarDetailsUpdate):
	data = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
	allowed = {"driving_time_seconds", "polyline"}
	data = {k: v for k, v in data.items() if k in allowed}
	if not data:
		raise HTTPException(status_code=400, detail="No fields provided for update")

	set_clauses = ", ".join([f"{col} = %s" for col in data.keys()])
	params = list(data.values()) + [leg_id]

	conn = get_db()
	cur = conn.cursor()
	cur.execute(f"UPDATE car_details SET {set_clauses} WHERE leg_id = %s RETURNING leg_id", params)
	row = cur.fetchone()
	conn.commit()
	cur.close()
	conn.close()

	if not row:
		raise HTTPException(status_code=404, detail="Car details not found")

	return {"message": f"Car details for leg {leg_id} updated"}


@router.delete("/{leg_id}")
def delete_car_details(leg_id: int):
	conn = get_db()
	cur = conn.cursor()
	cur.execute("DELETE FROM car_details WHERE leg_id = %s RETURNING leg_id", (leg_id,))
	row = cur.fetchone()
	conn.commit()
	cur.close()
	conn.close()

	if not row:
		raise HTTPException(status_code=404, detail="Car details not found")

	return {"message": f"Car details for leg {leg_id} deleted"}

