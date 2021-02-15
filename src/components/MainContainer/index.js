import React from 'react';
import {Container} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles';

import styles from '../../globalStyle';
import theme from "../../Theme";
import {ThemeProvider} from "@material-ui/styles";
import Tabs from "@material-ui/core/Tabs";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Tab from "@material-ui/core/Tab";
import SymblWebSocketAPI from "../../trackersHelper";

// const tabsStyles = containedTabsStylesHook.useTabs();
// const tabItemStyles = containedTabsStylesHook.useTabItem();

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`vertical-tabpanel-${index}`}
            aria-labelledby={`vertical-tab-${index}`}
            style={{
                width: "100%"
            }}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

function a11yProps(index) {
    return {
        id: `vertical-tab-${index}`,
        'aria-controls': `vertical-tabpanel-${index}`,
    };
}

class MainContainer extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.classes = this.props.classes;
        this.state = {
            tabValue: 0
        }
        this.handleTabChange = this.handleTabChange.bind(this);
    }

    handleTabChange(event, value) {
        this.setState({
            tabValue: value
        })
    }

    render() {
        const value = this.state.tabValue;
        return (
            <React.Fragment>
                <ThemeProvider theme={theme}>
                    <Container maxWidth={"lg"} style={{marginTop: 20}}>
                        <div style={{
                            display: 'flex'
                        }}>
                            <SymblWebSocketAPI/>
                        </div>
                    </Container>
                </ThemeProvider>
            </React.Fragment>
        );
    }
}

export default withStyles(styles)(MainContainer);
