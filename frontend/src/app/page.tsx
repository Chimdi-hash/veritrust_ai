'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ShieldCheck, AlertCircle, Loader2, Link as LinkIcon, FileText, Plus, Coins, Play } from 'lucide-react';
import { useGenlayer } from '@/hooks/useGenlayer';
import './globals.css';

export default function Home() {
  const { address, isConnecting, error, setError, connectWallet, disconnectWallet, getBalance, createMarket, getAllMarkets, bet, resolveMarket } = useGenlayer();
  
  const [balance, setBalance] = useState<number | null>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [betAmounts, setBetAmounts] = useState<Record<number, number>>({});
  
  const [claim, setClaim] = useState('');
  const [urls, setUrls] = useState(['', '', '']);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const loadData = async () => {
    try {
      if (address) {
        const b = await getBalance(address);
        setBalance(b);
      }
      const m = await getAllMarkets();
      if (m) setMarkets(m.reverse());
    } catch (err) {
      console.warn("Background poll failed:", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
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

  const handleBet = async (marketId: number, isYes: boolean) => {
    const amount = betAmounts[marketId] || 10;
    if (amount <= 0) {
      setError('Bet amount must be greater than 0.');
      return;
    }
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

  const getStatusColorClass = (v: string) => {
    if (v === 'TRUE') return 'text-success';
    if (v === 'FALSE') return 'text-danger';
    if (v === 'UNDETERMINED') return 'text-warning';
    return '';
  };

  const getBadgeClass = (status: string, verdict: string) => {
    if (status === 'OPEN') return 'badge-open';
    if (status === 'RESOLVED') return verdict === 'TRUE' ? 'badge-resolved' : 'badge-rejected';
    return 'badge-in-progress';
  };

  const formatWei = (wei: string | number) => {
    try {
      return Number(BigInt(wei) / 100000000000000n) / 10000;
    } catch (e) {
      return 0;
    }
  };

  return (
    <div className="container">
      <header className="header">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <ShieldCheck size={36} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 10px var(--primary-glow))' }} />
          <div>
            <h1 className="header-title">VeriTrust AI</h1>
            <div className="header-subtitle">DECENTRALIZED ESCROW</div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <AnimatePresence mode="wait">
            {address ? (
              <motion.div 
                key="connected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="header-badge-container"
              >
                <div className="badge badge-account" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 1rem' }}>
                  <Coins size={16} />
                  {balance !== null ? balance.toFixed(4) : '...'} GEN
                </div>
                <div className="badge badge-open" style={{ padding: '0.5rem 1rem' }}>
                  {address.substring(0, 6)}...{address.substring(address.length - 4)}
                </div>
                <button 
                  onClick={disconnectWallet}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                >
                  Disconnect
                </button>
              </motion.div>
            ) : (
              <motion.button 
                key="connect"
                className="btn-primary"
                onClick={connectWallet}
                disabled={isConnecting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isConnecting ? <Loader2 className="animate-spin" size={18} /> : <Wallet size={18} />}
                CONNECT WALLET
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </header>

      <main>
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 style={{ marginBottom: '1rem' }}>Open Market</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
            Stake real GEN tokens on the truthfulness of web claims. The VeriTrust AI Oracle will natively fetch all sources, evaluate them against LLM consensus, and pay the escrow pool directly to the winners.
          </p>

          <AnimatePresence>
            {address && balance === 0 && (
              <motion.div 
                style={{ background: 'rgba(255, 165, 0, 0.1)', color: 'var(--warning)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '4px', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem', boxShadow: '0 0 10px rgba(255, 179, 0, 0.2)' }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle size={20} />
                <span><strong>Zero GEN:</strong> You have 0 GEN in your wallet. Obtain testnet GEN from the official GenLayer Discord faucet.</span>
              </motion.div>
            )}
            {error && (
              <motion.div 
                style={{ background: 'rgba(255, 0, 60, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '4px', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem', boxShadow: '0 0 10px rgba(255, 0, 60, 0.2)' }}
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
                style={{ background: 'rgba(0, 243, 255, 0.05)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '1rem', borderRadius: '4px', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem', boxShadow: '0 0 10px rgba(0, 243, 255, 0.2)' }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Loader2 size={20} className="animate-spin" />
                <span>{loadingMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleCreateMarket}>
            <div>
              <label className="detail-label" style={{ display: 'block', marginBottom: '0.5rem' }}>CLAIM</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--primary)' }} />
                <input 
                  type="text" 
                  placeholder="e.g., Apple acquired OpenAI in 2026." 
                  style={{ paddingLeft: '3rem' }}
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div>
              <label className="detail-label" style={{ display: 'block', marginBottom: '0.5rem' }}>MULTI-SOURCE URLS</label>
              {urls.map((u, i) => (
                <div style={{ position: 'relative' }} key={i}>
                  <LinkIcon size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--primary)' }} />
                  <input 
                    type="url" 
                    placeholder={`SOURCE URL ${i+1} ${i === 0 ? '(REQUIRED)' : '(OPTIONAL)'}`}
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
              className="btn-primary"
              disabled={!address || isProcessing}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}
            >
              <Plus size={20} /> INITIALIZE MARKET
            </button>
          </form>
        </motion.div>

        <h2 style={{ paddingLeft: '1rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>ACTIVE MARKETS</h2>
        <div className="grid">
          {markets.length === 0 && (
            <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem', gridColumn: '1 / -1' }}>No markets found.</div>
          )}
          {markets.map((m) => (
            <motion.div 
              key={m.id}
              className="card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="detail-label">MARKET #{m.id}</div>
                <div className={`badge ${getBadgeClass(m.status, m.verdict)}`}>
                  {m.status === 'OPEN' ? 'OPEN' : m.verdict}
                </div>
              </div>
              
              <h3 style={{ flexGrow: 1, marginBottom: '1.5rem', fontSize: '1.3rem' }}>{m.claim}</h3>
              
              <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="detail-label" style={{ marginBottom: '0.5rem' }}>SOURCES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {m.resolution_urls.map((u: string, i: number) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <LinkIcon size={14} /> {u}
                    </a>
                  ))}
                </div>
              </div>

              {m.status === 'OPEN' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="detail-label" style={{ display: 'block', marginBottom: '0.5rem' }}>STAKE (GEN)</label>
                  <input 
                    type="number" 
                    min="1"
                    step="0.1"
                    value={betAmounts[m.id] || 10}
                    onChange={(e) => setBetAmounts({...betAmounts, [m.id]: Number(e.target.value)})}
                    style={{ marginBottom: 0, textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(57, 255, 20, 0.05)', border: '1px solid rgba(57, 255, 20, 0.2)', padding: '1.5rem 1rem', borderRadius: '4px', textAlign: 'center', boxShadow: 'inset 0 0 10px rgba(57, 255, 20, 0.05)' }}>
                  <div className="detail-label" style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>YES POOL</div>
                  <div className="text-success" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatWei(m.pool_yes)}</div>
                  {m.status === 'OPEN' && (
                    <button 
                      className="btn-success"
                      onClick={() => handleBet(m.id, true)}
                      disabled={!address || isProcessing || (balance !== null && balance < (betAmounts[m.id] || 10))}
                      style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
                    >
                      YES
                    </button>
                  )}
                </div>
                <div style={{ background: 'rgba(255, 0, 60, 0.05)', border: '1px solid rgba(255, 0, 60, 0.2)', padding: '1.5rem 1rem', borderRadius: '4px', textAlign: 'center', boxShadow: 'inset 0 0 10px rgba(255, 0, 60, 0.05)' }}>
                  <div className="detail-label" style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>NO POOL</div>
                  <div className="text-danger" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatWei(m.pool_no)}</div>
                  {m.status === 'OPEN' && (
                    <button 
                      className="btn-danger"
                      onClick={() => handleBet(m.id, false)}
                      disabled={!address || isProcessing || (balance !== null && balance < (betAmounts[m.id] || 10))}
                      style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
                    >
                      NO
                    </button>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="detail-label" style={{ marginBottom: '1rem' }}>LEDGER</div>
                {(!m.bets || m.bets.length === 0) ? (
                  <div style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center' }}>No transactions.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {m.bets.map((b: any, idx: number) => (
                      <div key={idx} className="detail-row" style={{ margin: 0, paddingBottom: 0, border: 'none' }}>
                        <span style={{ fontSize: '0.9rem' }}>
                          <span style={{ color: '#94a3b8' }}>{b.sender.substring(0, 6)}...</span>
                          {' '}stake{' '}
                          <span className={b.prediction_is_true ? 'text-success' : 'text-danger'} style={{ fontWeight: 'bold' }}>
                            {b.prediction_is_true ? 'YES' : 'NO'}
                          </span>
                        </span>
                        <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>{formatWei(b.amount)} GEN</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {m.status === 'OPEN' && (
                <button 
                  className="btn-primary"
                  onClick={() => handleResolve(m.id)}
                  disabled={!address || isProcessing}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}
                >
                  <Play size={18} /> TRIGGER ORACLE
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
