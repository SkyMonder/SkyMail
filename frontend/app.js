const BACKEND_URL='https://YOUR_BACKEND_URL.onrender.com';
let token,username;

function showSection(id){
  ['auth','inbox','compose','calls'].forEach(s=>document.getElementById(s).style.display='none');
  if(id!=='auth') document.getElementById('nav').style.display='block';
  document.getElementById(id).style.display='block';
  if(id==='inbox') loadInbox();
}

async function register(){
  username=document.getElementById('username').value;
  const password=document.getElementById('password').value;
  const r=await fetch(BACKEND_URL+'/api/register',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,password})
  });
  alert('Registered '+username);
}

async function login(){
  username=document.getElementById('username').value;
  const password=document.getElementById('password').value;
  const r=await fetch(BACKEND_URL+'/api/login',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,password})
  });
  const data=await r.json();
  token=data.token;
  localStorage.setItem('token',token);
  localStorage.setItem('username',username);
  showSection('inbox');
}

function logout(){
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  token=null;
  username=null;
  document.getElementById('nav').style.display='none';
  showSection('auth');
}

async function send(){
  const to=document.getElementById('to').value;
  const subject=document.getElementById('subject').value;
  const body=document.getElementById('body').value;
  await fetch(BACKEND_URL+'/api/send',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body:JSON.stringify({to,subject,body})
  });
  alert('Sent to '+to);
  showSection('inbox');
}

async function loadInbox(){
  const r=await fetch(BACKEND_URL+'/api/inbox',{headers:{'Authorization':'Bearer '+token}});
  const messages=await r.json();
  const div=document.getElementById('messages');
  div.innerHTML=messages.map(m=>`<div class="card"><b>${m.from}</b>: ${m.subject}<br>${m.body}</div>`).join('');
}

window.onload=()=>{
  if(localStorage.getItem('token')){
    token=localStorage.getItem('token');
    username=localStorage.getItem('username');
    showSection('inbox');
  } else showSection('auth');
};


window.onload = () => {
  if(document.getElementById('inbox')) loadInbox();
};
