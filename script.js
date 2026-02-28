const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxtKzTyC7OSWDSEnMD-ft6M1ztlxNtmZ1TsaKFDSQmZX0M2TVnT7Ve5feh7AvAkCdGLXg/exec"; // COLE AQUI A URL DA IMPLANTAÇÃO

let currentUser = localStorage.getItem('user');
let activePost = null;

// Nova função de comunicação via FETCH para funcionar no GitHub Pages
async function run(func, data, cb) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ func: func, data: data, col: data.col || null })
        });
        const result = await response.json();
        cb(result);
    } catch (err) {
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
    list.innerHTML = "<p style='padding:20px'>Carregando...</p>";
    run('getPosts', {}, (posts) => {
        list.innerHTML = posts.map(p => `
            <div class="post-card" onclick='openPost(${JSON.stringify(p)})'>
                <div class="post-header"><span>${p.categoria} @${p.user}</span><span>${p.data}</span></div>
                <b style="font-size: 1.1rem; color: var(--green);">${p.titulo}</b>
                <div class="reaction-bar"><span>👍 ${p.upvotes}</span><span>❤️ ${p.hearts}</span></div>
            </div>
        `).join('');
    });
}

function openPost(p) {
    activePost = p;
    showPage('post-detail');
    document.getElementById('full-post-content').innerHTML = `
        <div class="post-header"><span>${p.categoria} @${p.user}</span><span>${p.data} às ${p.hora}</span></div>
        <h2 style="color: var(--green); margin: 5px 0;">${p.titulo}</h2>
        <div style="margin: 20px 0; line-height: 1.6;">${p.texto}</div>
        <div class="reaction-bar">
            <button class="react-btn" onclick="react(${p.row}, 7)">🔼 Upvote (${p.upvotes})</button>
            <button class="react-btn" onclick="react(${p.row}, 8)">🔽 Down (${p.downvotes})</button>
            <button class="react-btn" onclick="react(${p.row}, 9)">❤️ (${p.hearts})</button>
            <button class="react-btn" onclick="react(${p.row}, 10)">😢 (${p.sads})</button>
            <button class="react-btn" onclick="react(${p.row}, 11)">😲 (${p.wows})</button>
            <button class="react-btn" onclick="react(${p.row}, 12)">🩹 (${p.strength})</button>
        </div>
    `;
    loadComments(p.titulo);
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
        showPage('download');
    } else {
        document.getElementById('auth-page').classList.remove('hidden');
    }
}
window.onload = initApp;
