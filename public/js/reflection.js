document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTS ---
    const itemSelect = document.getElementById('itemSelect');
    const moodBtns = document.querySelectorAll('.mood-btn');
    const textArea = document.getElementById('reflectionText');
    const charCount = document.getElementById('charCount');
    const saveBtn = document.getElementById('saveBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editModeIndicator = document.getElementById('editModeIndicator');
    
    const historyList = document.getElementById('historyList');
    const loadingHistory = document.getElementById('loadingHistory');
    const emptyHistory = document.getElementById('emptyHistory');

    // State
    let selectedMoods = [];
    let editingId = null; 
    const token = localStorage.getItem('token');

    if (!token) window.location.href = '/login';

    // --- 1. INITIALIZATION ---
    loadDropdownItems();
    loadHistory();

    // --- 2. DROPDOWN POPULATION ---
    async function loadDropdownItems() {
        try {
            const [booksRes, musicRes] = await Promise.all([
                fetch('https://scriptorium-backend-six.vercel.app/api/books/shelf', { headers: { 'Authorization': `jwt ${token}` } }),
                fetch('https://scriptorium-backend-six.vercel.app/api/music/shelf', { headers: { 'Authorization': `jwt ${token}` } })
            ]);

            const booksData = await booksRes.json();
            const musicData = await musicRes.json();

            // Combine all relevant shelves including Favorites
            const rawBooks = [
                ...(booksData.favorites || []), 
                ...(booksData.reading || []), 
                ...(booksData.finished || [])
            ];
            const rawTracks = [
                ...(musicData.favorites || []), 
                ...(musicData.listening || []), 
                ...(musicData.finished || [])
            ];

            // Remove duplicates (e.g. item in both 'reading' and 'favorites')
            const uniqueBooks = Array.from(new Map(rawBooks.map(item => [item._id, item])).values());
            const uniqueTracks = Array.from(new Map(rawTracks.map(item => [item._id, item])).values());

            if (uniqueBooks.length === 0 && uniqueTracks.length === 0) {
                const opt = document.createElement('option');
                opt.text = "No items in your active shelves";
                itemSelect.add(opt);
                itemSelect.disabled = true;
                return;
            }

            // Populate Books Group
            if (uniqueBooks.length > 0) {
                const group = document.createElement('optgroup');
                group.label = "Books";
                uniqueBooks.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = JSON.stringify({ 
                        id: b._id, 
                        type: 'book', 
                        title: b.title, 
                        image: b.imageLinks?.thumbnail 
                    });
                    opt.text = b.title;
                    group.appendChild(opt);
                });
                itemSelect.appendChild(group);
            }

            // Populate Music Group
            if (uniqueTracks.length > 0) {
                const group = document.createElement('optgroup');
                group.label = "Music";
                uniqueTracks.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = JSON.stringify({ 
                        id: t._id, 
                        type: 'track', 
                        title: t.title, 
                        image: t.coverUrl 
                    });
                    opt.text = `${t.title} - ${t.artist?.name || 'Unknown'}`;
                    group.appendChild(opt);
                });
                itemSelect.appendChild(group);
            }

        } catch (error) {
            console.error(error);
            showToast('Error', 'Failed to load shelf items', 'error');
        }
    }

    // --- 3. UI INTERACTIONS ---
    
    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = btn.dataset.mood;
            if (selectedMoods.includes(mood)) {
                selectedMoods = selectedMoods.filter(m => m !== mood);
                btn.classList.remove('selected');
            } else if (selectedMoods.length < 3) {
                selectedMoods.push(mood);
                btn.classList.add('selected');
            }
        });
    });

    textArea.addEventListener('input', () => {
        const len = textArea.value.length;
        charCount.textContent = `${len} chars`;
        charCount.className = len < 30 ? "absolute bottom-3 right-4 text-xs text-red-500" : "absolute bottom-3 right-4 text-xs text-white/30";
    });

    cancelEditBtn.addEventListener('click', resetForm);

    saveBtn.addEventListener('click', async () => {
        const text = textArea.value.trim();
        const itemVal = itemSelect.value;

        if (!itemVal) return showToast('Warning', 'Please select a book or track', 'error');
        if (text.length < 30) return showToast('Warning', 'Reflection must be at least 30 characters', 'error');

        const itemData = JSON.parse(itemVal);
        const payload = {
            text: text,
            moodTags: selectedMoods,
            itemId: itemData.id,
            itemType: itemData.type,
            metadata: {
                title: itemData.title,
                image: itemData.image
            }
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Processing...';

        try {
            // Updated to use the singular path 'reflection'
            let url = 'https://scriptorium-backend-six.vercel.app/api/reflection/add';
            let method = 'POST';

            if (editingId) {
                url = `https://scriptorium-backend-six.vercel.app/api/reflection/update/${editingId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `jwt ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Success', editingId ? 'Reflection updated' : 'Reflection saved', 'success');
                resetForm();
                loadHistory(); 
            } else {
                const data = await res.json();
                showToast('Error', data.message || 'Action failed', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error', 'Network error', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Reflection';
        }
    });

    // --- 4. HISTORY ---
    
    async function loadHistory() {
        loadingHistory.classList.remove('hidden');
        historyList.innerHTML = '';
        historyList.classList.add('hidden');
        emptyHistory.classList.add('hidden');

        try {
            const res = await fetch('https://scriptorium-backend-six.vercel.app/api/reflection/user', {
                headers: { 'Authorization': `jwt ${token}` }
            });
            const reflections = await res.json();

            loadingHistory.classList.add('hidden');

            if (reflections.length === 0) {
                emptyHistory.classList.remove('hidden');
            } else {
                historyList.classList.remove('hidden');
                reflections.forEach(ref => renderCard(ref));
            }
        } catch (e) {
            console.error(e);
            loadingHistory.innerHTML = "Failed to load history";
        }
    }

    function renderCard(ref) {
        const date = new Date(ref.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const title = ref.metadata?.title || "Unknown Item";
        const image = ref.metadata?.image || (ref.itemType === 'book' ? 'https://via.placeholder.com/50?text=Book' : 'https://via.placeholder.com/50?text=Music');
        
        const div = document.createElement('div');
        div.className = "bg-white/5 border border-white/5 rounded-xl p-4 hover:border-[#00C49A]/50 transition-all group flex gap-4";
        
        div.innerHTML = `
            <div class="w-16 h-20 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                <img src="${image}" class="w-full h-full object-cover">
            </div>

            <div class="flex-grow min-w-0">
                <div class="flex justify-between items-start mb-1">
                    <h4 class="text-[#00C49A] text-sm font-bold truncate pr-2">${title}</h4>
                    <span class="text-white/30 text-xs whitespace-nowrap">${date}</span>
                </div>
                
                <p class="text-white/80 text-sm line-clamp-2 mb-2 font-light">"${ref.text}"</p>
                
                <div class="flex justify-between items-center mt-2">
                    <div class="flex flex-wrap gap-2">
                        ${ref.moodTags.map(m => `<span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/60">${m}</span>`).join('')}
                    </div>
                    
                    <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="text-white/50 hover:text-white" onclick='editRef(${JSON.stringify(ref)})'>✏️</button>
                        <button class="text-red-500/50 hover:text-red-500" onclick="deleteRef('${ref._id}')">🗑️</button>
                    </div>
                </div>
            </div>
        `;
        historyList.appendChild(div);
    }

    window.deleteRef = async (id) => {
        if(!confirm("Delete this reflection?")) return;
        try {
            const res = await fetch(`https://scriptorium-backend-six.vercel.app/api/reflection/remove/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `jwt ${token}` }
            });
            if(res.ok) {
                showToast('Success', 'Deleted', 'success');
                loadHistory();
            }
        } catch(e) { console.error(e); }
    };

    window.editRef = (ref) => {
        editingId = ref._id;
        textArea.value = ref.text;
        selectedMoods = ref.moodTags || [];
        
        moodBtns.forEach(btn => {
            btn.classList.toggle('selected', selectedMoods.includes(btn.dataset.mood));
        });

        // Match the dropdown item
        for (let i = 0; i < itemSelect.options.length; i++) {
            try {
                const optVal = JSON.parse(itemSelect.options[i].value);
                if (optVal.id === ref.item) {
                    itemSelect.selectedIndex = i;
                    break;
                }
            } catch(e) {}
        }

        editModeIndicator.classList.remove('hidden');
        cancelEditBtn.classList.remove('hidden');
        saveBtn.textContent = 'Update Reflection';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function resetForm() {
        editingId = null;
        textArea.value = '';
        itemSelect.selectedIndex = 0;
        selectedMoods = [];
        moodBtns.forEach(btn => btn.classList.remove('selected'));
        charCount.textContent = '0 chars';
        charCount.className = "absolute bottom-3 right-4 text-xs text-white/30";
        
        editModeIndicator.classList.add('hidden');
        cancelEditBtn.classList.add('hidden');
        saveBtn.textContent = 'Save Reflection';
    }

    function showToast(title, msg, type) {
        const toast = document.getElementById('toast');
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = msg;

        if (type === 'success') {
            toast.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 bg-[#064e3b] border-l-4 border-[#00C49A] rounded-xl shadow-2xl text-white transform transition-transform duration-500 z-[100]`;
        } else {
            toast.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 bg-[#450a0a] border-l-4 border-red-500 rounded-xl shadow-2xl text-white transform transition-transform duration-500 z-[100]`;
        }

        toast.classList.remove('translate-y-40');
        setTimeout(() => toast.classList.add('translate-y-40'), 3500);
    }
});