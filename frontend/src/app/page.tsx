'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ShieldCheck, AlertCircle, Loader2, Link as LinkIcon, FileText, Plus, Coins, Play } from 'lucide-react';
import { useGenlayer } from '@/hooks/useGenlayer';
import styles from './page.module.css';

export default function Home() {
  const { address, isConnecting, error, setError, connectWallet, disconnectWallet, getBalance, createMarket, getAllMarkets, bet, resolveMarket } = useGenlayer();
  
  const [balance, setBalance] = useState<number>(0);
  const [markets, setMarkets] = useState<any[]>([]);
  
  const [claim, setClaim] = useState('');
  const [urls, setUrls] = useState(['', '', '']);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const loadData = async () => {
    if (address) {
      const b = await getBalance(address);
      setBalance(b);
    }
    const m = await getAllMarkets();
    setMarkets(m.reverse());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [address]);

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    const validUrls = urls.filter(u => u.trim() !== '');
    if (validUrls.length === 0) {
      setError('Please provide at least one URL.');
      return;
    }
    if (!claim) {
      setError('Please provide a claim to verify.');
      return;
    }
    setIsProcessing(true);
    setLoadingMsg('Creating new prediction market...');
    setError(null);
    try {
      await createMarket(claim.trim(), validUrls);
      setClaim('');
      setUrls(['', '', '']);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBet = async (marketId: number, isYes: boolean, amount: number) => {
    setIsProcessing(true);
    setLoadingMsg(`Placing ${amount} GEN bet on ${isYes ? 'YES' : 'NO'}...`);
    setError(null);
    try {
      await bet(marketId, isYes, amount);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolve = async (marketId: number) => {
    setIsProcessing(true);
    setLoadingMsg('Oracle is fetching sources & running LLM Consensus...');
    setError(null);
    try {
      await resolveMarket(marketId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (v: string) => {
    if (v === 'TRUE') return 'var(--accent)';
    if (v === 'FALSE') return 'var(--danger)';
    if (v === 'UNDETERMINED') return 'var(--warning)';
    return 'white';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <motion.div 
          className={styles.logo}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ShieldCheck size={28} color="var(--primary)" />
          VeriTrust Escrow
        </motion.div>
        
        <motion.div 
          className={styles.walletActions}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <AnimatePresence mode="wait">
            {address ? (
              <motion.div 
                key="connected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.addressContainer}
                style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}
              >
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center' }} title="Native GEN Balance">
                  <Coins size={16} color="var(--accent)" />
                  {balance.toFixed(4)} GEN
                </div>
                <div className={styles.addressBadge}>
                  {address.substring(0, 6)}...{address.substring(address.length - 4)}
                </div>
                <button 
                  onClick={disconnectWallet}
                  className={styles.btnDisconnect}
                >
                  Disconnect
                </button>
              </motion.div>
            ) : (
              <motion.button 
                key="connect"
                className={styles.btnConnect}
                onClick={connectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? <Loader2 className="animate-spin" size={18} /> : <Wallet size={18} />}
                Connect Wallet
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </header>

      <main className={styles.main}>
        <motion.div 
          className={styles.card}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h1 className={styles.title} style={{ margin: 0 }}>Prediction Markets</h1>
          </div>
          <p className={styles.subtitle}>
            Stake real GEN tokens on the truthfulness of web claims. The VeriTrust AI Oracle will natively fetch all sources, read the content, and directly pay the escrow pool to the winners' wallets!
          </p>

          <AnimatePresence>
            {address && balance < 10 && (
              <motion.div 
                className={styles.errorBanner}
                style={{ background: 'rgba(255, 165, 0, 0.2)', color: 'orange', borderColor: 'orange', marginBottom: '1rem' }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle size={20} />
                <span><strong>Insufficient GEN:</strong> You need at least 10 native GEN tokens in your wallet to place a bet. You can obtain testnet GEN from the official GenLayer Discord faucet.</span>
              </motion.div>
            )}
            {error && (
              <motion.div 
                className={styles.errorBanner}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </motion.div>
            )}
            {isProcessing && (
              <motion.div 
                className={styles.errorBanner}
                style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', borderColor: 'transparent' }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Loader2 size={20} className="animate-spin" />
                <span>{loadingMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleCreateMarket} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', marginTop: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Create New Market</h3>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Claim</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '1.1rem', color: '#64748b' }} />
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="e.g., Apple acquired OpenAI in 2026." 
                  style={{ paddingLeft: '3rem' }}
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Source URLs (Multi-Source Verification)</label>
              {urls.map((u, i) => (
                <div style={{ position: 'relative', marginBottom: '0.5rem' }} key={i}>
                  <LinkIcon size={18} style={{ position: 'absolute', left: '1rem', top: '1.1rem', color: '#64748b' }} />
                  <input 
                    type="url" 
                    className={styles.input} 
                    placeholder={`Source URL ${i+1} ${i === 0 ? '(Required)' : '(Optional)'}`}
                    style={{ paddingLeft: '3rem' }}
                    value={u}
                    onChange={(e) => {
                      const newUrls = [...urls];
                      newUrls[i] = e.target.value;
                      setUrls(newUrls);
                    }}
                    required={i === 0} 
                  />
                </div>
              ))}
            </div>

            <button 
              type="submit" 
              className={styles.btnSubmit} 
              disabled={!address || isProcessing}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Plus size={20} /> Open Prediction Market
            </button>
          </form>
        </motion.div>

        <h2 style={{ paddingLeft: '1rem', marginBottom: '1rem' }}>Active Markets</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {markets.length === 0 && (
            <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No markets created yet.</div>
          )}
          {markets.map((m) => (
            <motion.div 
              key={m.id}
              className={styles.card}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ borderLeft: `4px solid ${m.status === 'RESOLVED' ? getStatusColor(m.verdict) : 'var(--primary)'}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.8em', opacity: 0.6 }}>Market #{m.id} • Created by {m.creator.substring(0, 6)}...</div>
                <div style={{ 
                  background: m.status === 'OPEN' ? 'rgba(255,255,255,0.1)' : getStatusColor(m.verdict), 
                  color: m.status === 'OPEN' ? 'white' : 'black',
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '4px', 
                  fontSize: '0.8em',
                  fontWeight: 'bold' 
                }}>
                  {m.status === 'OPEN' ? 'OPEN' : m.verdict}
                </div>
              </div>
              
              <h3 style={{ margin: '1rem 0' }}>{m.claim}</h3>
              
              <div style={{ fontSize: '0.85em', opacity: 0.8, marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <strong>Sources:</strong>
                {m.resolution_urls.map((u: string, i: number) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>{u}</a>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8em', opacity: 0.6, marginBottom: '0.5rem' }}>YES POOL</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--accent)' }}>{m.pool_yes} GEN</div>
                  {m.status === 'OPEN' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => handleBet(m.id, true, 10)}
                        disabled={!address || isProcessing || balance < 10}
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Bet 10 GEN on YES
                      </button>
                      <div style={{ fontSize: '0.7em', opacity: 0.6, marginTop: '0.25rem' }}>Deducts natively from wallet</div>
                    </div>
                  )}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8em', opacity: 0.6, marginBottom: '0.5rem' }}>NO POOL</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--danger)' }}>{m.pool_no} GEN</div>
                  {m.status === 'OPEN' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => handleBet(m.id, false, 10)}
                        disabled={!address || isProcessing || balance < 10}
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Bet 10 GEN on NO
                      </button>
                      <div style={{ fontSize: '0.7em', opacity: 0.6, marginTop: '0.25rem' }}>Deducts natively from wallet</div>
                    </div>
                  )}
                </div>
              </div>

              {m.status === 'OPEN' && (
                <button 
                  onClick={() => handleResolve(m.id)}
                  disabled={!address || isProcessing}
                  style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
                >
                  <Play size={18} /> Resolve Market (Trigger Oracle)
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
