import { useState, useCallback } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// Update this after every contract deployment!
export const CONTRACT_ADDRESS = '0x9D539E640EE0Ad51c67F31bdC3F9913bd5cCc732';

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

  const _handleWrite = async (functionName: string, args: any[], valueInWei: bigint = 0n, retries = 10): Promise<any> => {
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
        value: valueInWei,
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
      const errMsg = err.message || String(err);
      if ((errMsg.includes('rate limited') || errMsg.includes('Failed to fetch') || errMsg.includes('Server busy')) && retries > 0) {
        console.warn(`Network busy. Auto-retrying... (${retries} retries left)`);
        await new Promise(r => setTimeout(r, 5000));
        return _handleWrite(functionName, args, valueInWei, retries - 1);
      }
      
      if (errMsg.includes('rate limited') || errMsg.includes('Failed to fetch') || errMsg.includes('Server busy')) {
        throw new Error('The GenLayer network is extremely congested right now. Please try again later.');
      }
      
      throw new Error(errMsg || 'Transaction rejected or failed.');
    }
  };

  const _handleRead = async (functionName: string, args: any[] = [], retries = 2): Promise<any> => {
    const readClient = createClient({ chain: studionet });
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName,
        args,
      });
      return result;
    } catch (err: any) {
      const errMsg = err.message || String(err);
      if ((errMsg.includes('rate limited') || errMsg.includes('Failed to fetch') || errMsg.includes('Server busy')) && retries > 0) {
        await new Promise(r => setTimeout(r, 2000));
        return _handleRead(functionName, args, retries - 1);
      }
      if (errMsg.includes('Server busy') || errMsg.includes('Failed to fetch')) return null; // Keep polling without crashing
      throw new Error(errMsg || 'Failed to read from contract.');
    }
  };

  const createMarket = (claim: string, urls: string[]) => _handleWrite('create_market', [claim, urls]);
  
  const bet = (marketId: number, isYes: boolean, amountGen: number) => {
    const valueInWei = BigInt(amountGen) * 1000000000000000000n; // Convert GEN to wei
    return _handleWrite('bet', [marketId, isYes], valueInWei);
  };
  
  const resolveMarket = (marketId: number) => _handleWrite('resolve_market', [marketId]);

  const getBalance = useCallback(async (userAddress: string) => {
    try {
      if (!window.ethereum) return 0;
      const hexBalance = await window.ethereum.request({ 
        method: 'eth_getBalance', 
        params: [userAddress, 'latest'] 
      });
      // Convert wei hex to GEN string
      const wei = BigInt(hexBalance);
      const gen = Number(wei / 100000000000000n) / 10000; // Keep 4 decimals
      return gen;
    } catch (e) {
      console.error(e);
      return 0;
    }
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
    createMarket,
    bet,
    resolveMarket,
    getBalance,
    getAllMarkets,
    getMarket
  };
}
