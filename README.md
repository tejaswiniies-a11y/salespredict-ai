# Sales Prediction Using Machine Learning

## Project Structure

```text
sales prediction/
├── backend/
│   ├── app.js
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── services/
├── frontend/
│   ├── public/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── script.js
│   └── views/
│       ├── index.html
│       ├── login.html
│       ├── register.html
│       ├── dashboard.html
│       ├── admin.html
│       ├── about.html
│       └── 404.html
├── uploads/
├── reports/
├── scripts/
│   └── createAdmin.js
├── .env.example
├── package.json
├── server.js
├── train_model.py
├── sales_data.csv
└── README.md
```

## Backend

The backend contains:

- Authentication and JWT cookie handling
- Protected user and admin routes
- MongoDB models for users, predictions, and dataset uploads
- Controllers for auth, predictions, reports, admin analytics, and pages
- Services for authentication logic and ML integration

Main backend files:

- [server.js](/c:/Users/TEJU/Downloads/sales prediction/server.js)
- [backend/app.js](/c:/Users/TEJU/Downloads/sales prediction/backend/app.js)
- [backend/config/db.js](/c:/Users/TEJU/Downloads/sales prediction/backend/config/db.js)
- [backend/controllers/authController.js](/c:/Users/TEJU/Downloads/sales prediction/backend/controllers/authController.js)

## Frontend

The frontend contains:

- Static HTML pages for home, auth, dashboards, and about
- Responsive CSS styling
- Vanilla JavaScript for auth, predictions, uploads, reports, and charts

Main frontend files:

- [frontend/views/index.html](/c:/Users/TEJU/Downloads/sales prediction/frontend/views/index.html)
- [frontend/views/dashboard.html](/c:/Users/TEJU/Downloads/sales prediction/frontend/views/dashboard.html)
- [frontend/public/css/style.css](/c:/Users/TEJU/Downloads/sales prediction/frontend/public/css/style.css)
- [frontend/public/js/script.js](/c:/Users/TEJU/Downloads/sales prediction/frontend/public/js/script.js)

## Features

- Home page
- Login and register
- Sales prediction form
- User dashboard
- Admin dashboard
- About page
- CSV dataset upload
- Prediction history
- Download reports in CSV and PDF
- Secure authentication
- Route protection
- Charts using Chart.js
- Responsive design

## Setup

1. Copy `.env.example` to `.env`
2. Update:
   `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `PYTHON_PATH`
3. Install dependencies:

```bash
npm install
```

4. Train the ML model:

```bash
npm run train
```

5. Start the server:

```bash
npm run dev
```

6. Open:

```text
http://localhost:5000
```

## Dataset Format

```csv
marketing_spend,store_visitors,discount,seasonality_index,sales
```

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/predictions`
- `GET /api/predictions/history`
- `POST /api/predictions/upload-csv`
- `GET /api/reports/csv`
- `GET /api/reports/pdf`
- `GET /api/admin/dashboard`

## Admin Note

If a user registers with the email stored in `ADMIN_EMAIL`, that account becomes an admin automatically.
