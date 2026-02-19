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

    // 2. INTELLIGENT CONTEXT SWITCHING
    // Checks if we are in the Music Room or Library Room
    const isMusicPage = window.location.pathname.includes('music');
    
    const endpoint = isMusicPage 
        ? `https://scriptorium-backend-six.vercel.app/api/music/shelf/${shelfKey}`
        : `https://scriptorium-backend-six.vercel.app/api/books/shelf/${shelfKey}`;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please log in to view your library.");
            return;
        }

        const res = await fetch(endpoint, {
            headers: { 'Authorization': `jwt ${token}` }
        });
        
        const items = await res.json();
        
        // 3. Update UI
        loading.classList.add('hidden');
        bookCount.textContent = items.length;

        if (items.length > 0) {
            // Pass the context (isMusicPage) to the render function
            renderItems(items, shelfKey, isMusicPage);
        } else {
            empty.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Error fetching shelf:", error);
        loading.classList.add('hidden');
        grid.innerHTML = `<div class="col-span-full text-center text-red-400">Failed to load contents.</div>`;
    }
}

// --- CLOSE SHELF ---
function closeShelf() {
    modal.classList.add('hidden');
}

// --- RENDER ITEMS (Handles both Books & Music styles) ---
function renderItems(items, currentShelf, isMusic) {
    items.forEach(item => {
        let title, subtitle, image, id;

        if (isMusic) {
            // --- MUSIC MODE ---
            id = item._id;
            title = item.title;
            subtitle = item.artist?.name || 'Unknown Artist';
            
            // Logic: Use cover if exists, otherwise show generic Vinyl Icon
            if (item.coverUrl) {
                image = `<img src="${item.coverUrl}" alt="${title}" class="h-48 w-48 shadow-2xl rounded-full animate-spin-slow object-cover border-4 border-[#1a1a1a]">`;
            } else {
                image = `
                <div class="h-48 w-48 rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-2xl border-4 border-[#333] relative">
                    <div class="absolute inset-0 rounded-full border-2 border-white/10" style="margin: 10px;"></div>
                    <div class="absolute inset-0 rounded-full border-2 border-white/10" style="margin: 25px;"></div>
                    <div class="absolute inset-0 rounded-full border-2 border-white/10" style="margin: 40px;"></div>
                    <div class="w-16 h-16 bg-[#00C49A] rounded-full flex items-center justify-center">
                        <span class="text-2xl">🎵</span>
                    </div>
                </div>`;
            }
        } else {
            // --- BOOK MODE ---
            id = item._id;
            title = item.title;
            subtitle = item.authors ? item.authors[0] : 'Unknown';
            const thumb = item.imageLinks?.thumbnail || 'https://via.placeholder.com/150x220?text=No+Cover';
            image = `<img src="${thumb}" alt="${title}" class="h-48 w-auto shadow-2xl rounded-md group-hover:scale-105 transition-transform duration-300">`;
        }

        const card = document.createElement('div');
        // Reusing the "Crisp" card style
        card.className = "group bg-[#0f191e] border border-white/10 rounded-2xl overflow-hidden hover:border-[#00C49A] transition-all duration-300 flex flex-col hover:shadow-[0_0_20px_rgba(0,196,154,0.2)] relative";
        
        card.innerHTML = `
            <div class="relative p-6 flex justify-center bg-black/20 overflow-hidden">
                ${image}
                
                <button onclick="removeItem('${id}', '${currentShelf}', this, ${isMusic})" 
                        class="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md hover:bg-[#D90429] text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg border border-white/10" 
                        title="Remove from Shelf">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
            
            <div class="p-5 flex-grow flex flex-col">
                <h3 class="text-white font-bold text-lg leading-tight mb-1 line-clamp-2" title="${title}">${title}</h3>
                <p class="text-[#00C49A] text-sm font-semibold mb-4">${subtitle}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- REMOVE ITEM LOGIC ---
async function removeItem(id, shelf, btnElement, isMusic) {
    if(!confirm("Are you sure you want to remove this item?")) return;

    // Determine correct endpoint based on type
    const endpoint = isMusic 
        ? 'https://scriptorium-backend-six.vercel.app/api/music/shelf/remove'
        : 'https://scriptorium-backend-six.vercel.app/api/books/shelf/remove';
    
    // Payload keys differ slightly in your backend (trackId vs bookId)
    const payload = { shelf };
    if (isMusic) payload.trackId = id;
    else payload.bookId = id;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `jwt ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            // Animate removal
            const card = btnElement.closest('.group');
            card.style.transform = "scale(0.9)";
            card.style.opacity = "0";
            setTimeout(() => {
                card.remove();
                // Update counter
                const current = parseInt(bookCount.textContent);
                bookCount.textContent = Math.max(0, current - 1);
                
                if (grid.children.length === 0) empty.classList.remove('hidden');
            }, 300);
        } else {
            alert("Failed to remove item.");
        }
    } catch (e) {
        console.error(e);
        alert("Network error");
    }
}