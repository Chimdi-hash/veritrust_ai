import { useState } from 'react';
import { createClient } from 'genlayer-js';
import { simulator } from 'genlayer-js/chains';

// Replace this with the actual Genlayer contract address
export const CONTRACT_ADDRESS = '0x2CbB2349ad30f5aB5ECEa4DbcdEa330CacB9eD16';
// We use the simulator chain from genlayer-js for the studio, or fallback to custom chain configuration if needed.
// 'simulator' corresponds to the studio API.

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

    // Create the write client with window.ethereum to trigger the MetaMask popup
    const writeClient = createClient({
      chain: simulator,
      account: address as `0x${string}`,
      provider: window.ethereum,
    });

    try {
      // This will trigger the MetaMask popup for the user to confirm the transaction and pay GEN token gas
      const transactionHash = await writeClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'verify_web_claim',
        args: [url, claim],
      });
      return transactionHash;
    } catch (err: any) {
      throw new Error(err.message || 'Transaction rejected or failed.');
    }
  };

  const getVerificationStatus = async (url: string, claim: string): Promise<string> => {
    // Read client doesn't strictly need the provider for signing
    const readClient = createClient({
      chain: simulator,
    });

    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_verification_status',
        args: [url, claim],
      });
      return result as string;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to read from contract.');
    }
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
