# MongoDB Security Setup

## For Development (Optional)
Your current setup works fine for development without authentication.

## For Production (Required)

### 1. Enable MongoDB Authentication

Start MongoDB with authentication enabled:
```bash
mongod --auth --dbpath /path/to/db
```

### 2. Create Admin User
Connect to MongoDB and create an admin user:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "secure_admin_password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
```

### 3. Create Application User
Create a dedicated user for your application:
```javascript
use curin
db.createUser({
  user: "curin_user",
  pwd: "secure_password_here",
  roles: [
    { role: "readWrite", db: "curin" }
  ]
})
```

### 4. Update .env file
```env
MONGODB_USERNAME=curin_user
MONGODB_PASSWORD=secure_password_here
MONGODB_AUTH_DB=admin
```

### 5. Restart Application
Restart your Node.js application to use authenticated connection.

## Security Benefits
- ✅ Database access control
- ✅ User-specific permissions
- ✅ Audit trail of database operations
- ✅ Protection against unauthorized access
