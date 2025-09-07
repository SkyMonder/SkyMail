let socket = io();
let localStream;
let peerConnection;
let currentCallUser;
let username;
let token;

async function register() {
  username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
  alert('Registered ' + username);
}

async function login() {
  username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
  const data = await r.json();
  token = data.token;
  socket.emit('register_socket', username);
  loadInbox();
}

async function send() {
  const to = document.getElementById('to').value;
  const subject = document.getElementById('subject').value;
  const body = document.getElementById('body').value;
  await fetch('/api/send', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({ to, subject, body }) });
  alert('Message sent');
}

async function loadInbox() {
  const r = await fetch('/api/inbox', { headers:{'Authorization':'Bearer '+token} });
  const inbox = await r.json();
  document.getElementById('inbox').innerHTML = inbox.map(m => '<div class="message"><b>'+m.from+'</b>: '+m.subject+'<br>'+m.body+'</div>').join('');
}

async function startCall() {
  currentCallUser = document.getElementById('callTo').value;
  localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  document.getElementById('localVideo').srcObject = localStream;

  peerConnection = new RTCPeerConnection();
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = e => document.getElementById('remoteVideo').srcObject = e.streams[0];

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      socket.emit('signal', { to: currentCallUser, signal: { candidate: e.candidate } });
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('signal', { to: currentCallUser, signal: { sdp: offer } });
}

socket.on('signal', async (data) => {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection();
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = e => document.getElementById('remoteVideo').srcObject = e.streams[0];
    peerConnection.onicecandidate = e => {
      if (e.candidate) socket.emit('signal', { to: data.from, signal: { candidate: e.candidate } });
    };
  }

  if (data.signal.sdp) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
    if (data.signal.sdp.type === 'offer') {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('signal', { to: data.from, signal: { sdp: answer } });
    }
  } else if (data.signal.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
  }
});

function enableMic(){ localStream.getAudioTracks()[0].enabled = true; }
function disableMic(){ localStream.getAudioTracks()[0].enabled = false; }
function enableCam(){ localStream.getVideoTracks()[0].enabled = true; }
function disableCam(){ localStream.getVideoTracks()[0].enabled = false; }
function endCall(){ peerConnection.close(); socket.emit('end_call',{ to: currentCallUser }); }

socket.on('call_ended', ()=>{
  alert('Call ended');
  if (peerConnection) peerConnection.close();
});
