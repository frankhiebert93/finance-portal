import os

from fastapi import APIRouter, HTTPException
from supabase import Client, create_client

router = APIRouter()

# Load credentials
FINE_EDGE_URL = os.getenv("FINE_EDGE_DB_URL")
FINE_EDGE_KEY = os.getenv("FINE_EDGE_DB_KEY")

try:
    if FINE_EDGE_URL and FINE_EDGE_KEY:
        legacy_db: Client = create_client(FINE_EDGE_URL, FINE_EDGE_KEY)
    else:
        legacy_db = None
except Exception as e:
    legacy_db = None
    print(f"Failed to initialize legacy database client: {e}")

@router.get("/financials", response_model=dict)
def get_fine_edge_financials():
    if not legacy_db:
        raise HTTPException(
            status_code=500, 
            detail="Legacy database configuration is missing or invalid."
        )

    try:
        # We keep the ordering on the tables that work, but remove it from inventory to bypass the crash
        cash_box_res = legacy_db.table("cash_box").select("*").order("created_at", desc=True).limit(200).execute()
        invoices_res = legacy_db.table("parts_invoices").select("*").order("created_at", desc=True).limit(200).execute()
        
        # Removing .order("created_at") here!
        inventory_res = legacy_db.table("inventory").select("*").limit(200).execute()
        
        # --- CALCULATING METRICS ---
        total_invoiced = sum((item.get("total_amount") or 0) for item in invoices_res.data)
        total_cash = sum((item.get("amount") or 0) for item in cash_box_res.data)
        
        total_inventory_cost = sum(
            ((item.get("purchase_price") or 0) + 
             (item.get("shipping_in_cost") or 0) + 
             (item.get("import_fee") or 0)) 
            for item in inventory_res.data
        )
        
        total_purchase_iva = sum((item.get("purchase_iva") or 0) for item in inventory_res.data)
        total_retail_value = sum((item.get("sale_price") or 0) for item in inventory_res.data)

        return {
            "status": "success",
            "metrics": {
                "invoiced_revenue": total_invoiced,
                "cash_on_hand": total_cash,
                "inventory_total_cost": total_inventory_cost,
                "inventory_total_iva": total_purchase_iva,
                "inventory_retail_value": total_retail_value,
                "potential_profit_margin": total_retail_value - total_inventory_cost
            },
            "raw_data": {
                "cash_box": cash_box_res.data,
                "parts_invoices": invoices_res.data,
                "inventory": inventory_res.data
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch data from legacy database: {str(e)}"
        )