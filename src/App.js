import React from 'react';

import {Appbar} from './components/Appbar';
import MainContainer from './components/MainContainer';
import {withStyles} from "@material-ui/core/styles";
import styles from "./globalStyle";
import theme from "./Theme";
import {ThemeProvider} from "@material-ui/styles";
import trackersList from './trackersList.json';
import { BrowserRouter, Route, Switch } from 'react-router-dom';


import trackersHelper from './trackersHelper'

const uuid = require('uuid').v4;
const meetingId = new uuid();
//const options = {meetingId,trackersList} ;
//const newTrackersHelper = new trackersHelper('en-US',{onTrackersResponse:(data)=>{console.log('trackers_response',data)}},options)


//console.log(newTrackersHelper.openConnectionAndStart());


function App({classes}) {
    return (
        <ThemeProvider theme={theme}>
            <div className={classes.root}>
                <Appbar/>
                {<MainContainer/>}
            </div>
        </ThemeProvider>
    );
}

export default withStyles(styles)(App);
;
