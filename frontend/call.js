const BACKEND_URL = 'https://YOUR_BACKEND_URL.onrender.com';
let socket;
let localStream;
let peerConnection;
let currentCallUser;
let username = localStorage.getItem('username');
let token = localStorage.getItem('token');

function setupSocket(){
  socket = io(BACKEND_URL);
  socket.emit('register_socket', username);
  socket.on('signal', async ({from,signal})=>{
    if(!peerConnection) startIncomingCall(from,signal);
    else await peerConnection.setRemoteDescription(signal);
  });
  socket.on('call_ended', ()=>endCall());
}

async function startCall(){
  const to = document.getElementById('callTo').value;
  currentCallUser = to;
  localStream = await navigator.mediaDevices.getUserMedia({audio:true,video:true});
  document.getElementById('localVideo').srcObject=localStream;
  peerConnection=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  localStream.getTracks().forEach(track=>peerConnection.addTrack(track,localStream));
  peerConnection.ontrack=e=>document.getElementById('remoteVideo').srcObject=e.streams[0];
  const offer=await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('signal',{to:currentCallUser,signal:offer});
}

async function startIncomingCall(from, offer){
  currentCallUser=from;
  localStream = await navigator.mediaDevices.getUserMedia({audio:true,video:true});
  document.getElementById('localVideo').srcObject=localStream;
  peerConnection=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  localStream.getTracks().forEach(track=>peerConnection.addTrack(track,localStream));
  peerConnection.ontrack=e=>document.getElementById('remoteVideo').srcObject=e.streams[0];
  await peerConnection.setRemoteDescription(offer);
  const answer=await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('signal',{to:from,signal:answer});
}

function enableMic(){localStream.getAudioTracks()[0].enabled=true;}
function disableMic(){localStream.getAudioTracks()[0].enabled=false;}
function enableCam(){localStream.getVideoTracks()[0].enabled=true;}
function disableCam(){localStream.getVideoTracks()[0].enabled=false;}
function endCall(){peerConnection?.close();peerConnection=null;socket?.emit('end_call',{to:currentCallUser});}

window.onload=setupSocket;
