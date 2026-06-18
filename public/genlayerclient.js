class GenLayerClient {
    constructor(rpcUrl = 'https://studio.genlayer.com/api') {
        this.rpcUrl = rpcUrl;
        this.userAddress = null;
    }

    /**
     * Connects browser extensions smoothly via window.ethereum
     */
    async connectWallet() {
        if (!window.ethereum) {
            throw new Error("No crypto wallet detected. Please install MetaMask or Rabby.");
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error("Connection rejected by user.");
            }

            this.userAddress = accounts[0];
            return this.userAddress;
        } catch (error) {
            console.error("Wallet connection error:", error);
            throw error;
        }
    }

    /**
     * Executes the transaction directly over GenLayer's RPC infrastructure,
     * passing the real authenticated userAddress as the transaction sender.
     */
    async verifyWebClaim(contractAddress, url, claim) {
        if (!this.userAddress) {
            throw new Error("Wallet not connected! Click 'Connect Wallet' first.");
        }

        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'gen_sendTransaction', // Routes beautifully directly to GenLayer's API
                params: {
                    from: this.userAddress, // Your real authenticated account address
                    to: contractAddress,
                    data: {
                        method: 'verify_web_claim',
                        args: [url, claim]
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP network error: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || 'GenLayer Execution Error');
        }

        return data.result; // Returns the valid transaction hash string
    }

    /**
     * Reads state from the storage TreeMap without running consensus node charges
     */
    async getVerificationStatus(contractAddress, url, claim) {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'gen_callMethod',
                params: {
                    from: this.userAddress || '0x0000000000000000000000000000000000000000',
                    to: contractAddress,
                    method: 'get_verification_status',
                    args: [url, claim]
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP View Error: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.result;
    }
}

window.GenLayerClient = GenLayerClient;