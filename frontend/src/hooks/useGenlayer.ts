import { useState, useCallback } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// Replace this with the actual Genlayer contract address (Needs updating after redeploy)
export const CONTRACT_ADDRESS = '0xFD5f69aa947EFB7E4993fa911382Ab57f3be148E';

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
      if (!accounts || accounts.length === 0) throw new Error('Connection rejected by user.');
      
      const chainIdHex = `0x${studionet.id.toString(16)}`;
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: studionet.name,
              rpcUrls: [...studionet.rpcUrls.default.http],
              nativeCurrency: studionet.nativeCurrency,
              blockExplorerUrls: studionet.blockExplorers ? [studionet.blockExplorers.default.url] : [],
            }],
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

  const _handleWrite = async (functionName: string, args: any[]) => {
    if (!address) throw new Error('Wallet not connected!');
    const writeClient = createClient({
      chain: studionet,
      account: address as `0x${string}`,
      provider: window.ethereum,
    });

    try {
      const transactionHash = await writeClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName,
        args,
        value: 0n,
      });
      
      try {
        const receipt = await writeClient.waitForTransactionReceipt({ hash: transactionHash });
        if (String(receipt.status) === 'reverted' || String(receipt.status) === '0') {
          throw new Error('Transaction reverted by the network.');
        }
      } catch (receiptErr: any) {
        if (!receiptErr.message?.includes('timeout')) throw receiptErr;
      }
      return transactionHash;
    } catch (err: any) {
      if (err.message?.includes('Server busy')) {
        throw new Error('The GenLayer Studio network is currently congested. Please wait a few moments and try again.');
      }
      throw new Error(err.message || 'Transaction rejected or failed.');
    }
  };

  const _handleRead = async (functionName: string, args: any[] = []) => {
    const readClient = createClient({ chain: studionet });
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName,
        args,
      });
      return result;
    } catch (err: any) {
      if (err.message?.includes('Server busy')) return null; // Keep polling
      throw new Error(err.message || 'Failed to read from contract.');
    }
  };

  const faucet = () => _handleWrite('faucet', []);
  const createMarket = (claim: string, urls: string[]) => _handleWrite('create_market', [claim, urls]);
  const bet = (marketId: number, isYes: boolean, amount: number) => _handleWrite('bet', [marketId, isYes, amount]);
  const resolveMarket = (marketId: number) => _handleWrite('resolve_market', [marketId]);

  const getBalance = useCallback(async (userAddress: string) => {
    const res = await _handleRead('get_balance', [userAddress]);
    return res ? Number(res) : 0;
  }, []);

  const getAllMarkets = useCallback(async () => {
    const res = await _handleRead('get_all_markets');
    if (!res) return [];
    try {
      return JSON.parse(res as string);
    } catch {
      return [];
    }
  }, []);

  const getMarket = useCallback(async (marketId: number) => {
    const res = await _handleRead('get_market', [marketId]);
    if (!res) return null;
    try {
      return JSON.parse(res as string);
    } catch {
      return null;
    }
  }, []);

  return {
    address,
    isConnecting,
    error,
    setError,
    connectWallet,
    disconnectWallet,
    faucet,
    createMarket,
    bet,
    resolveMarket,
    getBalance,
    getAllMarkets,
    getMarket
  };
}
