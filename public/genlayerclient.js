class GenLayerClient {
    constructor(rpcUrl = 'https://studio.genlayer.com/api') {
        this.rpcUrl = rpcUrl;
        this.userAddress = null;
    }

    /**
     * Checks if an EVM browser wallet is installed and requests account access
     */
    async connectWallet() {
        if (!window.ethereum) {
            throw new Error("No crypto wallet detected. Please install MetaMask or Rabby.");
        }

        try {
            // Request account access from the browser extension
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts found or connection rejected.");
            }

            this.userAddress = accounts[0];
            return this.userAddress;
        } catch (error) {
            console.error("Wallet connection handshake failed:", error);
            throw error;
        }
    }

    /**
     * Helper to route JSON-RPC requests via standard fetch
     */
    async _request(method, params = {}) {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: method,
                params: params
            })
        });

        if (!response.ok) {
            throw new Error(`RPC HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || 'Unknown RPC Error');
        }

        return data.result;
    }

    /**
     * Submits a transaction to be signed securely by the user's connected wallet
     */
    async verifyWebClaim(contractAddress, url, claim) {
        if (!this.userAddress) {
            throw new Error("Wallet not connected! Please connect your wallet first.");
        }

        // Send transaction payload directly to GenLayer's network node
        return await this._request('gen_sendTransaction', {
            from: this.userAddress, // Real user address signed by MetaMask/Rabby
            to: contractAddress,
            data: {
                method: 'verify_web_claim',
                args: [url, claim]
            }
        });
    }

    /**
     * Reads evaluation status directly from contract state map (Read-only)
     */
    async getVerificationStatus(contractAddress, url, claim) {
        // Fallback address safely used for simple view operations
        const callerAddress = this.userAddress || '0x0000000000000000000000000000000000000000';

        return await this._request('gen_callMethod', {
            from: callerAddress,
            to: contractAddress,
            method: 'get_verification_status',
            args: [url, claim]
        });
    }
}

// Export initialization variable
window.GenLayerClient = GenLayerClient;