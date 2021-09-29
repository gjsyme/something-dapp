import React, { useEffect, useState } from 'react';
import { useWeb3Context } from 'web3-react';

import Secure from './Secure';

export default function HomeComponent(){
  const context = useWeb3Context();
  let [signature, setSignature] = useState('');

  useEffect(() => {
    // you should set up the connectors you want per the documentation
    // metamask works; infura has a known invalid config from copy/paste of the docs
    context.setFirstValidConnector(['MetaMask', 'Infura'])
  });

  if (!context.active && !context.error) {
    // loading
    return <h1>Loading...</h1>
  } else if (context.error) {
    //error
    return <h1>Errror {context.error}</h1>
  } else {
    // success
    // const { connector, library, chainId, account, activate, deactivate, active, error } = context
    return <>
      <h1>Success: {context.account}</h1>
      <button
        style={{
          height: '3rem',
          borderRadius: '1rem',
          cursor: 'pointer'
        }}
        onClick={() => {
          context.library
            .getSigner(context.account)
            .signMessage('👋')
            .then((signature: any) => {
              // save the address and signature for future calls
              // right here you've passed auth
              setSignature(signature);
            })
            .catch((error: any) => {
              window.alert('Failure!' + (error && error.message ? `\n\n${error.message}` : ''))
            })
        }}
      >Do Signature</button>
      { signature ? <Secure signature={signature}/> : '' }
    </>
  }
}