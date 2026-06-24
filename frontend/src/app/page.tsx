'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ShieldCheck, AlertCircle, Loader2, Link as LinkIcon, FileText } from 'lucide-react';
import { useGenlayer } from '@/hooks/useGenlayer';
import styles from './page.module.css';

export default function Home() {
  const { address, isConnecting, error, setError, connectWallet, disconnectWallet, verifyWebClaim, getVerificationStatus } = useGenlayer();
  
  const [url, setUrl] = useState('');
  const [claim, setClaim] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<string>('NOT_YET_EVALUATED');
  
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !claim) {
      setError('Please fill out both the target URL and Claim input fields.');
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    setStatus('AWAITING CONSENSUS...');
    
    try {
      const cleanUrl = url.trim();
      const cleanClaim = claim.trim();

      // 1. Submit the transaction to Genlayer
      await verifyWebClaim(cleanUrl, cleanClaim);
      
      // 2. Poll for the result
      let consensusResult = 'NOT_YET_EVALUATED';
      let attempts = 0;
      const maxAttempts = 120; // 6 minutes max
      while (consensusResult === 'NOT_YET_EVALUATED' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        consensusResult = await getVerificationStatus(cleanUrl, cleanClaim);
        attempts++;
      }
      
      if (consensusResult === 'NOT_YET_EVALUATED') {
        throw new Error('Verification timed out! The URL might be blocking the GenLayer scraper, or consensus failed silently. Please try a different URL or Claim.');
      }
      
      setStatus(consensusResult);
    } catch (err: unknown) {
      setError(`Transaction Error: ${err instanceof Error ? err.message : 'Execution error.'}`);
      setStatus('ERROR');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusColor = () => {
    if (status === 'VERIFIED') return 'var(--accent)';
    if (status === 'REFUTED') return 'var(--danger)';
    if (status === 'ERROR') return 'var(--warning)';
    if (status === 'AWAITING CONSENSUS...') return 'var(--primary)';
    return 'white';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <motion.div 
          className={styles.logo}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ShieldCheck size={28} color="var(--primary)" />
          VERITRUST AI
        </motion.div>
        
        <motion.div 
          className={styles.walletActions}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            {address ? (
              <motion.div 
                key="connected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.addressContainer}
              >
                <div className={styles.addressBadge}>
                  {address.substring(0, 6)}...{address.substring(address.length - 4)}
                </div>
                <button 
                  onClick={disconnectWallet}
                  className={styles.btnDisconnect}
                  title="Disconnect Wallet"
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
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
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
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <h1 className={styles.title}>Web Consensus Oracle</h1>
          <p className={styles.subtitle}>
            Scrape real-world URL data and execute multi-validator LLM truth consensus on the Genlayer network.
          </p>

          <AnimatePresence>
            {error && (
              <motion.div 
                className={styles.errorBanner}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: '2rem' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleVerify}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="urlInput">Target Content URL</label>
              <div style={{ position: 'relative' }}>
                <LinkIcon size={18} style={{ position: 'absolute', left: '1rem', top: '1.1rem', color: '#64748b' }} />
                <input 
                  type="url" 
                  id="urlInput" 
                  className={styles.input} 
                  placeholder="https://example.com/article" 
                  style={{ paddingLeft: '3rem' }}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="claimInput">Target Validation Claim</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '1.1rem', color: '#64748b' }} />
                <input 
                  type="text" 
                  id="claimInput" 
                  className={styles.input} 
                  placeholder="Enter specific data claim to verify..." 
                  style={{ paddingLeft: '3rem' }}
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  required 
                />
              </div>
            </div>

            <motion.button 
              type="submit" 
              className={styles.btnSubmit} 
              disabled={!address || isVerifying}
              whileHover={address && !isVerifying ? { scale: 1.02 } : {}}
              whileTap={address && !isVerifying ? { scale: 0.98 } : {}}
            >
              {isVerifying ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Loader2 className="animate-spin" size={20} />
                  Signing & Validating...
                </span>
              ) : !address ? (
                'Connect Wallet to Verify'
              ) : (
                'Verify via GenLayer'
              )}
            </motion.button>
          </form>

          <motion.div 
            className={styles.resultContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className={styles.resultTitle}>Consensus Resolution Status</div>
            <motion.div 
              className={styles.statusCard}
              style={{ color: getStatusColor() }}
              key={status}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              {status === 'NOT_YET_EVALUATED' ? (
                <span style={{ opacity: 0.6, fontSize: '0.7em', letterSpacing: '0.2em', fontFamily: 'monospace' }}>
                  [ SYSTEM_STANDBY ]
                </span>
              ) : status === 'AWAITING CONSENSUS...' ? (
                <span style={{ letterSpacing: '0.1em' }}>
                  {'/// SYNCHRONIZING ///'}
                </span>
              ) : status === 'ERROR' ? (
                status
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7em', opacity: 0.8, letterSpacing: '0.1em' }}>VALIDATOR REMARK:</span>
                  <span>{status}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
