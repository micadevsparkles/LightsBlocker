// ATENÇÃO: Substitua a URL abaixo pela URL fornecida pelo Google Apps Script (Implantar > Nova Implantação)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyO6B-fEBx53eS8neBwRDLC1l-iEJitClAXP9WnhcNEMHBkiYx4IMCF9M1JT27FooWjDw/exec"; 

let currentUser = localStorage.getItem('user');
let activePost = null;

/**
 * Função Engine: Faz a ponte entre o site no GitHub e a Planilha Google.
 * Corrigido para garantir que o 'google.script.run' seja chamado corretamente.
 */
function run(func, data, cb) {
    // Se estiver rodando dentro de um iframe do Google (Web App direto)
    if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
            .withSuccessHandler(cb)
            .withFailureHandler((err) => alert("Erro no servidor: " + err))
            [func](data);
    } else {
        // Se estiver rodando no GitHub Pages, precisamos usar fetch (JSONP ou API)
        // Mas para simplificar conforme seu uso, certifique-se de que o index.html 
        // tenha o script de API do Google carregado.
        alert("Erro: O script não detectou o ambiente do Google. Verifique se o SCRIPT_URL está correto e se você publicou como Web App.");
    }
}

// --- SISTEMA DE AUTENTICAÇÃO ---

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

    if (!user || !pass || !email) {
        alert("Por favor, preencha os campos obrigatórios (Usuário, E-mail e Senha).");
        return;
    }

    if (pass !== pass2) {
        alert("As senhas digitadas não conferem!");
        return;
    }

    const data = { 
        user: user, 
        email: email, 
        telefone: tel, 
        senha: pass 
    };

    // Chamada para a aba 'user' da planilha
    run('userAction', 'signup', data, (res) => {
        if (res && res.success) {
            alert("Conta criada com sucesso! Agora você pode fazer login.");
            toggleAuth(false);
            // Limpa os campos
            document.getElementById('s-user').value = "";
            document.getElementById('s-pass').value = "";
            document.getElementById('s-pass2').value = "";
        } else {
            alert(res ? res.msg : "Erro desconhecido ao cadastrar.");
        }
    });
}

function doLogin() {
    const user = document.getElementById('l-user').value.trim();
    const pass = document.getElementById('l-pass').value;
    
    if (!user || !pass) {
        alert("Preencha usuário e senha!");
        return;
    }

    const data = { user: user, senha: pass };

    run('userAction', 'login', data, (res) => {
        if (res && res.success) {
            currentUser = res.user;
            localStorage.setItem('user', res.user);
            initApp();
        } else {
            alert(res ? res.msg : "Usuário ou senha incorretos.");
        }
    });
}

// --- NAVEGAÇÃO E INTERFACE ---

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById('page-' + id);
    if (target) target.classList.remove('hidden');
    
    if (id === 'community') loadPosts();
    window.scrollTo(0, 0);
}

function loadPosts() {
    const list = document.getElementById('posts-list');
    list.innerHTML = "<p style='text-align:center; padding:20px;'>Carregando comunidade...</p>";
    
    run('getPosts', null, (posts) => {
        if (!posts || posts.length === 0) {
            list.innerHTML = "<p style='text-align:center; color:#666;'>Nenhum post recente nos últimos 7 dias.</p>";
            return;
        }
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
        <div style="margin: 20px 0; line-height: 1.6; color: #eee; border-left: 3px solid #333; padding-left: 15px;">${p.texto}</div>
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
        run('getPosts', null, (posts) => {
            const updated = posts.find(item => item.row === row);
            if (updated) openPost(updated);
        });
    });
}

function loadComments(title) {
    run('getPostDetails', title, (res) => {
        const list = document.getElementById('comments-list');
        list.innerHTML = res.comments.map(c => `
            <div style="font-size: 0.9rem; margin-top: 10px; border-left: 2px solid var(--green); padding-left: 10px; background: #0a0a0a; padding: 10px; border-radius: 4px;">
                <b style="color: var(--yellow)">@${c.user}:</b> ${c.comment}
            </div>
        `).join('') || "<p style='color:#666; font-size: 0.9rem;'>Seja o primeiro a comentar!</p>";
        
        const picker = document.getElementById('emoji-box');
        picker.innerHTML = res.emojiList.map(e => `
            <span class="emoji-item" onclick="addEmoji('${e.trim()}')">${e}</span>
        `).join('');
    });
}

function addEmoji(e) {
    document.getElementById('comment-text').value += e;
    toggleEmoji();
}

function sendComment() {
    const txt = document.getElementById('comment-text').value.trim();
    if (!txt) return;
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
    const titulo = document.getElementById('post-title').value.trim();
    const texto = document.getElementById('editor').innerHTML;
    if (!titulo || texto === "<br>" || !texto) {
        alert("Preencha o título e o corpo do post!");
        return;
    }

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

function logout() { 
    localStorage.removeItem('user'); 
    location.reload(); 
}

/**
 * Inicialização do App
 * Garante que a tela correta seja exibida baseada no login
 */
function initApp() {
    const authPage = document.getElementById('auth-page');
    const navbar = document.getElementById('navbar');
    const mainContent = document.getElementById('main-content');

    if (currentUser) {
        authPage.classList.add('hidden');
        navbar.classList.remove('hidden');
        mainContent.classList.remove('hidden');
        showPage('download');
    } else {
        authPage.classList.remove('hidden');
        navbar.classList.add('hidden');
        mainContent.classList.add('hidden');
    }
}

window.onload = initApp;
        
