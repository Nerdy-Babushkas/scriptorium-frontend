// public/js/library.js

// --- STATE ---
const modal = document.getElementById('shelfViewModal');
const shelfTitle = document.getElementById('shelfTitle');
const bookCount = document.getElementById('bookCount');
const grid = document.getElementById('shelfGrid');
const loading = document.getElementById('shelfLoading');
const empty = document.getElementById('shelfEmpty');

// --- OPEN SHELF ---
async function openShelf(shelfKey, displayName) {
    // 1. Show Modal & Reset UI
    modal.classList.remove('hidden');
    shelfTitle.textContent = displayName;
    grid.innerHTML = '';
    empty.classList.add('hidden');
    loading.classList.remove('hidden');
    bookCount.textContent = '...';

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please log in to view your library.");
            window.location.href = '/login';
            return;
        }

        // 2. Fetch Data
        const res = await fetch(`https://scriptorium-backend-six.vercel.app/api/books/shelf/${shelfKey}`, {
            headers: { 'Authorization': `jwt ${token}` }
        });
        
        const books = await res.json();
        
        // 3. Update UI
        loading.classList.add('hidden');
        bookCount.textContent = books.length;

        if (books.length > 0) {
            renderBooks(books, shelfKey);
        } else {
            empty.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Error fetching shelf:", error);
        loading.classList.add('hidden');
        grid.innerHTML = `<div class="col-span-full text-center text-red-400">Failed to load shelf contents.</div>`;
    }
}

// --- CLOSE SHELF ---
function closeShelf() {
    modal.classList.add('hidden');
}

// --- RENDER BOOKS ---
function renderBooks(books, currentShelf) {
    books.forEach(book => {
        const thumbnail = book.imageLinks?.thumbnail || 'https://via.placeholder.com/150x220?text=No+Cover';
        const author = book.authors ? book.authors[0] : 'Unknown';
        
        const card = document.createElement('div');
        // Crisp Dark Card Style (Matches Search Results)
        card.className = "group bg-[#0f191e] border border-white/10 rounded-2xl overflow-hidden hover:border-[#00C49A] transition-all duration-300 flex flex-col hover:shadow-[0_0_20px_rgba(0,196,154,0.2)] relative";
        
        card.innerHTML = `
            <div class="relative p-6 flex justify-center bg-black/20">
                <img src="${thumbnail}" alt="${book.title}" class="h-48 w-auto shadow-2xl rounded-md group-hover:scale-105 transition-transform duration-300">
                
                <button onclick="removeBook('${book._id}', '${currentShelf}', this)" 
                        class="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md hover:bg-[#D90429] text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg border border-white/10" 
                        title="Remove from Shelf">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
            
            <div class="p-5 flex-grow flex flex-col">
                <h3 class="text-white font-bold text-lg leading-tight mb-1 line-clamp-2">${book.title}</h3>
                <p class="text-[#00C49A] text-sm font-semibold mb-4">${author}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- REMOVE BOOK LOGIC ---
async function removeBook(bookId, shelf, btnElement) {
    if(!confirm("Are you sure you want to remove this book from this shelf?")) return;

    // UI Optimistic Update (Prevent double clicks)
    const card = btnElement.closest('.group');
    btnElement.disabled = true;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('https://scriptorium-backend-six.vercel.app/api/books/shelf/remove', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `jwt ${token}`
            },
            body: JSON.stringify({ bookId, shelf })
        });

        if (res.ok) {
            // Animate removal
            card.style.transform = "scale(0.9)";
            card.style.opacity = "0";
            setTimeout(() => {
                card.remove();
                // Update counter
                const current = parseInt(bookCount.textContent);
                bookCount.textContent = Math.max(0, current - 1);
                
                // Show empty state if needed
                if (grid.children.length === 0) {
                    empty.classList.remove('hidden');
                }
            }, 300);
        } else {
            alert("Failed to remove book");
            btnElement.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Network error");
        btnElement.disabled = false;
    }
}