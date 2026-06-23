import { useState } from 'react';

// Replace this with the actual Genlayer contract address
export const CONTRACT_ADDRESS = '0x2CbB2349ad30f5aB5ECEa4DbcdEa330CacB9eD16';
const RPC_URL = 'https://studio.genlayer.com/api';

export function useGenlayer() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error('No crypto wallet detected. Please install MetaMask or Rabby.');
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('Connection rejected by user.');
      }
      
      setAddress(accounts[0]);
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet.');
    } finally {
      setIsConnecting(false);
    }
  };

  const verifyWebClaim = async (url: string, claim: string): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected!');
    }

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'gen_sendTransaction',
        params: {
          from: address,
          to: CONTRACT_ADDRESS,
          data: {
            method: 'verify_web_claim',
            args: [url, claim]
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP network error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'GenLayer Execution Error');
    }

    return data.result;
  };

  const getVerificationStatus = async (url: string, claim: string): Promise<string> => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'gen_callMethod',
        params: {
          from: address || '0x0000000000000000000000000000000000000000',
          to: CONTRACT_ADDRESS,
          method: 'get_verification_status',
          args: [url, claim]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP View Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  };

  return {
    address,
    isConnecting,
    error,
    setError,
    connectWallet,
    verifyWebClaim,
    getVerificationStatus
  };
}
