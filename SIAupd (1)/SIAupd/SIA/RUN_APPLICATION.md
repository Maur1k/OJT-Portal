# How to Run the Application

## Fix PowerShell Execution Policy Issue

You have **3 options** to fix the PowerShell execution policy error:

### Option 1: Change Execution Policy (Recommended for Development)
Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Option 2: Bypass for Current Session Only
Run this command in your current PowerShell session:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### Option 3: Use Command Prompt Instead
Open **Command Prompt (cmd)** instead of PowerShell:
- Press `Win + R`, type `cmd`, press Enter
- Navigate to the project folder and run npm commands

---

## Step-by-Step: Running the Application

### 1. Navigate to Project Directory
```powershell
cd "C:\Users\maurik\Documents\SIA\SIAupd (1)\SIAupd\SIA"
```

### 2. Fix Execution Policy (if using PowerShell)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Type `Y` when prompted.

### 3. Install Dependencies
```powershell
npm install
```

### 4. Create .env File (if it doesn't exist)
Create a file named `.env` in the SIA folder with:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ojt_portal
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
SESSION_SECRET=your_session_secret_key_change_this
NODE_ENV=development
```

### 5. Make Sure MongoDB is Running
- If you have MongoDB installed locally, start it:
  ```powershell
  mongod
  ```
- Or use MongoDB Atlas (cloud) and update MONGODB_URI in .env

### 6. Run the Application

**Option A: Production Mode**
```powershell
npm start
```

**Option B: Development Mode (with auto-reload)**
```powershell
npm run dev
```

### 7. Access the Application
Open your browser and go to:
```
http://localhost:3000
```

---

## Quick Commands Reference

```powershell
# Navigate to project
cd "C:\Users\maurik\Documents\SIA\SIAupd (1)\SIAupd\SIA"

# Install dependencies
npm install

# Start application
npm start

# Development mode (auto-reload)
npm run dev

# Create initial admin accounts
npm run seed
```

---

## Troubleshooting

### If npm still doesn't work after fixing execution policy:
1. Close and reopen PowerShell
2. Or use Command Prompt (cmd) instead
3. Or use Git Bash if you have Git installed

### If MongoDB connection fails:
- Make sure MongoDB is running
- Check your MONGODB_URI in .env file
- For local MongoDB: `mongodb://localhost:27017/ojt_portal`
- For MongoDB Atlas: Use your connection string

### If port 3000 is already in use:
- Change PORT in .env file to another port (e.g., 3001)
- Or kill the process using port 3000:
  ```powershell
  npm run kill-port
  ```



