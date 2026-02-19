document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTS ---
    const resultsGrid = document.getElementById('resultsGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const queryDisplay = document.getElementById('queryDisplay');
    const shelfModal = document.getElementById('shelfModal');
    
    // Tab Elements
    const tabBooks = document.getElementById('tab-books');
    const tabMusic = document.getElementById('tab-music');
    const tabMovies = document.getElementById('tab-movies'); // New

    // Modal Dynamic Elements
    const modalBookTitle = document.getElementById('modalBookTitle');
    const btnReading = document.getElementById('btn-reading');
    const btnReadingText = document.getElementById('btn-reading-text');
    const btnReadingIcon = document.getElementById('btn-reading-icon');
    
    let currentItemData = null;
    let currentType = 'books'; // Default

    // --- 1. INITIALIZATION ---
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');
    currentType = urlParams.get('type') || 'books';

    // Update Tabs UI & Search Bar Context
    updateTabs(currentType);
    updateSearchContext(currentType);

    if (initialQuery) {
        queryDisplay.textContent = initialQuery;
        executeSearch(initialQuery, currentType);
    } else {
        emptyState.classList.remove('hidden');
        queryDisplay.textContent = "Empty";
    }

    // --- 2. TAB SWITCHING LOGIC ---
    function switchTab(type) {
        if (currentType === type) return;
        
        // Update URL without reloading
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('type', type);
        window.history.pushState({}, '', newUrl);
        
        currentType = type;
        updateTabs(type);
        updateSearchContext(type); // Ensure next search uses this type
        
        // Re-run search if query exists
        const query = new URLSearchParams(window.location.search).get('q');
        if (query) executeSearch(query, type);
    }

    // Bind Click Events
    if(tabBooks) tabBooks.onclick = (e) => { e.preventDefault(); switchTab('books'); };
    if(tabMusic) tabMusic.onclick = (e) => { e.preventDefault(); switchTab('music'); };
    if(tabMovies) tabMovies.onclick = (e) => { e.preventDefault(); switchTab('movies'); }; // New

    // --- 3. SEARCH LOGIC ---
    async function executeSearch(query, type) {
        resultsGrid.innerHTML = '';
        emptyState.classList.add('hidden');
        loadingState.classList.remove('hidden');

        try {
            const token = localStorage.getItem('token');
            let endpoint = '';
            
            // Choose endpoint based on active tab
            if (type === 'music') {
                endpoint = `https://scriptorium-backend-six.vercel.app/api/music/search?q=${encodeURIComponent(query)}`;
            } else if (type === 'movies') {
                endpoint = `https://scriptorium-backend-six.vercel.app/api/movies/search?q=${encodeURIComponent(query)}`;
            } else {
                endpoint = `https://scriptorium-backend-six.vercel.app/api/books/search?q=${encodeURIComponent(query)}`;
            }

            const res = await fetch(endpoint, { headers: { 'Authorization': `jwt ${token}` } });
            const data = await res.json();

            loadingState.classList.add('hidden');

            // Handle different data structures from the backend
            let items = [];
            if (type === 'music') items = data.tracks;
            else if (type === 'movies') items = data.movies;
            else items = data.books;

            if (items && items.length > 0) {
                renderItems(items, type);
            } else {
                emptyState.classList.remove('hidden');
            }

        } catch (error) {
            console.error(error);
            loadingState.classList.add('hidden');
            showToast('Error', 'Failed to fetch results.', 'error');
        }
    }

    // --- 4. RENDER ITEMS ---
    function renderItems(items, type) {
        items.forEach(item => {
            let title, subtitle, image, year;
            
            if (type === 'music') {
                title = item.title;
                subtitle = item.artist?.name || 'Unknown Artist';
                year = item.release?.date ? item.release.date.substring(0, 4) : '';
                image = item.coverUrl 
                    ? `<img src="${item.coverUrl}" alt="${title}" class="h-48 w-48 shadow-2xl rounded-full animate-spin-slow object-cover border-4 border-[#1a1a1a]">`
                    : `<div class="h-48 w-48 rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-2xl border-4 border-[#333] relative">
                        <div class="w-16 h-16 bg-[#00C49A] rounded-full flex items-center justify-center">
                            <svg class="w-8 h-8 text-[#05181c]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
                        </div>
                       </div>`;
            } else if (type === 'movies') {
                title = item.title;
                subtitle = item.type ? item.type.toUpperCase() : 'Movie';
                year = item.year || 'N/A';
                const poster = (item.poster && item.poster !== "N/A") ? item.poster : 'https://via.placeholder.com/300x450?text=No+Poster';
                image = `<img src="${poster}" alt="${title}" class="h-48 w-auto shadow-2xl rounded-md group-hover:scale-105 transition-transform duration-300 object-cover">`;
            } else {
                title = item.title;
                subtitle = item.authors ? item.authors[0] : 'Unknown';
                year = item.publishedDate ? item.publishedDate.substring(0, 4) : 'N/A';
                const thumb = item.imageLinks?.thumbnail || 'https://via.placeholder.com/150x220?text=No+Cover';
                image = `<img src="${thumb}" alt="${title}" class="h-48 w-auto shadow-2xl rounded-md group-hover:scale-105 transition-transform duration-300 object-cover">`;
            }

            const itemJson = encodeURIComponent(JSON.stringify(item));

            const card = document.createElement('div');
            card.className = "group bg-[#0f191e] border border-white/10 rounded-2xl overflow-hidden hover:border-[#00C49A] transition-all duration-300 flex flex-col hover:shadow-[0_0_20px_rgba(0,196,154,0.1)]";
            
            card.innerHTML = `
                <div class="relative p-6 flex justify-center bg-black/20 overflow-hidden">
                    ${image}
                </div>
                
                <div class="p-5 flex-grow flex flex-col">
                    <h3 class="text-white font-bold text-lg leading-tight mb-1 line-clamp-2" title="${title}">${title}</h3>
                    <p class="text-[#00C49A] text-sm font-semibold mb-1">${subtitle}</p>
                    <p class="text-white/40 text-xs mb-4">${year}</p>
                    
                    <div class="mt-auto">
                        <button class="add-trigger-btn w-full py-3 bg-[#1a2c33] text-white border border-white/10 rounded-xl font-bold transition-all flex items-center justify-center gap-2 hover:bg-[#00C49A] hover:text-[#05181c] hover:border-[#00C49A] hover:shadow-lg"
                                data-item="${itemJson}" data-title="${title}">
                            <span class="text-xl leading-none">+</span> Add to Library
                        </button>
                    </div>
                </div>
            `;
            resultsGrid.appendChild(card);
        });

        // Add Listeners
        document.querySelectorAll('.add-trigger-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentItemData = JSON.parse(decodeURIComponent(e.currentTarget.dataset.item));
                modalBookTitle.textContent = e.currentTarget.dataset.title;
                openModal();
            });
        });
    }

    // --- 5. MODAL LOGIC ---
    function openModal() {
        shelfModal.classList.remove('hidden');
        
        // Dynamically update labels based on current search type
        if (currentType === 'music') {
            btnReading.dataset.shelf = 'listening';
            btnReadingText.textContent = 'Currently Listening';
            btnReadingIcon.textContent = '🎧';
        } else if (currentType === 'movies') {
            btnReading.dataset.shelf = 'watching';
            btnReadingText.textContent = 'Currently Watching';
            btnReadingIcon.textContent = '🎬';
        } else {
            btnReading.dataset.shelf = 'reading';
            btnReadingText.textContent = 'Currently Reading';
            btnReadingIcon.textContent = '📖';
        }
    }

    document.querySelectorAll('.shelf-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const shelf = e.currentTarget.dataset.shelf;
            if (!currentItemData || !shelf) return;
            
            shelfModal.classList.add('hidden');
            showToast('Adding...', `Saving to ${shelf}...`, 'info');
            
            await addToShelf(currentItemData, shelf, currentType);
        });
    });

    async function addToShelf(data, shelf, type) {
        try {
            const token = localStorage.getItem('token');
            let endpoint = '';
            
            if (type === 'music') endpoint = 'https://scriptorium-backend-six.vercel.app/api/music/shelf/add';
            else if (type === 'movies') endpoint = 'https://scriptorium-backend-six.vercel.app/api/movies/shelf/add';
            else endpoint = 'https://scriptorium-backend-six.vercel.app/api/books/shelf/add';

            const payload = { ...data, shelf: shelf };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `jwt ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Success', `Added to ${shelf}!`, 'success');
            } else {
                const err = await res.json();
                showToast('Warning', err.message || 'Failed to add.', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error', 'Network error.', 'error');
        }
    }

    // --- UTILS ---
    function updateTabs(type) {
        const activeClass = "bg-[#00C49A]/20 text-[#00C49A] border-[#00C49A] shadow-[0_0_10px_rgba(0,196,154,0.2)]";
        const inactiveClass = "text-white/50 hover:text-white border-transparent";

        const tabs = {
            'books': tabBooks,
            'music': tabMusic,
            'movies': tabMovies
        };

        Object.keys(tabs).forEach(key => {
            if (tabs[key]) {
                tabs[key].className = `px-6 py-1.5 rounded-full border font-medium text-sm transition-all ${key === type ? activeClass : inactiveClass}`;
            }
        });
    }

    function updateSearchContext(type) {
        const searchForm = document.querySelector('form[action="/search"]');
        if (searchForm) {
            let typeInput = searchForm.querySelector('input[name="type"]');
            if (!typeInput) {
                typeInput = document.createElement('input');
                typeInput.type = 'hidden';
                typeInput.name = 'type';
                searchForm.appendChild(typeInput);
            }
            typeInput.value = type;
        }
    }

    function showToast(title, msg, type) {
        const toast = document.getElementById('toast');
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = msg;
        toast.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 bg-[#0f191e] border-l-4 ${type === 'success' ? 'border-[#00C49A] text-[#00C49A]' : 'border-red-500 text-red-500'} rounded-xl shadow-2xl text-white transform transition-transform duration-500 z-[100]`;
        toast.classList.remove('translate-y-40');
        setTimeout(() => toast.classList.add('translate-y-40'), 3500);
    }
    
    const closeModal = document.getElementById('closeModal');
    if(closeModal) closeModal.addEventListener('click', () => shelfModal.classList.add('hidden'));
});