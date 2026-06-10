class GenLayerClient {
    constructor(rpcUrl = 'https://studio.genlayer.com/api') {
        this.rpcUrl = rpcUrl;
    }

    /**
     * Helper to send standardized JSON-RPC POST requests
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
     * Executes a state-changing write transaction on the contract
     */
    async verifyWebClaim(contractAddress, url, claim) {
        return await this._request('gen_sendTransaction', {
            from: '0x0000000000000000000000000000000000000000', // Default developer simulator address
            to: contractAddress,
            data: {
                method: 'verify_web_claim',
                args: [url, claim]
            }
        });
    }

    /**
     * Reads a value from the contract without changing global state
     */
    async getVerificationStatus(contractAddress, url, claim) {
        return await this._request('gen_callMethod', {
            from: '0x0000000000000000000000000000000000000000',
            to: contractAddress,
            method: 'get_verification_status',
            args: [url, claim]
        });
    }
}

// Export for browser use
window.GenLayerClient = GenLayerClient;