# 🪟 Windows MySQL Setup Guide

This guide helps you set up MySQL on Windows for the Kayak Travel Platform.

## 🔍 Check if MySQL is Installed

### Method 1: Check Windows Services

1. Press `Windows + R`
2. Type `services.msc` and press Enter
3. Look for a service named:
   - `MySQL80` or
   - `MySQL` or
   - `MySQL Server`

If you see one of these services, MySQL is installed but may not be in your PATH.

### Method 2: Check Program Files

1. Open File Explorer
2. Navigate to: `C:\Program Files\MySQL\`
3. If this folder exists, MySQL is installed

### Method 3: Check via PowerShell

```powershell
# Check if MySQL service exists
Get-Service | Where-Object {$_.Name -like "*mysql*"}

# Check if MySQL is installed in Program Files
Test-Path "C:\Program Files\MySQL"
```

---

## ✅ Option 1: MySQL is Installed (Add to PATH)

If MySQL is installed but the command isn't recognized, add it to your PATH.

### Step 1: Find MySQL Installation Directory

Common locations:
- `C:\Program Files\MySQL\MySQL Server 8.0\bin`
- `C:\Program Files\MySQL\MySQL Server 8.1\bin`
- `C:\mysql\bin`

### Step 2: Add MySQL to PATH

**Method A: Via System Settings (Recommended)**

1. Press `Windows + X` → Select "System"
2. Click "Advanced system settings" (on the right)
3. Click "Environment Variables" button
4. Under "System variables", find and select "Path"
5. Click "Edit"
6. Click "New"
7. Add the MySQL bin directory path (e.g., `C:\Program Files\MySQL\MySQL Server 8.0\bin`)
8. Click "OK" on all dialogs
9. **Close and reopen PowerShell** for changes to take effect

**Method B: Via PowerShell (Temporary - Current Session Only)**

```powershell
# Replace with your actual MySQL bin path
$env:Path += ";C:\Program Files\MySQL\MySQL Server 8.0\bin"

# Test if it works
mysql --version
```

**Method C: Via PowerShell (Permanent - Current User)**

```powershell
# Replace with your actual MySQL bin path
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\MySQL\MySQL Server 8.0\bin", "User")

# Close and reopen PowerShell
```

### Step 3: Verify MySQL is Accessible

Close and reopen PowerShell, then:

```powershell
mysql --version
```

You should see something like:
```
mysql  Ver 8.0.35 for Win64 on x86_64 (MySQL Community Server - GPL)
```

### Step 4: Start MySQL Service

```powershell
# Check if MySQL service is running
Get-Service MySQL80

# If not running, start it
Start-Service MySQL80

# Or use Services GUI:
# Press Windows + R → services.msc → Find MySQL80 → Right-click → Start
```

### Step 5: Test Connection

```powershell
# Connect to MySQL (you'll be prompted for password)
mysql -u root -p
```

If you don't know the root password, see "Reset MySQL Root Password" section below.

---

## 📥 Option 2: Install MySQL (Not Installed)

### Step 1: Download MySQL Installer

1. Go to: https://dev.mysql.com/downloads/installer/
2. Download **MySQL Installer for Windows** (the larger file, ~400MB)
   - Choose "mysql-installer-community-8.x.x.x.msi"
   - Or download the web installer (smaller, downloads during installation)

### Step 2: Run Installer

1. Run the downloaded installer
2. Choose "Developer Default" or "Server only"
3. Click "Execute" to install required components
4. Click "Next" through configuration

### Step 3: Configure MySQL Server

1. **Type and Networking**: Choose "Standalone MySQL Server"
2. **Authentication**: Choose "Use Strong Password Encryption"
3. **Accounts and Roles**:
   - Set root password (remember this!)
   - You can add additional users later
4. **Windows Service**:
   - Service name: `MySQL80` (default)
   - Start MySQL at System Startup: ✅ (recommended)
5. **Apply Configuration**: Click "Execute"

### Step 4: Verify Installation

1. **Check Service**:
   ```powershell
   Get-Service MySQL80
   ```
   Should show "Running"

2. **Test MySQL Command**:
   ```powershell
   mysql --version
   ```
   If not found, add to PATH (see Option 1 above)

3. **Connect to MySQL**:
   ```powershell
   mysql -u root -p
   ```
   Enter the password you set during installation

---

## 🐳 Option 3: Use MySQL in Docker (Alternative)

If you prefer not to install MySQL locally, you can run it in Docker.

### Step 1: Uncomment MySQL Service in docker-compose.yml

Open `docker-compose.yml` and uncomment the MySQL service (lines 9-29):

```yaml
mysql:
  image: mysql:8.0
  container_name: kayak-mysql
  environment:
    MYSQL_ROOT_PASSWORD: rootpass  # Change this password
    MYSQL_DATABASE: kayak_db
    MYSQL_USER: kayak_app
    MYSQL_PASSWORD: kayak_app_password
  ports:
    - "3306:3306"
  volumes:
    - mysql_data:/var/lib/mysql
    - ./scripts/initMySQL.sql:/docker-entrypoint-initdb.d/init.sql:ro
  networks:
    - kayak-network
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpass"]
    interval: 10s
    timeout: 5s
    retries: 5
  command: --default-authentication-plugin=mysql_native_password
