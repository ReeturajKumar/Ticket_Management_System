# Department List API - Testing Guide

## ✅ Department List API

Get all available departments dynamically without hardcoding.

---

## 🎯 **Endpoint:**

```
GET /api/v1/departments
```

**Authentication:** Required (Bearer token)

---

## 🧪 **Testing:**

### **Request:**
```bash
GET http://localhost:5000/api/v1/departments
Authorization: Bearer <your_access_token>
```

### **Response:**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "PLACEMENT",
        "name": "Placement & Career Services",
        "description": "Job placements, internships, resume building, interview preparation",
        "icon": "💼",
        "isActive": true
      },
      {
        "id": "OPERATIONS",
        "name": "Operations & Facilities",
        "description": "Campus facilities, infrastructure, maintenance, general operations",
        "icon": "🏢",
        "isActive": true
      },
      {
        "id": "TRAINING",
        "name": "Training & Development",
        "description": "Workshops, courses, skill development, certifications",
        "icon": "📚",
        "isActive": true
      },
      {
        "id": "FINANCE",
        "name": "Finance & Accounts",
        "description": "Fees, scholarships, refunds, financial queries",
        "icon": "💰",
        "isActive": true
      }
    ],
    "total": 4
  }
}
```

---

## 🎨 **Frontend Usage:**

### **1. Ticket Creation Form:**

```javascript
// Fetch departments when component loads
useEffect(() => {
  const fetchDepartments = async () => {
    const response = await fetch('/api/v1/departments', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    setDepartments(data.data.departments);
  };
  
  fetchDepartments();
}, []);

// Render dropdown
<select name="department" required>
  <option value="">Select Department</option>
  {departments.map(dept => (
    <option key={dept.id} value={dept.id}>
      {dept.icon} {dept.name}
    </option>
  ))}
</select>
```

**Result:**
```
Department: [Select Department ▼]
            ├─ 💼 Placement & Career Services
            ├─ 🏢 Operations & Facilities
            ├─ 📚 Training & Development
            └─ 💰 Finance & Accounts
```

---

### **2. Department Cards:**

```javascript
<div className="departments-grid">
  {departments.map(dept => (
    <div key={dept.id} className="department-card">
      <div className="icon">{dept.icon}</div>
      <h3>{dept.name}</h3>
      <p>{dept.description}</p>
      <button onClick={() => createTicket(dept.id)}>
        Create Ticket
      </button>
    </div>
  ))}
</div>
```

**Result:**
```
┌──────────────────────────┐  ┌──────────────────────────┐
│ 💼                       │  │ 🏢                       │
│ Placement & Career       │  │ Operations & Facilities  │
│ Services                 │  │                          │
│                          │  │                          │
│ Job placements,          │  │ Campus facilities,       │
│ internships, resume      │  │ infrastructure,          │
│ building...              │  │ maintenance...           │
│                          │  │                          │
│ [Create Ticket]          │  │ [Create Ticket]          │
└──────────────────────────┘  └──────────────────────────┘
```

---

### **3. Filter Active Departments:**

```javascript
// Only show active departments
const activeDepartments = departments.filter(dept => dept.isActive);
```

---

## ✅ **Benefits:**

1. **No Hardcoding** - Departments fetched from backend
2. **Dynamic** - Add/remove departments without frontend changes
3. **Consistent** - Same IDs used everywhere
4. **Rich Data** - Descriptions, icons, status included
5. **Future-Proof** - Easy to add more fields later

---

## 🎯 **Use Cases:**

1. **Ticket Creation Form** - Department dropdown
2. **Department Selection** - Visual cards
3. **Filtering** - Filter tickets by department
4. **Help Text** - Show department descriptions
5. **Validation** - Ensure selected department exists

---

## 📊 **Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Department ID (use this for API calls) |
| `name` | string | Display name |
| `description` | string | What this department handles |
| `icon` | string | Emoji icon for visual appeal |
| `isActive` | boolean | Whether department accepts tickets |
| `total` | number | Total number of departments |

---

## ✅ **Success Criteria:**

- ✅ Returns all 4 departments
- ✅ Each department has all required fields
- ✅ Authentication required
- ✅ Can be used in ticket creation form
- ✅ No hardcoded department values needed

---

**Status:** Department List API Fully Implemented! 🎉

**No more hardcoding departments in frontend!** 🚀
