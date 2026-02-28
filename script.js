const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyO6B-fEBx53eS8neBwRDLC1l-iEJitClAXP9WnhcNEMHBkiYx4IMCF9M1JT27FooWjDw/exec"; 
let currentUser = localStorage.getItem('user');
let activePost = null;

// Helper para rodar funções do Apps Script
function run(func, data, cb) {
    if (typeof google !== 'undefined') {
        google.script.run.withSuccessHandler(cb)[func](data);
    } else {
        console.error("Ambiente Google Apps Script não detectado.");
    }
}

function toggleAuth(showSignup) {
    document.getElementById('login-view').classList.toggle('hidden', showSignup);
    document.getElementById('signup-view').classList.toggle('hidden', !showSignup);
}

function doSignup() {
    const user = document.getElementById('s-user').value;
    const email = document.getElementById('s-email').value;
    const tel = document.getElementById('s-tel').value;
    const pass = document.getElementById('s-pass').value;
    const pass2 = document.getElementById('s-pass2').value;

    if(!user || !pass) return alert("Preencha usuário e senha!");
    if(pass !== pass2) return alert("Senhas não conferem!");

    const data = { user, email, telefone: tel, senha: pass };
    run('userAction', 'signup', data, (res) => {
        if(res.success) { alert("Conta criada com sucesso!"); toggleAuth(false); }
        else alert(res.msg);
    });
}

function doLogin() {
    const user = document.getElementById('l-user').value;
    const pass = document.getElementById('l-pass').value;
    
    if(!user || !pass) return alert("Preencha os campos!");

    const data = { user, senha: pass };
    run('userAction', 'login', data, (res) => {
        if(res.success) {
            currentUser = res.user;
            localStorage.setItem('user', res.user);
            initApp();
        } else alert(res.msg);
    });
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById('page-' + id);
    if(target) target.classList.remove('hidden');
    
    if(id === 'community') loadPosts();
    window.scrollTo(0,0);
}

function loadPosts() {
    const list = document.getElementById('posts-list');
    list.innerHTML = "<p>Carregando posts...</p>";
    run('getPosts', null, (posts) => {
        list.innerHTML = posts.map(p => `
            <div class="post-card" onclick='openPost(${JSON.stringify(p)})'>
                <div class="post-header">
                    <span>${p.categoria} @${p.user}</span>
                    <span>${p.data}</span>
                </div>
                <b style="font-size: 1.1rem; color: var(--green);">${p.titulo}</b>
                <div class="reaction-bar">
                    <span>👍 ${p.upvotes}</span> <span>❤️ ${p.hearts}</span>
                </div>
            </div>
        `).join('');
    });
}

function openPost(p) {
    activePost = p;
    showPage('post-detail');
    document.getElementById('full-post-content').innerHTML = `
        <div class="post-header"><span>${p.categoria} @${p.user}</span> <span>${p.data} às ${p.hora}</span></div>
        <h2 style="color: var(--green); margin: 5px 0;">${p.titulo}</h2>
        <div style="margin: 20px 0; line-height: 1.6; color: #eee;">${p.texto}</div>
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
    run('addReaction', row, col, () => {
        // Atualiza o post aberto sem recarregar tudo
        run('getPosts', null, (posts) => {
            const updated = posts.find(item => item.row === row);
            if(updated) openPost(updated);
        });
    });
}

function loadComments(title) {
    run('getPostDetails', title, (res) => {
        document.getElementById('comments-list').innerHTML = res.comments.map(c => `
            <div style="font-size: 0.9rem; margin-top: 10px; border-left: 2px solid var(--green); padding-left: 10px; background: #050505; padding: 8px;">
                <b style="color: var(--yellow)">${c.user}:</b> ${c.comment}
            </div>
        `).join('') || "<p style='color:#666'>Nenhum comentário ainda.</p>";
        
        document.getElementById('emoji-box').innerHTML = res.emojiList.map(e => `
            <span class="emoji-item" onclick="addEmoji('${e.trim()}')">${e}</span>
        `).join('');
    });
}

function addEmoji(e) {
    document.getElementById('comment-text').value += e;
    toggleEmoji();
}

function sendComment() {
    const txt = document.getElementById('comment-text').value;
    if(!txt) return;
    run('postComment', {user: currentUser, comment: txt, post: activePost.titulo}, () => {
        document.getElementById('comment-text').value = "";
        loadComments(activePost.titulo);
    });
}

function execCmd(cmd) { document.execCommand(cmd, false, null); }

function showNewPost() {
    showPage('new-post');
    document.getElementById('editor').innerHTML = "";
    document.getElementById('post-title').value = "";
}

function submitPost() {
    const titulo = document.getElementById('post-title').value;
    const texto = document.getElementById('editor').innerHTML;
    if(!titulo || !texto) return alert("Título e texto são obrigatórios!");

    const data = {
        user: currentUser,
        titulo: titulo,
        categoria: document.getElementById('post-cat').value,
        texto: texto
    };
    run('createPost', data, () => showPage('community'));
}

function showTerms() { document.getElementById('modal-terms').classList.remove('hidden'); }
function hideTerms() { document.getElementById('modal-terms').classList.add('hidden'); }
function startDownload() {
    window.location.href = "app-release.apk";
    hideTerms();
}

function toggleEmoji() { document.getElementById('emoji-box').classList.toggle('hidden'); }

function logout() { localStorage.clear(); location.reload(); }

function initApp() {
    if(currentUser) {
        document.getElementById('auth-page').classList.add('hidden');
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        showPage('download');
    } else {
        document.getElementById('auth-page').classList.remove('hidden');
        document.getElementById('navbar').classList.add('hidden');
        document.getElementById('main-content').classList.add('hidden');
    }
}

window.onload = initApp;
              
