# Resume Builder

A full-stack Resume Builder application with React + Vite on the frontend, FastAPI on the backend, MongoDB Atlas for persistence, JWT authentication, BCrypt password hashing, and PDF resume extraction.

## Project Structure

```
project-root/
├── frontend/
├── backend/
└── README.md
```

## Features

- Register and login with name, email, and password
- JWT authentication with protected routes
- BCrypt password hashing
- Dashboard with role selection
- PDF resume upload, extraction, preview, download, and delete
- Profile page
- My Resumes page
- MongoDB Atlas persistence

## Backend

The backend uses FastAPI and Motor to connect to MongoDB Atlas. The connection string is stored in `backend/.env` as provided, and the backend normalizes special characters in the URI before connecting.

### API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `PATCH /api/auth/profile/role`
- `POST /api/resume/upload`
- `GET /api/resume/user-resumes`
- `GET /api/resume/{id}`
- `GET /api/resume/download/{id}`
- `DELETE /api/resume/{id}`

### Backend Setup

1. Open a terminal in `backend/`.
2. Create a virtual environment:
   ```powershell
   python -m venv .venv
   ```
3. Activate it:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
4. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
5. Start the server:
   ```powershell
   uvicorn app.main:app --reload
   ```

The backend runs on `http://localhost:8000` by default.

## Frontend

The frontend is a Vite + React application with React Router, Axios, and Tailwind CSS.

### Frontend Setup

1. Open a terminal in `frontend/`.
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the dev server:
   ```powershell
   npm run dev
   ```

The frontend runs on `http://localhost:5173` by default.

## Environment Files

### `backend/.env`

Contains:

- `MONGODB_URL`
- `MONGODB_DB_NAME`
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `UPLOAD_DIR`

### `frontend/.env`

Contains:

- `VITE_API_URL=http://localhost:8000`

## Notes

- Resume uploads only accept PDF files.
- Uploaded files are stored in `backend/uploads/resumes`.
- Extracted resume data is stored in MongoDB alongside each uploaded file.
- The backend uses authenticated requests for download and delete actions.
