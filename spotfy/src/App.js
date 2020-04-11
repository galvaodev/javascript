import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import "./config/reactotron";
import GlobalStyles from "./styles/global";
import Player from "./components/Player";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Error from "./components/ErrorBox";

import { Wrapper, Container, Content } from "./styles/components";

import Routes from "./routes";
import store from "./store";

const App = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Wrapper>
          <Container>
            <Sidebar />
            <Content>
              <Error></Error>
              <Header></Header>
              <Routes />
            </Content>
          </Container>
          <Player />
          <GlobalStyles />
        </Wrapper>
      </BrowserRouter>
    </Provider>
  );
};

export default App;
