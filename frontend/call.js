const BACKEND_URL = 'https://YOUR_BACKEND_URL.onrender.com'; // замените на свой URL
let socket;
let localStream;
let peerConnection;
let currentCallUser;
let username;
let token;

async function register() {
  username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  await fetch(BACKEND_URL+'/api/register', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  alert('Registered ' + username);
}

async function login() {
  username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const r = await fetch(BACKEND_URL+'/api/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  const data = await r.json();
  token = data.token;
  socket = io(BACKEND_URL);
  socket.emit('register_socket', username);
  loadInbox();
  setupSocket();
}

async function send() {
  const to = document.getElementById('to').value;
  const subject = document.getElementById('subject').value;
  const body = document.getElementById('body').value;
  await fetch(BACKEND_URL+'/api/send', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify({ to, subject, body })
  });
  alert('Sent to ' + to);
  loadInbox();
}

async function loadInbox() {
  const r = await fetch(BACKEND_URL+'/api/inbox', {
    headers:{'Authorization':'Bearer '+token}
  });
  const messages = await r.json();
  const div = document.getElementById('inbox');
  div.innerHTML = messages.map(m=>`<b>${m.from}</b>: ${m.subject} - ${m.body}`).join('<br>');
}

// WebRTC
function setupSocket() {
  socket.on('signal', async ({from, signal})=>{
    if (!peerConnection) startIncomingCall(from, signal);
    else await peerConnection.setRemoteDescription(signal);
  });
  socket.on('call_ended', ()=>endCall());
}

async function startCall() {
  const to = document.getElementById('callTo').value;
  currentCallUser = to;
  localStream = await navigator.mediaDevices.getUserMedia({audio:true, video:true});
  document.getElementById('localVideo').srcObject = localStream;
  peerConnection = new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  localStream.getTracks().forEach(track=>peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = e => document.getElementById('remoteVideo').srcObject = e.streams[0];
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('signal',{to,currentCallUser,signal:offer});
}

async function startIncomingCall(from, offer) {
  currentCallUser = from;
  localStream = await navigator.mediaDevices.getUserMedia({audio:true, video:true});
  document.getElementById('localVideo').srcObject = localStream;
  peerConnection = new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  localStream.getTracks().forEach(track=>peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = e => document.getElementById('remoteVideo').srcObject = e.streams[0];
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('signal',{to:from, signal:answer});
}

function enableMic(){localStream.getAudioTracks()[0].enabled=true;}
function disableMic(){localStream.getAudioTracks()[0].enabled=false;}
function enableCam(){localStream.getVideoTracks()[0].enabled=true;}
function disableCam(){localStream.getVideoTracks()[0].enabled=false;}
function endCall(){peerConnection?.close();peerConnection=null;socket?.emit('end_call',{to:currentCallUser});}
