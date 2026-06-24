import { useState } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// Replace this with the actual Genlayer contract address
export const CONTRACT_ADDRESS = '0xb96468dD6d52C86675cf43C7e917b28a4b5f4690';
// We use the studionet chain from genlayer-js as requested

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
      
      // Attempt to switch to Studio network
      const chainIdHex = `0x${studionet.id.toString(16)}`;
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: unknown) {
        // This error code indicates that the chain has not been added to MetaMask.
        if ((switchError as { code?: number }).code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: studionet.name,
                rpcUrls: [...studionet.rpcUrls.default.http],
                nativeCurrency: studionet.nativeCurrency,
                blockExplorerUrls: studionet.blockExplorers ? [studionet.blockExplorers.default.url] : [],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
      
      setAddress(accounts[0]);
    } catch (err: unknown) {
      console.error('Wallet connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet.');
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
      chain: studionet,
      account: address as `0x${string}`,
      provider: window.ethereum,
    });

    try {
      // This will trigger the MetaMask popup for the user to confirm the transaction and pay GEN token gas
      const transactionHash = await writeClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'verify_web_claim',
        args: [url, claim],
        value: 0n,
      });
      
      const receipt = await writeClient.waitForTransactionReceipt({ 
        hash: transactionHash
      });
      
      if (String(receipt.status) === 'reverted' || String(receipt.status) === '0') {
        throw new Error('Transaction reverted by the network (e.g., invalid URL, timeout, or consensus failure).');
      }

      return transactionHash;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction rejected or failed.';
      if (msg.includes('Server busy')) {
        throw new Error('The GenLayer Studio network is currently congested (all execution slots are occupied). Please wait a few moments and try again.');
      }
      throw new Error(msg);
    }
  };

  const getVerificationStatus = async (url: string, claim: string): Promise<string> => {
    // Read client doesn't strictly need the provider for signing
    const readClient = createClient({
      chain: studionet,
    });

    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_verification_status',
        args: [url, claim],
      });
      return result as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to read from contract.';
      if (msg.includes('Server busy')) {
        // Just return 'NOT_YET_EVALUATED' to keep polling instead of throwing an error during polling
        return 'NOT_YET_EVALUATED';
      }
      throw new Error(msg);
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
