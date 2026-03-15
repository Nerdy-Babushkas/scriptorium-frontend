const modal = document.getElementById('shelfViewModal');
const grid = document.getElementById('shelfGrid');
const loading = document.getElementById('shelfLoading');
const empty = document.getElementById('shelfEmpty');
const shelfTitle = document.getElementById('shelfTitle');

async function openShelf(shelfKey, displayName) {
    modal.classList.remove('hidden'); shelfTitle.textContent = displayName; grid.innerHTML = '';
    loading.classList.remove('hidden'); empty.classList.add('hidden');
    const isMusic = window.location.pathname.includes('music');
    const isTheatre = window.location.pathname.includes('theatre');
    let endpoint = `https://scriptorium-backend-six.vercel.app/api/${isMusic ? 'music' : (isTheatre ? 'movies' : 'books')}/shelf/${shelfKey}`;
    try {
        const res = await fetch(endpoint, { headers: { 'Authorization': `jwt ${localStorage.getItem('token')}` } });
        const items = await res.json(); loading.classList.add('hidden');
        if (items.length > 0) renderItems(items, shelfKey, isMusic, isTheatre); else empty.classList.remove('hidden');
    } catch (e) { loading.classList.add('hidden'); }
}

function renderItems(items, shelfKey, isMusic, isTheatre) {
    items.forEach(item => {
        const normalized = {
            id: item._id, title: item.title,
            subtitle: isMusic ? (item.artist?.name || 'Artist') : (isTheatre ? item.year : (item.authors ? item.authors[0] : 'Unknown')),
            img: item.coverUrl || (item.poster && item.poster !== 'N/A' ? item.poster : (item.imageLinks?.thumbnail || 'https://via.placeholder.com/300x450'))
        };
        const card = document.createElement('div');
        card.className = "group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden p-4 flex flex-col";
        card.innerHTML = `<img src="${normalized.img}" class="h-48 w-auto rounded-md object-cover shadow-xl"><h3 class="text-white mt-4 font-bold truncate">${normalized.title}</h3><p class="text-[#00C49A] text-sm">${normalized.subtitle}</p>
            <button onclick="removeItem('${normalized.id}', '${shelfKey}', this, ${isMusic}, ${isTheatre})" class="absolute top-2 right-2 p-2 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>`;
        grid.appendChild(card);
    });
}

async function removeItem(id, shelf, btn, isMusic, isTheatre) {
    if (!confirm("Remove item?")) return;
    const type = isMusic ? 'music' : (isTheatre ? 'movies' : 'books');
    const payload = { shelf };
    if (isMusic) payload.trackId = id; else if (isTheatre) payload.movieId = id; else payload.bookId = id;
    const res = await fetch(`https://scriptorium-backend-six.vercel.app/api/${type}/shelf/remove`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `jwt ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
    });
    if (res.ok) btn.closest('.group').remove();
}
function closeShelf() { modal.classList.add('hidden'); }