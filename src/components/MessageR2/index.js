import {Card, CardContent, Paper, Typography} from "@material-ui/core";
import React from "react";
import  {useEffect, useState} from 'react';
import {withStyles} from "@material-ui/core/styles";
import styles from "../../globalStyle";
import {ThemeProvider} from "@material-ui/styles";
import theme from "../../Theme";
import EmojiEmotionsIcon from "@material-ui/icons/EmojiEmotions";
import Avatar from "@material-ui/core/Avatar";
import makeStyles from "@material-ui/core/styles/makeStyles";
import {red} from "@material-ui/core/colors";
import CardHeader from "@material-ui/core/CardHeader";
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import RecordVoiceOverIcon from '@material-ui/icons/RecordVoiceOver';
let transcript1=[];
let previous;
let previous2;

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        display: "flex",
        justifyContent: "center",
        alignItems: "center",

    },
    speakerAvatar: {
        color: '#fefefe',
        // '&:hover': {
        //     cursor: 'pointer',
        //     opacity: 0.75
        // },
        width: theme.spacing(4),
        height: theme.spacing(4),
        border: '1px solid'
        // transform: 'scale(0.80)'
    },

    timeText: {
        ...theme.typography.caption,
        fontWeight: 700,
        overflow: 'hidden'
    },
    mainContainer: {
        padding: 24,
        height: "250px",
        overflowY: "auto"
    },
    item: {
        display: "flex",
        alignItems: "center",
        margin: "5px 10px",
        flexGrow: 1,
        width: "90%"
    },
    avatarContainer: {
        margin: 10,
        marginTop: 0
    },
    p: {
        margin: "5px 0",
        fontSize: 14
    },
    avatar: {
        backgroundColor: red[500],
    },
    editIcon: {
        position: "absolute",
        right: "15px"
    },
    transcript: {
        position: "relative",
        flexGrow: 1,
        width: "80%",
        wordBreak: "break-all"
    },
    inputBox: {
        width: "100%",
        // height:"30px",
        outline: "none"
    },
    description: {
        width: "80%",
        textOverflow: "ellipsis",
        minHeight: 36,
        display: "block",
        overflow: "hidden",
        whiteSpace: "break-spaces",
    },
    cancelButton: {
        color: '#888888',
        borderColor: '#888888',
        textTransform: 'none',
        padding: 0,
        margin: "10px"
    },

    saveButton: {
        color: '#1C921CCC',
        borderColor: '#1C921C88',
        textTransform: 'none',
        padding: 0,
        margin: "10px"
    }

}));




const MessageR2 = ({messageResponse, classes}) => {
    console.log(messageResponse);
    transcript1=transcript1.concat(messageResponse);
    return (


        <ThemeProvider theme={theme}>
            <Paper variant={"outlined"} className={classes.paper} style={{
                marginBottom: 15,
                width: '100%'
            }}>


                <Typography variant={"h6"} style={{marginBottom: 15, paddingBottom: 10}}>
                    Transcript
                </Typography>
                <Typography>
                    {

                        transcript1 && transcript1.length>0 ?
                            (
                                transcript1.map(value=>{
                                    if(value){
                                        if(value&&value.payload.content !=previous &&value.payload.content !=previous2)
                                        {
                                            previous2=previous;
                                            previous=value.payload.content;
                                return (
                                    <Card variant={"outlined"} style={{
                                        marginBottom: 5
                                    }}>
                                        <CardHeader
                                            avatar=<RecordVoiceOverIcon/>
                                            title={value.payload.content}
                                        />
                                        <CardContent />

                                    </Card>
                                );
                                    }
                                    }
                                    })
                            ):




                            (<Typography variant={"body1"} style={{color: 'gray'}}>
                                Transcript will appear here ...
                            </Typography>)
                    }
                </Typography>




            </Paper>
        </ThemeProvider>
    );
};







export default withStyles(styles)(MessageR2);