```

### Step 2: Update docker-compose.yml MySQL Hosts

In `booking-service`, `billing-service`, and `admin-analytics-service`, change:

```yaml
MYSQL_HOST: mysql  # Changed from host.docker.internal
```

### Step 3: Start MySQL Container

```powershell
# Start just MySQL first
docker-compose up mysql -d

# Wait for it to be ready (30 seconds)
# Then initialize database
cd scripts
npm install
MYSQL_HOST=localhost MYSQL_PORT=3306 MYSQL_USER=root MYSQL_PASSWORD=rootpass MYSQL_DATABASE=kayak_db node runMySQLInit.js
```

**Note:** When MySQL is in Docker, you can connect from your host machine using `localhost:3306`.

---

## 🔑 Reset MySQL Root Password (If Forgotten)

If you installed MySQL but forgot the root password:

### Method 1: Using MySQL Installer

1. Open MySQL Installer
2. Click "Reconfigure" next to MySQL Server
3. Go through configuration and set a new password

### Method 2: Manual Reset

1. Stop MySQL service:
   ```powershell
   Stop-Service MySQL80
   ```

2. Create a text file `C:\mysql-init.txt` with:
   ```
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'YourNewPassword';
   ```

3. Start MySQL in safe mode:
   ```powershell
   cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
   .\mysqld.exe --init-file=C:\mysql-init.txt --console
   ```

4. In another PowerShell window:
   ```powershell
   mysql -u root -p
   # Enter your new password
   ```

5. Delete the init file:
   ```powershell
   Remove-Item C:\mysql-init.txt
   ```

6. Restart MySQL service normally:
   ```powershell
   Start-Service MySQL80
   ```

---

## ✅ Verify MySQL is Working

After setup, verify everything works:

### Step 1: Check Service Status

```powershell
Get-Service MySQL80
```

Should show: `Running`

### Step 2: Test Connection

```powershell
mysql -u root -p
```

Enter your password. You should see:
```
Welcome to the MySQL monitor...
mysql>
```

### Step 3: Test Basic Commands

```sql
-- Show databases
SHOW DATABASES;

-- Exit MySQL
EXIT;
```

### Step 4: Initialize Kayak Database

```powershell
cd scripts
npm install

# Replace 'your_password' with your actual MySQL root password
$env:MYSQL_HOST="localhost"
$env:MYSQL_PORT="3306"
$env:MYSQL_USER="root"
$env:MYSQL_PASSWORD="your_password"
$env:MYSQL_DATABASE="kayak_db"
node runMySQLInit.js
```

**Expected Output:**
```
✅ Connected to MySQL server successfully!
✅ Database and tables created successfully!
📊 Created tables:
   ✓ bookings
   ✓ billings
```

---

## 🐛 Troubleshooting

### "MySQL service won't start"

1. Check error logs:
   ```powershell
   Get-Content "C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err" -Tail 20
   ```

2. Check if port 3306 is in use:
   ```powershell
   netstat -ano | findstr :3306
   ```

3. Try starting manually:
   ```powershell
   Start-Service MySQL80
   ```

### "Access denied for user 'root'@'localhost'"

- Password might be incorrect
- Try resetting password (see section above)
- Or use MySQL Workbench to reset via GUI

### "Can't connect to MySQL server"

1. Verify service is running:
   ```powershell
   Get-Service MySQL80
   ```

2. Check firewall settings (MySQL should allow connections on port 3306)

3. Try connecting with explicit host:
   ```powershell
   mysql -u root -p -h 127.0.0.1
   ```

### "mysql command not found" after adding to PATH

1. **Close and reopen PowerShell** (PATH changes require new session)
2. Verify PATH was added correctly:
   ```powershell
   $env:Path -split ';' | Select-String MySQL
   ```
3. Try full path:
   ```powershell
   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --version
   ```

---

## 📝 Quick Reference

### Start MySQL Service
```powershell
Start-Service MySQL80
```

### Stop MySQL Service
```powershell
Stop-Service MySQL80
```

### Check MySQL Status
```powershell
Get-Service MySQL80
```

### Connect to MySQL
```powershell
mysql -u root -p
```

### View MySQL Version
```powershell
mysql --version
```

### Find MySQL Installation
```powershell
Get-ChildItem "C:\Program Files\MySQL" -Recurse -Filter "mysql.exe" | Select-Object FullName
```

---

## 🎯 Next Steps

Once MySQL is set up and working:

1. ✅ Verify MySQL is running: `Get-Service MySQL80`
2. ✅ Test connection: `mysql -u root -p`
3. ✅ Initialize database: Run `runMySQLInit.js` script
4. ✅ Update `docker-compose.yml` with your MySQL password
5. ✅ Start Docker services: `docker-compose up --build -d`

See [DOCKER_RUN_GUIDE.md](./DOCKER_RUN_GUIDE.md) for complete setup instructions.

---

**Need Help?** Check the main [DOCKER_RUN_GUIDE.md](./DOCKER_RUN_GUIDE.md) or [QUICK_START.md](./QUICK_START.md) for more information.

