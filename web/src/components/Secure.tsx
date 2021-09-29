import React from 'react';

interface SecureProps {
  signature: string
}

export default function Secure(props: SecureProps){
  console.log('passed props',props);

  return <>
    <p>{props.signature}</p>
    
  </>;
}