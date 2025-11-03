# Random Name Generator

Generates memorable names like `dog-apple-newyork` using x words.
Three words by default.

---

## Word Categories

|----------|-------|
| Category | Count |
|----------|-------|
| Animals  | 500   |
| Fruits   | 200   |
| Numbers  | 100   |
| Cities   | 60k   |
|----------|-------|

- **Cities** are always included.  
- Other categories can be toggled via query parameters.

---

## Usage

- **Default:** `GET /words` → 1 random name (all categories)  
- **Custom count:** `?count=10` → 10 names  
- **Custom categories:** `?categories=animals,fruits` → includes only selected sets + city

---

## Chance of Conflict

**Example (Animals × Fruits × Cities):**
|-----------------|-----------------|
| Names Generated | Conflict Chance |
|-----------------|-----------------|
| 1,000           | 0.000017%       |
| 1,000,000       | 0.017%          |
| 10,000,000      | 0.17%           |
|-----------------|-----------------|

---

## Notes

- Names are lowercase, letters only, no spaces or special characters.
- Max eight characters per word.
- Max twenty characters in total across three words by default.
