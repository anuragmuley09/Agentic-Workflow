import re
import csv
from datetime import datetime
import pdfplumber

def parse_date(date_str: str) -> str:
    """Parses various date formats and converts to ISO standard YYYY-MM-DD."""
    clean_str = date_str.strip()
    # Try common formats
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(clean_str, fmt).date().isoformat()
        except ValueError:
            continue
            
    # Try parsing month names (e.g., 1 January 2026, Jan 1 2026)
    for fmt in ("%d %B %Y", "%d %b %Y", "%b %d %Y", "%B %d %Y"):
        try:
            return datetime.strptime(clean_str, fmt).date().isoformat()
        except ValueError:
            continue
            
    # Default fallback
    return clean_str

def normalize_merchant_name(name: str) -> str:
    """Cleans up and normalizes merchant names according to report specification."""
    s = name.upper()
    
    # Remove common corporate suffixes and words
    s = re.sub(r'\b(PVT|LTD|INC|LLP|CO|CORP|GMBH|S\.A\.|LIMITED|INCORPORATED)\b\.?', '', s)
    s = re.sub(r'\b(PAYMENTS|INDIA|MKTPLACE|PMTS|BILLING|RETAIL|ONLINE|SHOPPING|STORE|INTL|WWW\.)\b\.?', '', s)
    s = re.sub(r'\.COM\b', '', s)
    
    # Remove trailing digits/store codes/transaction hashes/dates
    s = re.sub(r'[\d\-#/]+$', '', s)
    
    # Clean up excess spaces
    s = re.sub(r'\s+', ' ', s).strip()
    
    # Exact mappings for typical case study merchants
    mappings = {
        "SWIGGY": "Swiggy Instamart",
        "UBER": "Uber",
        "AMAZON": "Amazon",
        "AMZN": "Amazon",
        "NETFLIX": "Netflix",
        "APOLLO PHARMACY": "Apollo Pharmacy",
        "ZOMATO": "Zomato",
        "BOOKMYSHOW": "BookMyShow",
        "TATA POWER": "Tata Power",
        "TATA": "Tata Power"
    }
    
    for key, normalized in mappings.items():
        if key in s:
            return normalized
            
    return s.title() if s else "Other Merchant"

