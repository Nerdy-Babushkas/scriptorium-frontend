# scriptorium-frontend

Welcome to the *Scriptorium Frontend* repository.

Scriptorium is a digital personal space where users can explore music, books, reflections, and goals inside a creative room-based experience.  
This frontend application handles all user interaction, UI rendering, and communication with the backend API.

---

##  Live Website

🔗 https://scriptorium-frontend.vercel.app/room

---

##  Project Overview

Scriptorium provides users with a personalized digital “room” where they can:

-  Search and explore music
-  Search and browse books
-  Add reflections
-  Track personal goals
-  Navigate through different themed rooms
-  Register, login, and manage authentication

The frontend is built using:

- *Node.js*
- *Express*
- *EJS (Embedded JavaScript templates)*
- *Vanilla JavaScript*
- *Tailwind CSS*
- *Vercel for deployment*

---

##  Main Features

###  Authentication
- User Signup
- Login
- Email Verification
- Forgot / Reset Password
- JWT Token handling
- Secure routes for authenticated users

###  Room Experience
- Main room dashboard
- Theatre room
- Library section
- Music section
- Goal progress view

###  Search Functionality
- Book search feature
- Music search feature
- Search results page
- Dynamic rendering of results

###  Reflections
- Add reflections
- Display stored reflections

###  Goals Tracking
- Create goals
- View progress
- Update goal completion

###  UI / UX
- Modular EJS layout with partials
- Navbar (public & authenticated versions)
- Reusable components
- Tailwind styling
- Responsive design

---

##  Project Structure

```text
scriptorium-frontend
│
├── public/
│   ├── assets/
│   ├── css/
│   └── js/
│
├── views/
│   ├── pages/
│   └── partials/
│
├── routes/
├── api/
│
├── app.js
├── package.json
└── vercel.json

```
---

##  Installation & Setup

### 1️ Clone the Repository

```bash
git clone https://github.com/Nerdy-Babushkas/scriptorium-frontend.git
cd scriptorium-frontend
 ```

### 2 Install Dependencies
```bash
npm install
```

### 3 Run the Project Locally
```bash
npm run dev
```
OR
```bash
node app.js
```
The app will run on:
```bash
http://localhost:3000
```
