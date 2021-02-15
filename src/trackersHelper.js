import dotenv from 'dotenv';
import {getAccessToken} from "./utils";
import React, {useState} from 'react';


import MicNoneIcon from '@material-ui/icons/MicNone';


import {
    Button, Card, CardContent, Checkbox,
    Container,
    FormControlLabel,
    Grid,
    IconButton, Input, InputLabel,
    Paper,
    TextField,
    Toolbar,
    Typography
} from "@material-ui/core";
import styles from './globalStyle';
import MessageR2 from "./components/MessageR2";
import TrackerTimeline from "./components/TrackerTimeline";
import {withStyles} from "@material-ui/core/styles";
import trackersList from './trackersList.json';
import CardHeader from "@material-ui/core/CardHeader";

const uuid = require('uuid').v4;
const appId = '';
const appSecret = '';
//const appId = process.env.SYMBL_APP_ID || SYMBL_APP_ID;
//const appSecret = process.env.SYMBL_APP_SECRET || SYMBL_APP_SECRET;
const apiBase = process.env.SYMBL_API_BASE_PATH || 'https://api.symbl.ai';

class SymblWebSocketAPI extends React.Component {


    constructor(props, context, options = {}, handlers = {}, lang = 'en-US') {
        super(props, context);
        this.initialState = {
            selectedFile: null,
            trackerArea: '',
            trackersListNew: '',
            showMic: false,
            transcriptResponse: {


                payload: {
                    content: ''
                }
            },
            messageResponse2: {
                payload: {
                    content: ''
                }
            },
            trackerResponse: {
                name: {
                    type: '',
                    value: ''
                },

            }
        };
        this.state = this.initialState;
        this.status = 'NONE';

        this.options = options;
        this.handlers = handlers;

        this.meetingId = this.options.meetingId;

        if (!this.options.hasOwnProperty('autoStart')) {
            this.options.autoStart = true;
        }
        this.options.enableAutomaticPunctuation = true;
        if (options.hasOwnProperty('enableAutomaticPunctuation')) {
            this.options.enableAutomaticPunctuation = options.enableAutomaticPunctuation;
        }
        if (!this.options.hasOwnProperty('enableAutomaticPunctuation')) {
            this.options.enableAutomaticPunctuation = true;
        }

        this.participants = this.options.participants;
        this.localParticipant = this.options.localParticipant;

        this.options.mode = options.mode || 'multi-speaker';
        this.options.lang = lang;
        this.options.bufferSize = options.bufferSize || 4096;
        this.options.participantNames = options.participantNames || [];

        this.onStopCallback = null;
        this.start = this.start.bind(this);
        const _url = new URL(apiBase);
        _url.protocol = 'wss:';
        const wssBasePath = _url.origin;
        const url = `${wssBasePath}/v1/realtime/insights/` + uuid();//this.options.meetingId;
        this.speechConfig = {languageCode: lang, url};


        this.processAudio = this.processAudio.bind(this);
        this.silenceDetected = this.silenceDetected.bind(this);
        this.checkSpeechStatus = this.checkSpeechStatus.bind(this);
        this.onNoSpeech = this.onNoSpeech.bind(this);
        this.openConnectionAndStart = this.openConnectionAndStart.bind(this);
        this.onRecognitionStopped = this.onRecognitionStopped.bind(this);
        this.onMessageResponse = this.onMessageResponse.bind(this);
        this.onTopicResponse = this.onTopicResponse.bind(this);
        this.onConversationCompleted = this.onConversationCompleted.bind(this);
        this.onTrackersResponse = this.onTrackersResponse.bind(this);
        this.trackerAreaChanged = this.trackerAreaChanged.bind(this);

        this.isSpeechStarted = false;
        this.timeSinceSpeechNotDetected = 0;

        this.recognitionResult = {
            transcript: undefined,
            isFinal: false
        };

        this.retryCount = 0;

        this.connectionHandlingInProgress = false;

        this.defaultPhrases = [];

        this.timeOutRef = null;

    }

