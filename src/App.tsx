import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const walletRe = /^0x[a-fA-F0-9]{40}$/;

interface AccountData {
  id: string; //uuid
  address: string;
  nonce: string;
  issued: string; //timestamp
}

const App = () => {
  // State / Props
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState('');
  const [account, setAccount] = useState<AccountData | null>(null);
  const [messages, setMessages] = useState<any>();
  const [isPrompting, setIsPrompting] = useState(false);

  // Functions
  const onClickConnectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const signerAddress = await signer.getAddress();
        if (!walletRe.test(signerAddress)) throw Error('Invalid Wallet Address');
        setWalletAddress(signerAddress);

        await fetchAccount(signerAddress);
        await fetchSignatureAddress(signerAddress);
      } catch (error) {
        console.log('onClickConnectWallet', { error });
        setWalletAddress(undefined);
        setAccount(null);
      }
    }
  }

  const onClickSignUpLogin = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const signerAddress = await signer.getAddress();
        if (!walletRe.test(signerAddress)) throw Error('Invalid Wallet Address');
        setWalletAddress(signerAddress);
        console.log({ signerAddress });
        let result = await axios({
          url: 'http://localhost:5000/auth/nonce',
          method: 'POST',
          data: {
            address: signerAddress
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
        // if we succesfully ran this, we don't want to show the button again until there is reason
        // so we leave isPrompting === true
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
      const signerAddress = await signer.getAddress();

      const result = await axios({
        url: 'http://localhost:5000/messages',
        method: 'GET',
        headers: {
          'x-address': signerAddress
        },
        withCredentials: true
      });

      setMessages(result?.data?.data)
    } catch (error) {
      console.log('onClickGetMessages', { error });
      setMessages('')
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

      setMessages(result?.data?.data)
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
      // wipe page state as well
      setAddress('');
      setAccount(null);
      setMessages(undefined);
      setIsPrompting(false);
    } catch (error) {
      console.log('onClickLogOut', { error });
    }
  }

  const fetchAccount = async (signerAddress: string) => {
    try {
      // Make request to create base account in backend
      const result = await axios({
        url: 'http://localhost:5000/auth/signup',
        method: 'POST',
        data: {
          address: signerAddress
        }
      });
      // const newAccount: AccountData = { ...result.data.data };
      setAccount(result?.data?.data);
    } catch (error) {
      console.error('error fetching account', error);
    }
  }

  const fetchSignatureAddress = async (signerAddress: string) => {
    console.log('fetchSignatureAddress', signerAddress);
    try {
      const result = await axios({
        url: 'http://localhost:5000/auth/verify',
        method: 'POST',
        headers: {
          'x-address': signerAddress
        },
        withCredentials: true,
      });
      setAddress(result?.data?.data);
    } catch (error) {
      console.error('error fetching signature address', error);
      throw error;
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
          const signerAddress = await signer.getAddress()
          if (!walletRe.test(signerAddress)) throw Error('Invalid Wallet Address');
          setWalletAddress(signerAddress);

          await fetchSignatureAddress(signerAddress);

          if (!account) {
            await fetchAccount(signerAddress);
          }
        } catch (error) {
          console.log('init', { error });
          setAddress('');
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
      <h2>Wallet Address</h2>
      <p><small>What the DApp has gotten directly from your connected wallet</small></p>
      <pre style={{ padding: '20px', background: '#efefef' }}><code>{JSON.stringify(walletAddress || 'none')}</code></pre>
      <h2>Signature Address</h2>
      <p><small>The address extracted from your digital signature (as we know the plaintext you signed)</small></p>
      <pre style={{ padding: '20px', background: '#efefef' }}><code>{JSON.stringify(address, null, ' ')}</code></pre>
      {!walletAddress ? <button onClick={onClickConnectWallet}>Connect Wallet</button> : <div>
        {!isPrompting ? <button onClick={onClickSignUpLogin}>Signature Login</button> : null}
        <h2>Account</h2>
        <p><small>The account associated with your address</small></p>
        <pre style={{ padding: '20px', background: '#efefef' }}><code>{JSON.stringify(account, null, ' ')}</code></pre>
        <h2>Messages</h2>
        <p><small>The messages. Reading and writing are both restricted based upon having your wallet auth.</small></p>
        <button onClick={onClickGetMessages}>Get Messages</button>
        <pre style={{ padding: '20px', background: '#efefef' }}><code>{JSON.stringify(messages, null, ' ')}</code></pre>
        <p><textarea placeholder="New message" value={message} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)} /></p>
        <button onClick={onClickSubmit}>Submit</button>
      </div>}
    </div>
  )
}

export default App
