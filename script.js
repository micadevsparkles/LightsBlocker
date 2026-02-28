const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxtKzTyC7OSWDSEnMD-ft6M1ztlxNtmZ1TsaKFDSQmZX0M2TVnT7Ve5feh7AvAkCdGLXg/exec"; // COLE AQUI A URL DA IMPLANTAÇÃO

let currentUser = localStorage.getItem('user');
let activePost = null;

// Nova função de comunicação via FETCH para funcionar no GitHub Pages
// Funções auxiliares de loading
function showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

async function run(func, data, cb) {
    showLoading(); // Inicia a animação giratória
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ func: func, data: data, col: data.col || null })
        });
        const result = await response.json();
        hideLoading(); // Para a animação
        cb(result);
    } catch (err) {
        hideLoading();
        console.error("Erro na chamada:", err);
        alert("Erro de conexão com o servidor.");
    }
}

function toggleAuth(showSignup) {
    document.getElementById('login-view').classList.toggle('hidden', showSignup);
    document.getElementById('signup-view').classList.toggle('hidden', !showSignup);
}

function doSignup() {
    const user = document.getElementById('s-user').value.trim();
    const email = document.getElementById('s-email').value.trim();
    const tel = document.getElementById('s-tel').value.trim();
    const pass = document.getElementById('s-pass').value;
    const pass2 = document.getElementById('s-pass2').value;

    if (!user || !pass) return alert("Preencha os campos!");
    if (pass !== pass2) return alert("Senhas não conferem!");

    run('userAction', { type: 'signup', payload: { user, email, telefone: tel, senha: pass } }, (res) => {
        if (res.success) { alert("Sucesso!"); toggleAuth(false); }
        else alert(res.msg);
    });
}

function doLogin() {
    const user = document.getElementById('l-user').value.trim();
    const pass = document.getElementById('l-pass').value;
    run('userAction', { type: 'login', payload: { user, senha: pass } }, (res) => {
        if (res.success) {
            currentUser = res.user;
            localStorage.setItem('user', res.user);
            initApp();
        } else alert(res.msg);
    });
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + id).classList.remove('hidden');
    if (id === 'community') loadPosts();
    window.scrollTo(0, 0);
}

function loadPosts() {
    const list = document.getElementById('posts-list');
    list.innerHTML = ""; // Limpa a lista pra não duplicar antes do loading
    run('getPosts', {}, (posts) => {
        if(!posts || posts.length === 0) {
            list.innerHTML = "<p style='text-align:center; color:#666;'>Nenhum post recente.</p>";
            return;
        }
        list.innerHTML = posts.map(p => `
            <div class="post-card" onclick='openPost(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
                <div class="post-header"><span>${p.categoria} @${p.user}</span><span>${timeAgo(p.data, p.hora)}</span></div>
                <b style="font-size: 1.1rem; color: var(--green);">${p.titulo}</b>
                <div class="reaction-bar" style="margin-top:10px; pointer-events:none;">
                    <span style="font-size:0.9rem; color:#aaa;">👍 ${p.upvotes} &nbsp; ❤️ ${p.hearts}</span>
                </div>
            </div>
        `).join('');
    });
}

function openPost(p) {
    activePost = p;
    showPage('post-detail');
    document.getElementById('full-post-content').innerHTML = `
        <div class="post-header"><span>${p.categoria} @${p.user}</span><span>${timeAgo(p.data, p.hora)}</span></div>
        <h2 style="color: var(--green); margin: 5px 0;">${p.titulo}</h2>
        <div style="margin: 20px 0; line-height: 1.6;">${p.texto}</div>
        <div class="reaction-bar">
            <button class="react-btn" onclick="react(${p.row}, 7)" title="Upvotes: ${p.upvotes}">🔼</button>
            <button class="react-btn" onclick="react(${p.row}, 8)" title="Downvotes: ${p.downvotes}">🔽</button>
            <button class="react-btn" onclick="react(${p.row}, 9)" title="Corações: ${p.hearts}">❤️</button>
            <button class="react-btn" onclick="react(${p.row}, 10)" title="Triste: ${p.sads}">😢</button>
            <button class="react-btn" onclick="react(${p.row}, 11)" title="Uau: ${p.wows}">😲</button>
            <button class="react-btn" onclick="react(${p.row}, 12)" title="Força: ${p.strength}">🩹</button>
        </div>
    `;
    loadComments(p.titulo);
}
function timeAgo(dateStr, timeStr) {
    if (!dateStr) return "";
    const parts = dateStr.split('/');
    const timeParts = timeStr ? timeStr.split(':') : [0,0];
    
    // Converte a string "dd/MM/yyyy HH:mm" da planilha para o formato Date do JS
    const postDate = new Date(parts[2], parts[1] - 1, parts[0], timeParts[0], timeParts[1]);
    const now = new Date();
    
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours} h`;
    if (diffDays === 1) return `Há 1 dia`;
    return `Há ${diffDays} dias`;
}

function react(row, col) {
    run('addReaction', { row: row, col: col }, () => {
        run('getPosts', {}, (posts) => {
            const updated = posts.find(item => item.row === row);
            if (updated) openPost(updated);
        });
    });
}

function loadComments(title) {
    run('getPostDetails', { title: title }, (res) => {
        document.getElementById('comments-list').innerHTML = res.comments.map(c => `
            <div style="font-size:0.9rem; margin-top:10px; border-left:2px solid var(--green); padding-left:10px; background:#0a0a0a; padding:8px;">
                <b style="color:var(--yellow)">@${c.user}:</b> ${c.comment}
            </div>
        `).join('') || "<p style='color:#666'>Sem comentários.</p>";
        document.getElementById('emoji-box').innerHTML = res.emojiList.map(e => `
            <span class="emoji-item" onclick="addEmoji('${e.trim()}')">${e}</span>
        `).join('');
    });
}

function addEmoji(e) { document.getElementById('comment-text').value += e; toggleEmoji(); }
function sendComment() {
    const txt = document.getElementById('comment-text').value.trim();
    if (!txt) return;
    run('postComment', { user: currentUser, comment: txt, post: activePost.titulo }, () => {
        document.getElementById('comment-text').value = "";
        loadComments(activePost.titulo);
    });
}

function execCmd(cmd) { document.execCommand(cmd, false, null); }
function showNewPost() { showPage('new-post'); document.getElementById('editor').innerHTML = ""; }
function submitPost() {
    const data = { user: currentUser, titulo: document.getElementById('post-title').value, categoria: document.getElementById('post-cat').value, texto: document.getElementById('editor').innerHTML };
    run('createPost', data, () => showPage('community'));
}
function showTerms() { document.getElementById('modal-terms').classList.remove('hidden'); }
function hideTerms() { document.getElementById('modal-terms').classList.add('hidden'); }
function startDownload() { window.location.href = "app-release.apk"; hideTerms(); }
function toggleEmoji() { document.getElementById('emoji-box').classList.toggle('hidden'); }
function logout() { localStorage.removeItem('user'); location.reload(); }

function initApp() {
    if (currentUser) {
        document.getElementById('auth-page').classList.add('hidden');
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        // Alterado de 'download' para 'community'
        showPage('community'); 
    } else {
        document.getElementById('auth-page').classList.remove('hidden');
    }
}
window.onload = initApp;
