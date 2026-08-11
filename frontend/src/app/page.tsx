'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ShieldCheck, AlertCircle, Loader2, Link as LinkIcon, FileText, Plus, Coins, Play } from 'lucide-react';
import { useGenlayer } from '@/hooks/useGenlayer';
import './globals.css';

const formatWei = (wei: string | number) => {
  try {
    return Number(BigInt(wei) / 100000000000000n) / 10000;
  } catch (e) {
    return 0;
  }
};

const renderBetStatus = (market: any, bet: any) => {
  if (market.status !== 'RESOLVED') return null;
  if (market.verdict === 'UNDETERMINED') {
    return <span className="badge" style={{background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', border: '1px solid var(--warning)', marginLeft: '0.5rem'}}>REFUNDED</span>;
  }
  const isWinner = (market.verdict === 'TRUE' && bet.prediction_is_true) || (market.verdict === 'FALSE' && !bet.prediction_is_true);
  return isWinner 
    ? <span className="badge badge-resolved" style={{marginLeft: '0.5rem'}}>PAID OUT</span> 
    : <span className="badge" style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', marginLeft: '0.5rem'}}>BURNED</span>;
};

export default function Home() {
  const { address, isConnecting, error, setError, connectWallet, disconnectWallet, getBalance, createMarket, getAllMarkets, bet, resolveMarket } = useGenlayer();
  
  const [balance, setBalance] = useState<number | null>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'closed' | 'create'>('active');
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

  const handleBet = async (marketId: number, isYes: boolean, amount: number) => {
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
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
          <button 
            className={activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('active')}
            style={{ borderRadius: '20px', padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
          >
            ACTIVE MARKETS
          </button>
          <button 
            className={activeTab === 'closed' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('closed')}
            style={{ borderRadius: '20px', padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
          >
            CLOSED MARKETS
          </button>
          <button 
            className={activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('create')}
            style={{ borderRadius: '20px', padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
          >
            + NEW MARKET
          </button>
        </div>

        {activeTab === 'create' && (
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
        )}

        {activeTab === 'active' && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid">
              {markets.filter(m => m.status === 'OPEN').length === 0 && (
                <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem', gridColumn: '1 / -1' }}>No active markets found.</div>
              )}
              {markets.filter(m => m.status === 'OPEN').map((m) => (
                <ActiveMarketCard 
                  key={m.id} 
                  m={m} 
                  address={address} 
                  balance={balance} 
                  isProcessing={isProcessing} 
                  handleBet={handleBet} 
                  handleResolve={handleResolve} 
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'closed' && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid">
              {markets.filter(m => m.status === 'RESOLVED').length === 0 && (
                <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem', gridColumn: '1 / -1' }}>No closed markets found.</div>
              )}
              {markets.filter(m => m.status === 'RESOLVED').map((m) => (
                <ClosedMarketCard key={m.id} m={m} />
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function ActiveMarketCard({ m, address, balance, isProcessing, handleBet, handleResolve }: any) {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [shiningTube, setShiningTube] = useState<'YES' | 'NO' | null>(null);

  const onBet = async (isYes: boolean) => {
    setShiningTube(isYes ? 'YES' : 'NO');
    try {
      await handleBet(m.id, isYes, betAmount);
    } finally {
      setShiningTube(null);
    }
  };

  const hasStakes = m.bets && m.bets.length > 0;

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div className="detail-label">MARKET #{m.id}</div>
        <div className="badge badge-open">OPEN</div>
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

      <div style={{ marginBottom: '0.5rem' }}>
        <label className="detail-label" style={{ display: 'block', marginBottom: '0.5rem' }}>STAKE (GEN)</label>
        <input 
          type="number" 
          min="1"
          step="0.1"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          style={{ marginBottom: 0, textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}
        />
      </div>

      {/* SLEEK TUBE BETTING UI */}
      <div 
        className={`bet-tube-container ${shiningTube === 'YES' ? 'glow-yes' : (shiningTube === 'NO' ? 'glow-no' : '')}`}
        style={{ marginBottom: '1.5rem' }}
      >
        <button 
          className="tube-btn yes"
          onClick={() => onBet(true)}
          disabled={!address || isProcessing || (balance !== null && balance < betAmount)}
        >
          YES
        </button>

        <div className="pool-amounts">
          <div><span style={{color:'var(--success)'}}>{formatWei(m.pool_yes)}</span> <span style={{opacity:0.3}}>|</span> <span style={{color:'var(--danger)'}}>{formatWei(m.pool_no)}</span></div>
          <div style={{fontSize:'0.65rem', marginTop: '0.1rem'}}>POOLS (GEN)</div>
        </div>

        <button 
          className="tube-btn no"
          onClick={() => onBet(false)}
          disabled={!address || isProcessing || (balance !== null && balance < betAmount)}
        >
          NO
        </button>
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
                <div>
                  <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>{formatWei(b.amount)} GEN</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        className="btn-primary"
        onClick={() => handleResolve(m.id)}
        disabled={!address || isProcessing || !hasStakes}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}
      >
        <Play size={18} /> {hasStakes ? 'TRIGGER EVALUATION' : 'WAITING FOR STAKES'}
      </button>
    </motion.div>
  );
}

function ClosedMarketCard({ m }: any) {
  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div className="detail-label">MARKET #{m.id}</div>
        <div className="badge badge-in-progress">CLOSED</div>
      </div>
      
      <h3 style={{ flexGrow: 1, marginBottom: '1.5rem', fontSize: '1.3rem' }}>{m.claim}</h3>
      
      {m.remark && (
        <div style={{ marginBottom: '1.5rem', background: 'rgba(56, 189, 248, 0.05)', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <div className="detail-label" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>ORACLE REMARK</div>
          <div style={{ fontSize: '0.95rem', fontStyle: 'italic', color: '#e2e8f0' }}>"{m.remark}"</div>
        </div>
      )}
      
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
                <div>
                  <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>{formatWei(b.amount)} GEN</span>
                  {renderBetStatus(m, b)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