def parse_csv_statement(file_path: str) -> list[dict]:
    """Parses a CSV bank statement sheet, normalizes column names, and returns structured records."""
    transactions = []
    
    with open(file_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = {h.lower().replace(" ", "_").replace("transaction_", ""): h for h in reader.fieldnames or []}
        
        # Resolve dynamic headers
        date_col = next((headers[k] for k in headers if k in ("date", "booking_date", "value_date")), None)
        desc_col = next((headers[k] for k in headers if k in ("description", "merchant", "narrative", "details", "name", "category")), None)
        amt_col = next((headers[k] for k in headers if k in ("amount", "value", "price")), None)
        dir_col = next((headers[k] for k in headers if k in ("direction", "type")), None)
        
        if not (date_col and desc_col and amt_col):
            # Fallback: assume first 3 columns are Date, Description, Amount
            date_col = reader.fieldnames[0] if len(reader.fieldnames) > 0 else None
            desc_col = reader.fieldnames[1] if len(reader.fieldnames) > 1 else None
            amt_col = reader.fieldnames[2] if len(reader.fieldnames) > 2 else None
            
        if not (date_col and desc_col and amt_col):
            raise ValueError("CSV statement does not contain identifiable Date, Description, and Amount columns.")
            
        for row in reader:
            raw_date = row.get(date_col, "")
            raw_desc = row.get(desc_col, "")
            raw_amt = row.get(amt_col, "0.0")
            
            if not raw_date or not raw_desc:
                continue
                
            clean_date = parse_date(raw_date)
            normalized_desc = normalize_merchant_name(raw_desc)
            
            try:
                # Clean up currency characters
                clean_amt_str = raw_amt.replace("₹", "").replace("$", "").replace(",", "").strip()
                amount = float(clean_amt_str)
            except ValueError:
                amount = 0.0
                
            # Determine debit/credit
            direction = "debit"
            if dir_col:
                direction = row.get(dir_col, "debit").lower()
            elif amount < 0:
                direction = "debit"
                amount = abs(amount)
            elif "refund" in raw_desc.lower() or "credit" in raw_desc.lower() or "deposit" in raw_desc.lower():
                direction = "credit"
                
            transactions.append({
                "date": clean_date,
                "description": normalized_desc,
                "amount": amount,
                "direction": direction
            })
            
    return deduplicate_transactions(transactions)

def parse_pdf_statement(file_path: str) -> list[dict]:
    """Extracts tables and lines from PDF statement, normalizes content and parses rows."""
    transactions = []
    date_pattern = re.compile(r'(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})|(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})')
    
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    row_str = [str(cell).strip() for cell in row if cell is not None]
                    if not row_str:
                        continue
                        
                    date_val = None
                    for cell in row_str:
                        match = date_pattern.search(cell)
                        if match:
                            date_val = parse_date(match.group(0))
                            break
                            
                    if date_val:
                        # Find amount candidates (numbers with optional decimals)
                        amount_candidates = []
                        for cell in row_str:
                            if cell == date_val:
                                continue
                            # Clean currency symbols
                            clean_cell = cell.replace("₹", "").replace("$", "").replace(",", "").strip()
                            # Check if matches numeric/float pattern (allowing negative sign)
                            if re.match(r'^-?\d+(\.\d{2})?$', clean_cell):
                                try:
                                    amount_candidates.append((cell, float(clean_cell)))
                                except ValueError:
                                    continue
                                    
                        if amount_candidates:
                            amount_val = amount_candidates[-1][1]
                            # Longest non-date, non-amount cell is description
                            desc_cells = [c for c in row_str if c != date_val and c != amount_candidates[-1][0]]
                            desc_val = " ".join(desc_cells).strip() if desc_cells else "Unknown Transaction"
                            
                            direction = "debit"
                            if amount_val < 0:
                                direction = "debit"
                                amount_val = abs(amount_val)
                            elif "refund" in desc_val.lower() or "salary" in desc_val.lower():
                                direction = "credit"
                                
                            transactions.append({
                                "date": date_val,
                                "description": normalize_merchant_name(desc_val),
                                "amount": amount_val,
                                "direction": direction
                            })
                            
            # Fallback to Text extraction if table method returned nothing
            if not transactions:
                text = page.extract_text()
                if text:
                    for line in text.split("\n"):
                        match = date_pattern.search(line)
                        if match:
                            date_val = parse_date(match.group(0))
                            line_no_date = line.replace(match.group(0), "").strip()
                            
                            # Find amount (e.g. 1500.00, -320)
                            amount_match = re.search(r'[-+]?\s*\d[\d,]*\.\d{2}', line_no_date)
                            if amount_match:
                                amount_str = amount_match.group(0)
                                amount_val = float(amount_str.replace(" ", "").replace(",", ""))
                                desc_val = line_no_date.replace(amount_str, "").strip()
                                
                                direction = "debit"
                                if amount_val < 0:
                                    direction = "debit"
                                    amount_val = abs(amount_val)
                                    
                                transactions.append({
                                    "date": date_val,
                                    "description": normalize_merchant_name(desc_val),
                                    "amount": amount_val,
                                    "direction": direction
                                })
                                
    return deduplicate_transactions(transactions)

def deduplicate_transactions(transactions: list[dict]) -> list[dict]:
    """Removes exact duplicate transactions (same date, description, amount, direction)."""
    seen = set()
    deduped = []
    for tx in transactions:
        key = (tx["date"], tx["description"], tx["amount"], tx["direction"])
        if key not in seen:
            seen.add(key)
            deduped.append(tx)
    return deduped