    handleTrackerSubmission = e => {
        console.log(this.state.trackerArea + "on file upload");
        if (this.testJSON(this.state.trackerArea)) {
            alert("JSON valid , Trackers are set ");
            this.state.trackersListNew = this.state.trackerArea;
        } else {
            alert("Submit a valid JSON for Trackers ");
        }

    };

    //for file upload

    trackerAreaChanged(event) {
        this.setState({
            trackerArea: event.target.value

        });
        console.log(this.trackerArea);
        console.log(event.target.value);

    };

    // test for valid json

    testJSON(text) {
        if (typeof text !== "string") {
            return false;
        }
        try {
            JSON.parse(text);
            return true;
        } catch (error) {
            return false;
        }
    }


    async openConnectionAndStart() {
        try {
            this.setState({
                showMic: true
            });

            const json = await getAccessToken({appId, appSecret});
            console.log(json);
            const {accessToken, message} = json;
            if (message) {
                console.log('Error in fetching oauth2 token: ', message);
                return;
            }

            this.ws = new WebSocket(this.speechConfig.url + "?access_token=" + accessToken);
            console.log("meeting ID" + this.speechConfig.url);
            this.ws.onclose = this.onEnd.bind(this);
            this.ws.onerror = this.onError.bind(this);
            this.ws.onmessage = this.onMessageReceived.bind(this);
            console.log(json);
            this.ws.onopen = async (event) => {
                console.debug('Connection established with Symbl.');
                await this.start();
            };
        } catch (err) {
            console.error(err)
        }
    }

