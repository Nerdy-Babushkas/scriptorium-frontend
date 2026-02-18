//frontend/public/js/search_results.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTS ---
    const resultsGrid = document.getElementById('resultsGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const queryDisplay = document.getElementById('queryDisplay');
    
    // Filter Elements
    const toggleFiltersBtn = document.getElementById('toggleFilters');
    const filterPanel = document.getElementById('filterPanel');
    const chevron = document.getElementById('chevronIcon');
    const applyFiltersBtn = document.getElementById('applyFilters');
    
    // Input Fields
    const filterGenre = document.getElementById('filterGenre');
    const filterAuthor = document.getElementById('filterAuthor');
    const filterYearFrom = document.getElementById('filterYearFrom');
    const filterYearTo = document.getElementById('filterYearTo');

    // Modal Elements
    const shelfModal = document.getElementById('shelfModal');
    const modalBookTitle = document.getElementById('modalBookTitle');
    const closeModalBtn = document.getElementById('closeModal');
    const shelfButtons = document.querySelectorAll('.shelf-btn');
    
    let currentBookData = null;

    // --- 1. INITIALIZATION ---
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');

    if (initialQuery) {
        queryDisplay.textContent = initialQuery;
        executeSearch(initialQuery);
    } else {
        emptyState.classList.remove('hidden');
        queryDisplay.textContent = "Empty";
    }

    // --- 2. SEARCH LOGIC ---
    async function executeSearch(baseQuery) {
        resultsGrid.innerHTML = '';
        emptyState.classList.add('hidden');
        loadingState.classList.remove('hidden');

        // Construct Query for Google Books API
        // "q" parameter can take special keywords like "inauthor:", "subject:" (genre), etc.
        let apiQuery = baseQuery;

        if (!filterPanel.classList.contains('hidden')) {
            if (filterAuthor.value.trim()) apiQuery += `+inauthor:${filterAuthor.value.trim()}`;
            if (filterGenre.value.trim()) apiQuery += `+subject:${filterGenre.value.trim()}`;
            // Note: Date ranges are harder in Google Books simple API, filtering client-side or check API docs for strict ranges
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`https://scriptorium-backend-six.vercel.app/api/books/search?q=${encodeURIComponent(apiQuery)}`, {
                headers: { 'Authorization': `jwt ${token}` }
            });
            const data = await res.json();

            loadingState.classList.add('hidden');

            if (data.books && data.books.length > 0) {
                // Client-side filtering for Years if needed
                let books = data.books;
                if (filterYearFrom.value) {
                    books = books.filter(b => b.publishedDate && parseInt(b.publishedDate) >= parseInt(filterYearFrom.value));
                }
                if (filterYearTo.value) {
                    books = books.filter(b => b.publishedDate && parseInt(b.publishedDate) <= parseInt(filterYearTo.value));
                }

                if(books.length > 0) renderBooks(books);
                else showEmpty();
            } else {
                showEmpty();
            }

        } catch (error) {
            console.error(error);
            loadingState.classList.add('hidden');
            showToast('Error', 'Failed to fetch results.', false);
        }
    }

    function showEmpty() {
        emptyState.classList.remove('hidden');
    }

    // --- 3. RENDER CARDS (CRISP STYLE) ---
    function renderBooks(books) {
        books.forEach(book => {
            const thumbnail = book.imageLinks?.thumbnail || 'https://via.placeholder.com/150x220?text=No+Cover';
            const author = book.authors ? book.authors[0] : 'Unknown';
            const year = book.publishedDate ? book.publishedDate.substring(0, 4) : 'N/A';
            const bookJson = encodeURIComponent(JSON.stringify(book));

            const card = document.createElement('div');
            // Matches the "Harry Potter" card style in your screenshot
            card.className = "group bg-[#0f191e] border border-white/10 rounded-2xl overflow-hidden hover:border-teal-neon transition-all duration-300 flex flex-col hover:shadow-[0_0_20px_rgba(0,196,154,0.2)]";
            
            card.innerHTML = `
                <div class="relative p-6 flex justify-center bg-black/20">
                    <img src="${thumbnail}" alt="${book.title}" class="h-48 w-auto shadow-2xl rounded-md group-hover:scale-105 transition-transform duration-300">
                </div>
                
                <div class="p-5 flex-grow flex flex-col">
                    <h3 class="text-white font-bold text-lg leading-tight mb-1 line-clamp-2" title="${book.title}">${book.title}</h3>
                    <p class="text-[#00C49A] text-sm font-semibold mb-1">${author}</p>
                    <p class="text-white/40 text-xs mb-4">${year}</p>
                    
                    <div class="mt-auto">

                        <button class="add-trigger-btn w-full py-3 bg-[#1a2c33] text-white border border-white/10 rounded-xl font-bold transition-all flex items-center justify-center gap-2 hover:bg-[#00C49A] hover:text-[#05181c] hover:border-[#00C49A] hover:shadow-lg"
                            data-book="${bookJson}" data-title="${book.title}">
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
                currentBookData = JSON.parse(decodeURIComponent(e.currentTarget.dataset.book));
                modalBookTitle.textContent = e.currentTarget.dataset.title;
                shelfModal.classList.remove('hidden');
            });
        });
    }

    // --- 4. UI INTERACTION ---
    
    // Toggle Advanced Filters
    toggleFiltersBtn.addEventListener('click', () => {
        const isHidden = filterPanel.classList.contains('hidden');
        if (isHidden) {
            filterPanel.classList.remove('hidden');
            chevron.style.transform = 'rotate(180deg)';
        } else {
            filterPanel.classList.add('hidden');
            chevron.style.transform = 'rotate(0deg)';
        }
    });

    // Clear Button Logic for Inputs
    document.querySelectorAll('.crisp-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const btn = e.target.parentElement.querySelector('.clear-btn');
            if(btn) btn.classList.toggle('hidden', !e.target.value);
        });
    });

    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const input = e.target.parentElement.querySelector('input');
            input.value = '';
            btn.classList.add('hidden');
        });
    });

    // Apply Filters
    applyFiltersBtn.addEventListener('click', () => {
        const currentQuery = new URLSearchParams(window.location.search).get('q');
        if(currentQuery) executeSearch(currentQuery);
    });

    // --- 5. SHELF SAVING ---
    shelfButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Get the dataset value directly from the button or its closest parent
            const targetBtn = e.target.closest('.shelf-btn');
            const shelf = targetBtn.dataset.shelf;
            
            if (!currentBookData || !shelf) return;
            
            shelfModal.classList.add('hidden');
            showToast('Adding...', `Saving to your ${shelf} shelf`, 'info');
            
            await processBookAddition(currentBookData, shelf);
        });
    });

    closeModalBtn.addEventListener('click', () => {
        shelfModal.classList.add('hidden');
        currentBookData = null;
    });

    async function processBookAddition(bookData, shelf) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return showToast('Error', 'Please log in first.', 'error');

            const payload = { ...bookData, shelf: shelf };

            const res = await fetch('https://scriptorium-backend-six.vercel.app/api/books/shelf/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `jwt ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Success', `Book added to ${shelf}`, 'success');
            } else {
                const err = await res.json();
                showToast('Warning', err.message || 'Could not add to shelf', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error', 'Network error occurred', 'error');
        }
    }

    // --- TOAST NOTIFICATION ---
    function showToast(title, msg, type) {
        const toast = document.getElementById('toast');
        const tTitle = document.getElementById('toastTitle');
        const tMsg = document.getElementById('toastMessage');
        const tIcon = document.getElementById('toastIcon');

        tTitle.textContent = title;
        tMsg.textContent = msg;

        // Styles based on type
        if (type === 'success') {
            toast.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 bg-[#064e3b] border-l-4 border-teal-neon rounded-xl shadow-2xl text-white transform transition-transform duration-500 z-[100]`;
            tTitle.className = "font-bold text-lg text-teal-neon";
            tIcon.textContent = "✅";
        } else if (type === 'error') {
            toast.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 bg-[#450a0a] border-l-4 border-red-500 rounded-xl shadow-2xl text-white transform transition-transform duration-500 z-[100]`;
            tTitle.className = "font-bold text-lg text-red-500";
            tIcon.textContent = "⚠️";
        } else {
            toast.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 bg-[#1e293b] border-l-4 border-blue-500 rounded-xl shadow-2xl text-white transform transition-transform duration-500 z-[100]`;
            tTitle.className = "font-bold text-lg text-blue-400";
            tIcon.textContent = "ℹ️";
        }

        // Animation
        toast.classList.remove('translate-y-40');
        setTimeout(() => toast.classList.add('translate-y-40'), 3500);
    }
});