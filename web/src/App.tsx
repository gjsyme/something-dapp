import React from 'react';
import Web3Provider from 'web3-react';
import { connectors } from './connectors';

import Home from './components/Home';

function App() {
  return (
    <Web3Provider 
      connectors={connectors}
      libraryName={'ethers.js'}
    >
      <div className="App">
        <h1>Proof of Concept</h1>
        <Home/>
      </div>
    </Web3Provider>
  );
}

export default App;
