import React, { useRef, useState, useEffect } from 'react';
import io from "socket.io-client";
import { useNavigate, useParams } from 'react-router-dom';
import { IconButton, TextField } from '@mui/material';
import { Badge, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'

import styles from "../styles/videoComponent.module.css";
import server from '../environment';
// console.log(styles);





const server_url = `${server}`;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" },
    ]
}

const getDisplayMedia = () => {
    if (navigator.mediaDevices?.getDisplayMedia) {
        return navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    }

    if (navigator.getDisplayMedia) {
        return navigator.getDisplayMedia.bind(navigator);
    }

    if (navigator.webkitGetDisplayMedia) {
        return navigator.webkitGetDisplayMedia.bind(navigator);
    }

    if (navigator.mozGetDisplayMedia) {
        return navigator.mozGetDisplayMedia.bind(navigator);
    }

    return null;
}

const screenShareUnsupportedMessage = "This browser does not expose mobile screen sharing to web apps. Please compare your teacher's phone browser name/version, try Desktop site, or use an Android app build for true phone screen sharing.";

export default function VideoMeetComponent() {

    // const { url } = useParams();

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoRef = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState([]);

    let [audio, setAudio] = useState();

    let [screen, setScreen] = useState();

    let [showModal, setShowModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState(false);

    let [messages, setMessages] = useState([]);

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState();

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([]);

    let [videos, setVideos] = useState([]);

    const upsertRemoteVideo = (socketId, stream) => {
        setVideos((currentVideos) => {
            const withoutDuplicate = currentVideos.filter((video) => video.socketId !== socketId);
            const updatedVideos = [
                ...withoutDuplicate,
                {
                    socketId,
                    stream,
                    autoPlay: true,
                    playsInline: true,
                },
            ];

            videoRef.current = updatedVideos;
            return updatedVideos;
        });
    }

    // TODO
    // if(isChrome() == false){

    //}

    useEffect(() => {
        getPermissions();
    }, [])

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });

            if (videoPermission) {
                setVideoAvailable(true);
            } else {
                setVideoAvailable(false);
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
            } else {
                setAudioAvailable(false);
            }

            if (getDisplayMedia()) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });

                if (userMediaStream) {
                    window.localStream = userMediaStream;

                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = userMediaStream;
                        await localVideoRef.current.play().catch((err) => {
                            if (err.name !== "AbortError") {
                                console.log(err);
                            }
                        });
                    }
                }
            }

        } catch (err) {
            console.log(err);
        }
    }

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [audio, video]);

    // TODO
    let gotMessageFromServer = async (fromId, message) => {
        var signal = JSON.parse(message);

        if (fromId !== socketIdRef.current) {
            if (!connections[fromId]) {
                connections[fromId] = new RTCPeerConnection(peerConfigConnections);
            }

            if (signal.sdp) {
                const connection = connections[fromId];
                const description = new RTCSessionDescription(signal.sdp);

                try {
                    if (description.type === "offer") {
                        if (connection.signalingState !== "stable") {
                            return;
                        }

                        await connection.setRemoteDescription(description);
                        const answer = await connection.createAnswer();

                        if (connection.signalingState !== "have-remote-offer") {
                            return;
                        }

                        await connection.setLocalDescription(answer);
                        socketRef.current.emit("signal", fromId, JSON.stringify({ "sdp": connection.localDescription }));
                    } else if (description.type === "answer") {
                        if (connection.signalingState === "have-local-offer") {
                            await connection.setRemoteDescription(description);
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    // TODO
    let addMessage = (data, sender, socketIdSender) => {

        setMessages((prevMessages) => [
            ...prevMessages, 
            {sender: sender, data: data}
        ]);

        if(socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages +1);
        }


    }

    let connectToSocketServer = () => {

        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketRef.current.emit("join-call", window.location.href);

            socketIdRef.current = socketRef.current.id

            socketRef.current.on("chat-message", addMessage);

            socketRef.current.on("user-left", (id) => {
                setVideos((videos) => {
                    const updatedVideos = videos.filter((video) => video.socketId !== id);
                    videoRef.current = updatedVideos;
                    return updatedVideos;
                })
            })

            socketRef.current.on("user-joined", (id, clients) => {

                clients.forEach((socketListId) => {
                    if (connections[socketListId]) {
                        return;
                    }

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate !== null) {
                            socketRef.current.emit("signal", socketListId, JSON.stringify({ "ice": event.candidate }));
                        }
                    }

                    connections[socketListId].onaddstream = (event) => {
                        console.log("Remote stream received", event.stream);

                        upsertRemoteVideo(socketListId, event.stream);
                    };
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream);
                    } else {
                        // TODO BLACKSILENCE
                        // let blackSilence

                        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence();
                        connections[socketListId].addStream(window.localStream);
                    }
                });

                if (id == socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 == socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        console.log("Creating offer for:", id2);
                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit("signal", id2, JSON.stringify({ "sdp": connections[id2].localDescription }));
                                })
                                .catch((e) => { console.log(e) });
                        })
                    }
                }
            })
        })

    }

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }

    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream;
        localVideoRef.current.srcObject = stream;

        for (let id in connections) {
            if (id == socketIdRef.current) continue

            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoRef.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            // TODO 
            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoRef.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator();

        let dst = oscillator.connect(ctx.createMediaStreamDestination());

        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });

    }

    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement('canvas'), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess) //TODO: getUserMedia
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) {

            }
        }
    }

    let routeTo = useNavigate();

    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }

    let handleVideo = () => {
        setVideo(!video);

    }

    let handleAudio = () => {
        setAudio(!audio);
    }

    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoRef.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoRef.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoRef.current.srcObject = window.localStream

            getUserMedia()

        })
    }


    let getDislayMedia = () => {
        if (screen) {
            const displayMedia = getDisplayMedia();

            if (displayMedia) {
                displayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => {
                        console.log(e);
                        setScreen(false);
                    })
            } else {
                setScreen(false);
                alert(screenShareUnsupportedMessage);
            }
        }
    }

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])

    let handleScreen = () => {
        if (!screenAvailable) {
            alert(screenShareUnsupportedMessage);
            return;
        }

        setScreen(!screen);
    }

    let sendMessage  = () => {
        console.log(socketRef.current);
        socketRef.current.emit("chat-message", message, username);
        setMessage("");

    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        } catch (e) {}

        routeTo("/home");
    }

    return (
        <div>

            {askForUsername == true ?
                <div>
                    <h2>Enter into Lobby</h2>
                    <p>
        Screen Share API: {typeof navigator.mediaDevices?.getDisplayMedia}
    </p>
                    <TextField id="outlined-basic" label="Username" variant="outlined" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <Button variant="contained" onClick={connect}>Connect</Button>

                    <div>
                        <video ref={localVideoRef} autoPlay muted  > </video>
                    </div>
                </div> :
                <div className={styles.meetVideoContainer}>

                    {showModal ? <div className={styles.chatRoom}>
                                  <div className= {styles.chatContainer}>
                                    <h1>Chat</h1>

                                    <div className={styles.chattingDisplay}>
                                          {messages.length !==0 ? messages.map((item, index) => {
                                            return(
                                                <div style={{ marginBottom: "20px" }} key={index}>
                                                    <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                                     <p>{item.data}</p>
                                                </div>
                                            )
                                          }): <p>No Messages Yet</p>}
                                         </div>
                                    <div className={styles.chattingArea}>
                                        <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your Chat" variant="outlined" />
                                        <Button variant="contained" onClick={sendMessage}>Send</Button>
                                    </div>
                                  </div>
                    </div> : <></>}
                    

                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }} >
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>

                        <IconButton onClick={ handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        <IconButton
                            onClick={handleScreen}
                            title={screenAvailable ? "Share screen" : "Screen sharing not supported on this browser"}
                            style={{ color: screenAvailable ? "white" : "gray" }}
                        >
                            {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </IconButton>

                        <Badge badgeContent={newMessages} max={999} color='secondary'>
                            <IconButton onClick={() => setShowModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>

                    </div>

                    <video className={styles.meetUserVideo} ref={localVideoRef} autoPlay muted></video>
                    <div className={styles.conferenceViwe}>
                        {videos.map((video) => (
                            <div key={video.socketId}>


                                <video
                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay

                                >

                                </video>

                            </div>
                        ))}
                    </div>
                </div>
            }
        </div>
    )
}