    silenceDetected() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {

            if (this.recognitionResult.transcript && !this.recognitionResult.isFinal) {
                this.onSpeechDetected({isFinal: true, punctuated: {transcript: this.recognitionResult.transcript}});
            }

            console.log("silence_detected..");
        }
    }

    async start() {
        if (this.status !== 'NONE' && this.status !== 'STOPPED') {
            return;
        }

        this.status = 'STARTING';
        // Get media stream
        await (async () => {
            if (!this.audioContext) {
                // console.log('Getting Media Stream.');
                this.getUserMediaStream().then(stream => {
                    console.log('Got the media stream: ', stream);
                    this.stream = stream;
                    this.audioContext = this.createAudioProcessingTopology(stream);
                    console.log('Sample rate: ', this.audioContext.sampleRate, this.audioContext);
                    this.sendStartRecognitionRequest();
                }).catch(err => {
                    console.error(err);
                    this.onError(err);
                });
            } else {
                this.sendStartRecognitionRequest();
            }
        })();
    }

    sendStartRecognitionRequest() {
        console.log("here");
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // console.log('Sending start_recognition message.');
            console.log("here 2");
            if (this.participants) {
                const additional = Object.keys(this.participants).filter(name => !this.defaultPhrases.includes(name));
                if (additional && additional.length > 0) {
                    this.defaultPhrases = this.defaultPhrases.concat(additional);
                }
            }
            let varTrack;
            if (this.state.trackersListNew == '') {
                console.log("trackerList is empty");
                varTrack = trackersList;
            } else {
                varTrack = JSON.parse(this.state.trackersListNew);
                console.log("trackers list updated to new");
            }
            console.log("this is trackers list" + varTrack);
            this.ws.send(JSON.stringify({
                type: 'start_request',
                insightTypes: ["action_item", "question"],
                trackers: varTrack,
                config: {
                    confidenceThreshold: 0.5,
                    timezoneOffset: this.options.timezoneOffset || -480,
                    languageCode: "en-US",
                    meetingTitle: this.options.meetingTitle,
                    speechRecognition: {
                        languageCode: this.speechConfig.languageCode,
                        sampleRateHertz: this.audioContext.sampleRate,
                        mode: this.options.mode || 'multi-speaker',
                        enableAutomaticPunctuation: true,
                        speechContexts: [
                            {
                                phrases: this.defaultPhrases
                            }
                        ]
                    }
                },
                speaker: {
                    userId: this.localParticipant && this.localParticipant.email,
                    name: this.localParticipant && this.localParticipant.name
                }
            }));
        } else {
            console.error('WebSocket connection is not established. Cannot start Symbl.');
        }
    }

    checkSpeechStatus() {
        // console.log(this.isSpeechStarted, this.timeSinceSpeechNotDetected);
        this.timeSinceSpeechNotDetected++;
        if (this.timeSinceSpeechNotDetected > 1) {
            this.onSpeechEnd();
        }
        if (this.timeSinceSpeechNotDetected > 3) {
            // If more that 5 seconds has been passed since last speech detected. Mark current speech as final.
            this.onNoSpeech();
            this.timeSinceSpeechNotDetected = 0;
        }
    }

    createAudioProcessingTopology(stream) {
        const AudioContext = window.AudioContext // Default
            || window.webkitAudioContext; // Safari and old versions of Chrome

        const context = new AudioContext();
        const source = context.createMediaStreamSource(stream);

        const processor = context.createScriptProcessor(this.options.bufferSize, 1, 1);

        this.gainNode = context.createGain();

        source.connect(this.gainNode);
        this.gainNode.connect(processor);
        processor.connect(context.destination);

        processor.onaudioprocess = this.processAudio;
        return context;
    }

    mute() {
        if (this.gainNode) {
            this.gainNode.gain.value = 0;
            console.log('Muted');
        }
        // TODO: Stop and start recognition service.
    }

    unmute() {
        if (this.gainNode) {
            this.gainNode.gain.value = 1;
            console.log('Unmuted');
        }
    }

    processAudio(e) {
        if (this.status === 'STARTED') {
            const inputData = e.inputBuffer.getChannelData(0) || new Float32Array(this.options.bufferSize);
            // console.log(e.inputBuffer.duration);
            const targetBuffer = new Int16Array(inputData.length);
            for (let index = inputData.length; index > 0; index--)
                targetBuffer[index] = 32767 * Math.min(1, inputData[index]);
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(targetBuffer.buffer);
            } else {
                if (this.ws.readyState !== WebSocket.OPEN && !this.connectionHandlingInProgress) {
                    this.connectionHandlingInProgress = true;
                    this.stop(true);
                    const retry = () => {
                        if (this.retryCount < 3 && this.ws.readyState !== WebSocket.OPEN) {
                            console.log('Retry attempt: ', this.retryCount);
                            this.openConnectionAndStart();
                            this.retryCount++;
                            setTimeout(retry, 2000 * this.retryCount);
                        }
                    };
                    setTimeout(retry, 0);
                }
            }
        }
    }

    onMessageReceived(event) {
        const data = JSON.parse(event.data);
        console.log(event);
        if (this.timeOutRef)
            clearTimeout(this.timeOutRef);
        if (data.type === 'message') {
            const {message: {type}} = data;
            console.log(data.message);
            if (type === 'recognition_started') {
                // call the onStart callback
                this.onStart(data.message);
                this.status = 'STARTED';
                this.retryCount = 0;
                this.connectionHandlingInProgress = false;
            } else if (type === 'recognition_result') {
                this.onSpeechDetected(data.message);
            } else if (type === 'recognition_stopped') {
                this.onRecognitionStopped();
            } else if (type === 'conversation_completed') {
                this.onConversationCompleted(data.message)
            }
            if (type === 'error') {
                this.onError(data);
            }
        } else {
            if (data.type === 'message_response') {
                this.onMessageResponse(data.messages);
                console.log("inside message response");
                const {messageResponse2} = this.state;
                console.log("message_response2 " + JSON.stringify(messageResponse2));


                console.log("data is final " + data.isFinal);
                if (!!messageResponse2) {
                    this.setState({
                        messageResponse2: data
                    });
                }
            } else if (data.type === 'insight_response') {
                this.onInsightResponse(data.insights);
            } else if (data.type === 'topic_response') {
                this.onTopicResponse(data.topics);
            } else if (data.type === 'context_response') {
                this.onContextResponse(data.context);
            } else if (data.type === 'transcript_response') {
                const {
                    transcriptResponse
                } = this.state;
                console.log(transcriptResponse);
                console.log("data is final " + data.isFinal);
                console.log("data payload content" + data.payload.content);
                console.log("tempMessage" + this.tempMessage);
                if (!!transcriptResponse) {
                    this.setState({
                        transcriptResponse: data
                    });
                    if (data.isFinal == true && (this.tempMessage != data.payload.content)) {
                        this.tempMessage = data.payload.content;
                        this.setState({
                            messageResponse: data
                        });
                    }
                }
            } else if (data.type === 'tracker_response') {
                this.onTrackersResponse(data.trackers);
                console.log("inside tracker response");
                const {trackerResponse} = this.state;
                console.log("tracker_response " + JSON.stringify(trackerResponse));


                if (!!trackerResponse) {
                    this.setState({
                        trackerResponse: data
                    });
                }
            }

        }

    }

    getUserMediaStream() {
        return navigator.mediaDevices.getUserMedia({audio: true, video: false});
    }

    stop(callback) {
        this.onStopCallback = callback;

        if (this.stream) {
            this.stream.getTracks()
                .forEach(track => track.stop());
        }
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({type: 'stop_request'}));
        }
        this.status = 'STOPPED';
        this.onEnd();
    }

    onRecognitionStopped() {
        this.onStopCallback && this.onStopCallback();
    }

    onNoMatch() {
        super.onNoMatch();
    }

    onStart(message) {
        console.debug('Symbl WebSocket API started.');
        this.handlers.onStart && setTimeout(() => {
            this.handlers.onStart({conversationId: message.data && message.data.conversationId})
        }, 0)
    }

    onEnd(event) {
        console.debug('Symbl WebSocket API Stopped.');
    }

    onSpeechDetected(data) {
        console.log('speech detected', data);
        if (!this.isSpeechStarted) {
            this.onSpeechStart();
        }


        this.timeSinceSpeechNotDetected = 0;
        if (this.handlers.onSpeechDetected) {
            console.log('speech detected 2', data);
            setImmediate(() => {
                this.handlers.onSpeechDetected(data);
            });
        }
    }

    onMessageResponse(messages) {
        if (this.handlers.onMessageResponse) {
            setImmediate(() => {
                this.handlers.onMessageResponse(messages);
            });
        }
    }

    onInsightResponse(messages) {
        if (this.handlers.onInsightResponse) {
            setImmediate(() => {
                this.handlers.onInsightResponse(messages);
            });
        }
    }

    onTrackersResponse(messages) {
        console.log(messages);
        if (this.handlers.onTrackersResponse) {
            setImmediate(() => {
                this.handlers.onTrackersResponse(messages);
            });
        }
    }

    onTopicResponse(topics) {
        if (this.handlers.onTopicResponse) {
            setImmediate(() => {
                this.handlers.onTopicResponse(topics);
            });
        }
    }

    onContextResponse(context) {
        if (this.handlers.onContextResponse) {
            setImmediate(() => {
                this.handlers.onContextResponse(context);
            });
        }
    }

    onConversationCompleted(message, callback) {
        if (this.handlers.onConversationCompleted) {
            setImmediate(() => {
                this.handlers.onConversationCompleted(message);
            });
        }
        this.ws.close();
    }

    onSpeechStart(event) {
        this.isSpeechStarted = true;
        if (this.handlers.onSpeechStart) {
            setTimeout(this.handlers.onSpeechStart, 0);
        }
    }

    onSpeechEnd(event) {
        // console.log('speech end');
        this.isSpeechStarted = false;
        if (this.handlers.onSpeechEnd) {
            setTimeout(this.handlers.onSpeechEnd, 0);
        }
    }

    onNoSpeech() {
        this.silenceDetected();
        if (this.handlers.onNoSpeech) {
            setTimeout(this.handlers.onNoSpeech, 0);
        }
    }

    onError(event) {
        if (event.message && event.message.type === 'error') {
            const errorPayload = event.message.payload;
            console.error(errorPayload);
        } else {
            console.error(event);
        }
    }

    onSoundStart(event) {
        super.onSoundStart(event);
    }

    onSoundEnd(event) {
        super.onSoundEnd(event);
    }

    onAudioStart(event) {
        super.onAudioStart(event);
    }

    onAudioEnd(event) {
        super.onAudioEnd(event);
    }

    render() {

        return (
            <Container style={{width: '100%'}}>
                <Grid container direction={"row"}>
                </Grid>
                <Paper variant={"outlined"}>
                    <Grid container direction={"row"}>
                        <Grid item xs={4} sm={12}>
                            <Paper variant={"contained"} style={{
                                marginBottom: 15,
                                width: '100%'
                            }}>
                                <textArea id="ta"
                                          placeholder="Paste your trackers in Json format here , you can also download the sample trackers below . Or click on Connect Websocket to test with default trackers which are already part of this application . Default trackers include DIgital assitant detection , answering machine ,agent politeness,buyer confusion,agent empathy,verbal clarity,cancellation language etc."

                                          value={this.state.trackerArea}
                                          onChange={this.trackerAreaChanged}
                                          cols="140" rows="10">
                                </textArea>
                            </Paper>
                        </Grid>
                        <Grid container direction={"column"}>
                            <Grid item xs={4} sm={12} style={{textAlign: 'center', paddingBottom: 20}}>
                                <Paper variant={"contained"} style={{
                                    marginBottom: 15,
                                    width: '100%'
                                }}>
                                    <button onClick={this.handleTrackerSubmission}
                                            style={{textAlign: 'center', paddingBottom: 20}}>
                                        Submit the above trackers
                                    </button>
                                </Paper>
                            </Grid>
                            <Grid item xs={4} sm={12} style={{textAlign: 'center', paddingBottom: 20}}>

                                <a href={"./trackersListToownload.json"} download="tracker.json"> Download sample
                                    tracker format Here </a>
                            </Grid>
                        </Grid>

                    </Grid>
                </Paper>
                <Grid
                    container
                    direction="row"
                    justify="center"
                    alignItems="flex-start"
                    spacing={3}
                >
                    <Grid item xs={12} sm={6}>
                        <Paper variant={"outlined"}>
                            <form autoComplete={"off"} noValidate>
                                <Grid container direction={"column"}>

                                    <Grid container direction={"column"}>


                                        <Grid item style={{paddingTop: 40, textAlign: 'center', paddingBottom: 20}}>
                                            {!this.state.showMic ?
                                                <Button
                                                    variant="contained"
                                                    style={{
                                                        color: '#923005',
                                                        borderColor: '#923005',
                                                        textTransform: 'none'
                                                    }}
                                                    disableElevation
                                                    onClick={this.openConnectionAndStart}

                                                    disabled={false/*this.state.callButtonText === 'Calling' || this.state.callButtonText === 'Disconnecting'*/}
                                                >Connect Websocket</Button>
                                                : null}
                                        </Grid>
                                        {this.state.showMic ?
                                            <Card variant={"outlined"} style={{textAlign: 'center'}}>
                                                <CardHeader

                                                    title=<MicNoneIcon/>
                                                style={{justifyContent: "center", display: "flex"}}
                                                />
                                                <CardContent style={{paddingTop: 0}}>
                                                    <Typography variant={"caption"} gutterBottom>
                                                        "Start speaking or play an audio to test trackers"
                                                    </Typography>
                                                </CardContent>
                                            </Card> : null
                                        }


                                    </Grid>

                                    <Grid item xs={12} sm={10} className={"flex-col-scroll"} style={{paddingTop: 40}}>
                                        <MessageR2 messageResponse={this.state.messageResponse2.messages}/>
                                    </Grid>
                                </Grid>
                            </form>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TrackerTimeline
                            trackerResponse={this.state.trackerResponse.trackers}
                        />
                    </Grid>
                </Grid>
                <Grid item xs={4} sm={12}>
                    <Paper variant={"contained"} style={{
                        marginBottom: 15,
                        width: '100%'
                    }}>

                        <textArea placeholder={JSON.stringify(this.state.trackerResponse.trackers, null, '\t')}

                                  value={this.state.trackerResponse.trackers}
                                  cols="140" rows="10">
                        </textArea>
                    </Paper>
                </Grid>
            </Container>
        );
    }
}

export default withStyles(styles)(SymblWebSocketAPI);
