# scriptorium-frontend

Welcome to the _Scriptorium Frontend_ repository.

Scriptorium is designed as a personal digital space where users can collect and organize different types of media they discover online, such as books, music, movies, and podcasts. The platform does not allow users to read or watch the content directly; instead, it focuses on helping users keep track of what they find interesting. Users can save items they discover into their personal space and use the application as a place to record their thoughts, ideas, and learning from that content. By combining media tracking with personal reflection and goal setting, Scriptorium encourages users to think more deeply about the content they engage with and how it connects to their personal interests and growth.

---

## Live Website

🔗 https://scriptorium-frontend.vercel.app/room

---

## Project Overview

Scriptorium is a personalized digital space where users can discover and organize content such as books, music, movies, and podcasts inside a themed virtual “room”.

Once content is saved, users can:

- Save books to their personal library
- Save music they like
- Add movies
- Add podcasts
- Write personal reflections about the content
- Edit or delete reflections
- Set goals related to the content they are exploring
- Track progress toward those goals
- Navigate through different themed rooms such as the library, music room, or theatre

The goal of Scriptorium is to help users reflect on the content they consume and connect it with personal growth through notes, reflections, and goal tracking.

---

The frontend is built using:

- _Node.js_
- _Express_
- _EJS (Embedded JavaScript templates)_
- _Vanilla JavaScript_
- _Tailwind CSS_
- _Vercel for deployment_

---

## Main Features

### Authentication

- User Signup
- Login
- Email Verification
- Forgot / Reset Password
- JWT Token handling
- Secure routes for authenticated users

### Room Experience

- Main room dashboard
- Theatre room
- Library section
- Music section
- Goal progress view

### Search Functionality

- Book search feature
- Music search feature
- Search results page
- Dynamic rendering of results

### Reflections

- Add reflections
- Display stored reflectionS
- Update the reflections

### Goals Tracking

- Create goals
- View progress
- Update goal completion

---

### UI / UX

- Modular EJS layout with partials
- Navbar (public & authenticated versions)
- Reusable components
- Tailwind styling
- Responsive design

---

## Project Structure

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

## Installation & Setup

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

## Contributions to the project are welcomed!!!
