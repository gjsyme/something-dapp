import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const walletRe = /^0x[a-fA-F0-9]{40}$/;

const App = () => {
  // State / Props
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const [message, setMessage] = useState('');
  const [output1, setOutput1] = useState('');
  const [output2, setOutput2] = useState<{ [key: string]: any }>({});
  const [output3, setOutput3] = useState<any>();
  const [isPrompting, setIsPrompting] = useState(false);

  // Functions
  const onClickConnectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        if (!walletRe.test(address)) throw Error('Invalid Wallet Address');
        setWalletAddress(address);

        // Make request to create base account in backend
        const result = await axios({
          url: 'http://localhost:5000/auth/signup',
          method: 'POST',
          data: {
            address
          }
        });

        setOutput2(result?.data?.data);
      } catch (error) {
        console.log('onCLickConnectWallet', { error });
        setWalletAddress(undefined);
        setOutput2({});
      }
    }
  }

  const onClickSignUpLogin = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        console.log({ output1 });
        let result = await axios({
          url: 'http://localhost:5000/auth/nonce',
          method: 'POST',
          data: {
            address
          }
        });

        const nonce = result?.data?.data?.nonce;
        if (!nonce) throw Error('Invalid nonce.');

        setIsPrompting(true);


        const signed = await signer.signMessage(`Login\n\n${nonce}`);
        console.log({ signed });

        result = await axios({
          url: 'http://localhost:5000/auth/nonce/verify',
          method: 'POST',
          data: {
            nonce,
            signed
          },
          withCredentials: true,
        });

        console.log({ result: result?.data });
      } catch (error) {
        console.log('onClickSignUpLogin', { error });
        setIsPrompting(false);
      }
    }
  }

  const onClickGetMessages = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const result = await axios({
        url: 'http://localhost:5000/messages',
        method: 'GET',
        headers: {
          'x-address': address
        },
        withCredentials: true
      });

      setOutput3(result?.data?.data)
    } catch (error) {
      console.log('onClickGetMessages', { error });
      setOutput3('')
    }
  }

  const onClickSubmit = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      let result = await axios({
        url: 'http://localhost:5000/messages/nonce',
        method: 'GET',
        headers: {
          'x-address': address
        },
        withCredentials: true
      });

      const signed = await signer.signMessage(`${message}\n\n${result?.data?.data}`);

      await axios({
        url: 'http://localhost:5000/messages',
        method: 'POST',
        headers: {
          'x-address': address
        },
        data: {
          nonce: result?.data?.data,
          message,
          signed
        },
        withCredentials: true
      });

      result = await axios({
        url: 'http://localhost:5000/messages',
        method: 'GET',
        headers: {
          'x-address': address
        },
        withCredentials: true
      });

      setOutput3(result?.data?.data)
      setMessage('');
    } catch (error) {
      console.log('onClickSubmit', { error });
    }
  }

  const onClickLogOut = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      axios({
        url: 'http://localhost:5000/auth/logout',
        method: 'GET',
        headers: {
          'x-address': address
        },
        withCredentials: true
      })

      setWalletAddress(undefined);
    } catch (error) {
      console.log('onClickLogOut', { error });
    }
  }

  // Hooks
  useEffect(() => {
    // Onload always retrieve the wallet address
    const init = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const address = await signer.getAddress()
          if (!walletRe.test(address)) throw Error('Invalid Wallet Address');
          setWalletAddress(address);

          const result = await axios({
            url: 'http://localhost:5000/auth/verify',
            method: 'POST',
            headers: {
              'x-address': address
            },
            withCredentials: true,
          });
          setOutput1(result?.data?.data);
        } catch (error) {
          console.log('init', { error });
          setOutput1('');
          setWalletAddress(undefined);
        }
      }
    }

    init();
  }, [])

  return (
    <div className="App" style={{ padding: '20px' }}>
      <h1>Something DApp</h1>
      {walletAddress ? <button onClick={onClickLogOut}>Logout</button> : null}
      <p><small>Wallet Address</small></p>
      <pre style={{ padding: '20px', background: '#efefef' }}><code>{JSON.stringify(walletAddress || 'none')}</code></pre>
      <p><small>Init Verify</small></p>
      <pre style={{ padding: '20px', background: '#efefef' }}><code>{JSON.stringify(output1, null, ' ')}</code></pre>
      {!walletAddress ? <button onClick={onClickConnectWallet}>Connect Wallet</button> : <div>
        {!isPrompting ? <button onClick={onClickSignUpLogin}>Sign Up / login</button> : null}
        <p><small>Init Signup</small></p>
        <pre style={{ padding: '20px', background: '#efefef' }}><code>{JSON.stringify(output2, null, ' ')}</code></pre>
        <p><small>Messages</small></p>
        <button onClick={onClickGetMessages}>Get Messages</button>
        <pre style={{ padding: '20px', background: '#efefef' }}><code>{JSON.stringify(output3, null, ' ')}</code></pre>
        <p><textarea placeholder="New message" value={message} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)} /></p>
        <button onClick={onClickSubmit}>Submit</button>
      </div>}
    </div>
  )
}

export default App
