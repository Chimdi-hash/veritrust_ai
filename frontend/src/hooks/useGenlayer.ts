import { useState } from 'react';
import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

// Replace this with the actual Genlayer contract address
export const CONTRACT_ADDRESS = '0x2CbB2349ad30f5aB5ECEa4DbcdEa330CacB9eD16';
// We use the testnetBradbury chain from genlayer-js as requested

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
      
      // Attempt to switch to Bradbury testnet
      const chainIdHex = `0x${testnetBradbury.id.toString(16)}`;
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: testnetBradbury.name,
                rpcUrls: [...testnetBradbury.rpcUrls.default.http],
                nativeCurrency: testnetBradbury.nativeCurrency,
                blockExplorerUrls: testnetBradbury.blockExplorers ? [testnetBradbury.blockExplorers.default.url] : [],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
      
      setAddress(accounts[0]);
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setError(null);
  };

  const verifyWebClaim = async (url: string, claim: string): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected!');
    }

    // Create the write client with window.ethereum to trigger the MetaMask popup
    const writeClient = createClient({
      chain: testnetBradbury,
      account: address as `0x${string}`,
      provider: window.ethereum,
    });

    try {
      // This will trigger the MetaMask popup for the user to confirm the transaction and pay GEN token gas
      const transactionHash = await writeClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'verify_web_claim',
        args: [url, claim],
        value: BigInt(0),
      });
      return transactionHash;
    } catch (err: any) {
      throw new Error(err.message || 'Transaction rejected or failed.');
    }
  };

  const getVerificationStatus = async (url: string, claim: string): Promise<string> => {
    // Read client doesn't strictly need the provider for signing
    const readClient = createClient({
      chain: testnetBradbury,
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
    disconnectWallet,
    verifyWebClaim,
    getVerificationStatus
  };
}
