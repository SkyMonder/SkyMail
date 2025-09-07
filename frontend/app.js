const BACKEND_URL = 'https://YOUR_BACKEND_URL.onrender.com'; // замените на свой URL
let token;
let username;

async function register() {
  username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  await fetch(BACKEND_URL+'/api/register',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username,password})
  });
  alert('Registered ' + username);
}

async function login() {
  username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const r = await fetch(BACKEND_URL+'/api/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username,password})
  });
  const data = await r.json();
  token = data.token;
  localStorage.setItem('token', token);
  localStorage.setItem('username', username);
  window.location.href = 'inbox.html';
}

function logout(){
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href='index.html';
}

async function send() {
  const to = document.getElementById('to').value;
  const subject = document.getElementById('subject').value;
  const body = document.getElementById('body').value;
  await fetch(BACKEND_URL+'/api/send',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify({to,subject,body})
  });
  alert('Sent to ' + to);
  window.location.href='inbox.html';
}

async function loadInbox() {
  const r = await fetch(BACKEND_URL+'/api/inbox',{
    headers:{'Authorization':'Bearer '+token}
  });
  const messages = await r.json();
  const div = document.getElementById('inbox');
  div.innerHTML = messages.map(m=>`<div class="card"><b>${m.from}</b>: ${m.subject}<br>${m.body}</div>`).join('');
}

window.onload = () => {
  if(document.getElementById('inbox')) loadInbox();
};
